const _ = require('underscore');
const escodegen = require('escodegen');
const acorn = require('acorn');
const walk = require("acorn/dist/walk");
const actions = require('./logistics.bat.js'); // TODO: make this unnecessary

// ------------------------------------------------------------------------

/**
 * Transition the given program one step, and return the resulting program and
 * state.
 * @param {a parsed golog program} program to execute
 * @param {[type]} state   the state to execute the program in
 * @param {Function} callback
 * @return {{success: Boolean, state: State}} whether successful
 * and resulting state
*/
function run(program, state, callback) {
  // console.log("RUN", program);
  if (!isFinal(program, state)) {
    trans_one(program, state, (err, result) => {
        if (result.length == 0) {
          callback({
              msg: 'unable to complete program execution',
              remaining: program
            }, state);
        } else {
          return run(result.program, result.state, callback);
        }
      });
  } else {
    callback(null, {program, state});
  }
}

/** Create a plan for the given program, i.e., find a sequence of
  actions that will allow us to complete the program */
function plan(program, state, prefix = []) {
  if (!isFinal(program, state)) {
    const result = trans_one(program, state);
    if (result.length == 0) {
      return [];
    } else {
      // try all (depth first for now); return when first plan found
      for (let i = 0; i < result.length; i++) {
        const r = result[i];
        const sub = plan(r.program, r.state, prefix.concat(r.plan));
        if (sub.length > 0) {
          return sub;
        }
      }
    }
  } else {
    // this is a successful branch
    return [{program, state, plan: prefix}];
  }
}

/** replaces any state variables occuring in the term with the current value first.
  - Online the state represents the assignments to variables in the current scope.
  - Offline the state comes from the initial state and the effects of all executed
  actions so far.
*/
function evalExpression(expression, state) {
  walk.simple(expression, {
      Identifier(node) {
        if (state.vars && !_.isUndefined(state.vars[node.name])) {
          // create a new AST node for the new value so we can generate code for it
          const newParsed =
            acorn.parse("\"" + state.vars[node.name] + "\"").body[0].expression;
          _.extend(node, newParsed);
        }
      }
    });
}

/** evaluate the expression in the given state; uses evalExpression. */
function evaluate(expression, state) {
  evalExpression(expression, state);
  return eval(escodegen.generate(expression));
}


// ------------------------------------------------------------------------

/**
  * True if the program is final (completed) in the given state
  * @param  {a parsed golog program}  program
  * @param  {[type]}  state   [description]
  * @return {Boolean}
*/
function isFinal(program, state) {
  // console.log("isFinal", program, state);
  return (final[program.type] && final[program.type](program, state));
}

const final = {
  BlockStatement(program, state) {
    // console.log("final BlockStatement", program, state);
    return (program.body.length == 0
      || _.every(program.body, (p) => {
          return isFinal(p, state)
          })
      );
  },

  IfStatement(program, state) {
    if (evaluate(program.test, state)) {
      return isFinal(program.consequent, state);
    } else {
      if (program.alternate) {
        return isFinal(program.alternate, state);
      } else {
        // no else specified
        return true;
      }
    }
  },

  BinaryExpression(program, state) {
    return evaluate(program, state);
  }
}

// synonyms
final.Program = final.BlockStatement;

// ------------------------------------------------------------------------

/** perform one trans step.
  If callback is given then this is done online, meaning actions will be
  executed and the resulting program and state are returned in the callback.
  Otherwise we are offline (planning) and will return all possible plans.
*/
const trans_one = (program, state, callback = undefined) => {
  if (!trans[program.type]) {
    console.log(program);
    throw new Error("TRANS: no case defined for " + program.type);
  }
  // console.log("TRANS_ONE", program);
  return trans[program.type](program, state, callback);
}

