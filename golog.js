
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
  if (!isFinal(program, state)) {
    const result = trans[program.type](program, state);
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
  Program(program, state) {
    return (program.body.length == 0
      || _.every(program.body, (p) => {
          isFinal(p, state)
          })
      );
  }
}

// ------------------------------------------------------------------------

/** Transition functions for each programming construct.
  @return a list of possible future programs-state tuples.
*/
const trans = {
  /** program is a Program */
  Program(program, state) {
    // console.log("PROGRAM", program);
    const first = program.body.shift();
    const result = trans[first.type](first, state);
    // if (result.program) {
    //   program.body.unshift(result[0].program); // online mode
    // }
    // return [{
    //   program,
    //   state: result[0].state // online mode
    // }];
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
    return trans[program.expression.type](program, state);
  },

  CallExpression(program, state) {
    // console.log("CALL", program);
    // reconstruct the action call
    // const actionFn = eval('actions.' + program.expression.callee.name);
    // const args = _.map(program.expression.arguments,
    //   (arg) => { return arg.value; });
    // const action = new actionFn(...args);

    const action = eval("new actions." + escodegen.generate(program));

    if (action.isPossible(state)) {
      action.execute();
      return [{ program: null, state: action.effect(state) }];
    } else {
      return []; // i.e., no transition possible
    }
  }
}

// ------------------------------------------------------------------------

module.exports = {
  run,
  isFinal
};
