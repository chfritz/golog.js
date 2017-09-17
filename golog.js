
const _ = require('underscore');
const escodegen = require('escodegen');

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
    const result = trans_one(program, state);
    // console.log(result);
    if (result.length == 0) {
      return {success: false, state};
    } else {
      // online: always take first-best execution path
      return run(result[0].program, result[0].state);
    }
  } else {
    return {success: true, state};
  }
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
    const condition = eval(escodegen.generate(program.test));
    if (condition) {
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
    return eval(escodegen.generate(program));
  }
}

// synonyms
final.Program = final.BlockStatement;

// ------------------------------------------------------------------------

/** perform one trans step */
const trans_one = (program, state) => {
  if (!trans[program.type]) {
    throw new Error("TRANS: no case defined for " + program.type);
  }
  console.log("TRANS_ONE", program);
  return trans[program.type](program, state);
}

/** Transition functions for each programming construct.
  @return a list of possible future programs-state tuples.
*/
const trans = {

  /** program is a block statement, e.g., the consequent of an If */
  BlockStatement(program, state) {
    const first = program.body.shift();

    if (isFinal(first, state)) {
      return trans_one(program, state);
    }

    // console.log("BlockStatement next:", first);
    const result = trans_one(first, state);

    return _.map(result, (tuple) => {
        const programClone = program;
        if (tuple.program != null) {
          programClone.body.unshift(tuple.program);
        }
        return {
          program: programClone,
          state: tuple.state
        };
      });
  },

  ExpressionStatement(program, state) {
    console.log("EXPRESSION", program.expression);
    return trans[program.expression.type](program, state);
  },

  /** an invocation */
  CallExpression(program, state) {
    // console.log("CALL", program);
    // reconstruct the action and instantiate
    const action = eval("new actions." + escodegen.generate(program));

    if (action.isPossible(state)) {
      action.execute();
      return [{ program: null, state: action.effect(state) }];
    } else {
      return []; // i.e., no transition possible
    }
  },

  /** if-then-else */
  IfStatement(program, state) {
    const condition = eval(escodegen.generate(program.test));
    if (condition) {
      return trans_one(program.consequent, state);
    } else {
      if (program.alternate) {
        return trans_one(program.alternate, state);
      } else {
        // no else specified
        return [{ program: null, state }];
      }
    }
  },

  /** a test */
  BinaryExpression(program, state) {
    const condition = eval(escodegen.generate(program));
    if (condition) {
      return [{ program: null, state }];
    } else {
      return [];
    }
  }
}

// "synonyms"
trans.Program = trans.BlockStatement;

// ------------------------------------------------------------------------

module.exports = {
  run,
  isFinal
};
