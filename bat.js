const EventEmitter = require('events').EventEmitter;
const _ = require('underscore');

class Action extends EventEmitter {
  constructor(args) {
    super();
    this._args = args;
  }

  isPossible() {
    return true;
  }

  effect(state) {
    return _.defaults({}, state);
  }

  execute() {
    // console.log("EXECUTING", this.constructor.name, this._args);
    // console.log("start", this);
    Action.history.push({name: this.constructor.name, args: this._args});
    setTimeout(() => {
        this.emit('result', { success: true });
        // console.log("done", this);
      }, 100);
  }
}

Action.history = [];

/** sleep for args.time ms */
class Sleep extends Action {
  execute() {
    // console.log("sleeping", this._args);
    setTimeout(() => {
        this.emit('result', { success: true, result: true });
      }, this._args.time);
  }
}

module.exports = {
  Action,
  Sleep
};
