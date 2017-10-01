
const _ = require('underscore');
const escodegen = require('escodegen');
const acorn = require('acorn');
const walk = require("acorn/dist/walk");
const actions = require('./logistics.bat.js'); // TODO: make this unnecessary

// ------------------------------------------------------------------------

/**
 * Transition the given program one step, and return the resulting program and
 * state.
 * @param  {a parsed golog program} program to execute
 * @param  {[type]} state   the state to execute the program in
 * @return {{success: Boolean, state: State}} whether successful
 * and resulting state
*/
function run(program, state) {
  // console.log("RUN", program);
  if (!isFinal(program, state)) {
    const result = trans_one(program, state, true);
    // console.log(result);
    if (result.length == 0) {
      return {success: false, state};
    } else {
      // online: always take first-best execution path
      // if (result[0].plan && result[0].plan.length > 0) {
      //   _.each(result[0].plan, (a) => {
      //       a.execute();
      //     });
      // }
      return run(result[0].program, result[0].state);
    }
  } else {
    return {success: true, state};
  }
}

function plan(program, state, prefix = []) {
  if (!isFinal(program, state)) {
    const result = trans_one(program, state, false);
    if (result.length == 0) {
      return [];
    } else {
      // offline: try all (depth first for now); return when first plan found
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
        if (!_.isUndefined(state[node.name])) {
          // node.name = state[node.name];
          // hacky (because we don't change the node type) but works
          // #HERE: fails for string values (works so far only for boolean values)
          const newParsed =
            acorn.parse("\"" + state[node.name] + "\"").body[0].expression;
          // console.log("IDENTIFIER", node, newParsed);
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

/** perform one trans step */
const trans_one = (program, state, online) => {
  if (!trans[program.type]) {
    console.log(program);
    throw new Error("TRANS: no case defined for " + program.type);
  }
  // console.log("TRANS_ONE", program);
  return trans[program.type](program, state, online);
}

/** Transition functions for each programming construct.
  @return a list of possible future programs-state tuples.
*/
const trans = {

  /** program is a block statement, e.g., the consequent of an If */
  BlockStatement(program, state, online) {
    const first = program.body.shift();

    if (isFinal(first, state)) {
      return trans_one(program, state, online);
    }

    // console.log("BlockStatement next:", first);
    const result = trans_one(first, state, online);

    return _.map(result, (tuple) => {
        const programClone = program;
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

  ArrowFunctionExpression(program, state, online) {
    return trans_one(program.body, state, online);
  },

  ExpressionStatement(program, state, online) {
    // console.log("EXPRESSION", program.expression);
    return trans_one(program.expression, state, online);
  },

  // ------------------------------------------------------------------------

  /** an invocation */
  CallExpression(program, state, online) {
    console.log("CALL", program);

    if (program.callee && trans[program.callee.name]) {
      // a known construct (not an action)
      return trans[program.callee.name](program, state, online);
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
      if (online) {
        const result = action.execute();
        return [{ program: null, state, plan: [action], result }];
      } else {
        return [{ program: null, state: action.effect(state), plan: [action] }];
      }
    } else {
      return []; // i.e., no transition possible
    }
  },

  or(program, state, online) {
    console.log("OR", program.arguments);
    return _.reduce(program.arguments[0].elements, (memo, p) => {
          return memo.concat(trans_one(p, state, online));
        }, []);
  },

  /** search until you find a plan that works, then execute it. requires
    changes in the action: evaluate all arguments in the current state
    before adding to plan (return value) */
  plan(program, state, online) {
    const result = plan(program.arguments[0], state, []);
    if (result[0].plan && result[0].plan.length > 0) {
      _.each(result[0].plan, (a) => {
          a.execute();
        });
      // TODO: update state
      return [{ program: null, state, plan: [] }];
    }
  },

  // ------------------------------------------------------------------------

  /** if-then-else */
  IfStatement(program, state, online) {
    if (evaluate(program.test, state)) {
      return trans_one(program.consequent, state, online);
    } else {
      if (program.alternate) {
        return trans_one(program.alternate, state, online);
      } else {
        // no else specified
        return [{ program: null, state }];
      }
    }
  },

  /** a test */
  BinaryExpression(program, state, online) {
    const condition = evaluate(program, state);
    if (condition) {
      return [{ program: null, state }];
    } else {
      return [];
    }
  },

  VariableDeclaration(program, state, online) {
    const declaration = program.declarations[0];
    // console.log(declaration.id, declaration.init);
    const result = trans_one(declaration.init, state, online)[0];
    // take the return value from the action and write it into the state
    result.state[declaration.id.name] = result.result;
    console.log("VAR", result);
    return [result]
  }

}

// "synonyms"
trans.Program = trans.BlockStatement;

// ------------------------------------------------------------------------

module.exports = {
  run,
  isFinal
};