/** Transition functions for each programming construct.
  @param callback function to call online when transition is completed
  (mostly relevant for execution of durative actions)
  @return a list of possible future programs-state tuples.
*/
const trans = {

  /** program is a block statement, e.g., the consequent of an If */
  BlockStatement(program, state, callback) {
    const first = program.body.shift();

    if (isFinal(first, state)) {
      return trans_one(program, state, callback);
    }

    const callback2 = (callback ? (err, result) => {
        const programClone = _.clone(program);
        if (result.program != null) {
          programClone.body.unshift(result.program);
        }
        callback(err, {
          program: programClone,
          state: result.state
        });
      } : null);

    // console.log("BlockStatement next:", first);
    const result = trans_one(first, state, callback2);

    return _.map(result, (tuple) => {
        const programClone = _.clone(program);
        if (tuple.program != null) {
          programClone.body.unshift(tuple.program);
        }
        return {
          program: programClone,
          state: tuple.state,
          plan: tuple.plan
        };
      });
  },

  ArrowFunctionExpression(program, state, callback) {
    return trans_one(program.body, state, callback);
  },

  ExpressionStatement(program, state, callback) {
    // console.log("EXPRESSION", program.expression);
    return trans_one(program.expression, state, callback);
  },

  // ------------------------------------------------------------------------

  /** an invocation */
  CallExpression(program, state, callback) {
    console.log("CALL", program);

    if (program.callee && trans[program.callee.name]) {
      // a known construct (not an action)
      return trans[program.callee.name](program, state, callback);
    }

    // TODO: verify that it is an action (and not some malicious code)

    // reconstruct the action and instantiate
    // console.log("construct action", program.callee.name);

    // It's an action
    evalExpression(program, state);
    console.log("ACTION", program);

    const action = eval("new actions." + escodegen.generate(program));
    console.log("ACTION", action);

    if (action.isPossible(state)) {
      if (callback) {
        // we are online, execute the action
        action.on('result', (result) => {
            if (result.success) {
              // TODO update state
              callback(null, { program: null, state, result: result.result });
            } else {
              callback({
                  msg: 'action execution failed',
                  action,
                  program,
                  state,
                  error: result.error
                }, null);
            }
          });
        action.on('status', console.log);
        action.on('feedback', console.log);
        action.execute();
      }
      return [{ program: null, state: action.effect(state), plan: [action] }];
    } else {
      return []; // i.e., no transition possible
    }
  },

  or(program, state, callback) {
    console.log("OR", program.arguments);
    if (callback) {
      return trans_one(program.arguments[0].elements[0], state, callback);
    } else {
      // offline: consider all possibilities
      return _.reduce(program.arguments[0].elements, (memo, p) => {
          return memo.concat(trans_one(p, state, callback));
        }, []);
    }
  },

  /** search until you find a plan that works, then execute it. requires
    changes in the action: evaluate all arguments in the current state
    before adding to plan (return value) */
  plan(program, state, callback) {
    const result = plan(program.arguments[0], state, []);

    if (callback) {

      if (result[0].plan && result[0].plan.length > 0) {
        // execute the plan
        _.each(result[0].plan, (a) => {
            a.execute();
            // TODO: make this a macro expansion, i.e., use regular trans_one
            // in online mode to execute the returned plan
          });
        // TODO: update state
        return [{ program: null, state, plan: [] }];
      } else {
        throw new Error('no plan found', 'no plan found');
      }

    } else {
      // else: offline we just ignore the 'plan' construct, because we are
      // already in planning mode.
      return result;
    }
  },

  // ------------------------------------------------------------------------

  /** if-then-else */
  IfStatement(program, state, callback) {
    if (evaluate(program.test, state)) {
      return trans_one(program.consequent, state, callback);
    } else {
      if (program.alternate) {
        return trans_one(program.alternate, state, callback);
      } else {
        // no else specified
        return [{ program: null, state }];
      }
    }
  },

  /** a test */
  BinaryExpression(program, state, callback) {
    const condition = evaluate(program, state);
    if (condition) {
      return [{ program: null, state }];
    } else {
      return [];
    }
  },

  /** a variable declaration with init, e.g., `var answer = askYesNo();` */
  VariableDeclaration(program, state, callback) {
    const declaration = program.declarations[0];
    // console.log(declaration.id, declaration.init);
    const results = trans_one(declaration.init, state, (err, result) => {
        if (result) {
          // take the return value from the action and write it into the state
          result.state.var = result.state.var || {};
          result.state.var[declaration.id.name] = result.result;
          console.log("VAR", result);
        }
        return callback(err, result);
      });
    // offline case
    // TODO: branch for each element in result
    return _.map(results, (result) => {
        result.state.var = result.state.var || {};
        result.state.var[declaration.id.name] = result.result;
        console.log("VAR", result);
        return result;
      });
  }

}

// "synonyms"
trans.Program = trans.BlockStatement;

// ------------------------------------------------------------------------

module.exports = {
  run
};
