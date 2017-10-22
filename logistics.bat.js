const EventEmitter = require('events').EventEmitter;
const _ = require('underscore');

// procedures({
//     // goToFloor: {
//     //   isPossible(floor) {
//     //     return true;
//     //     // TODO: shared elevator exists
//     //   },
//     //   effect(floor) {
//     //     // on floor floor
//     //     return {currentFloor: floor};
//     //   }
//     // }
//   });

// ---- Domain

/** defining roads */
const roads = {
  l1: {l2: 1, l3: 2},
  l2: {l3: 2, l4: 2}
};

/** complete the distance table */
function completeRoads() {
  _.each(roads, (dests, src) => {
      _.each(dests, (distance, dest) => {
          if (!roads[dest]) {
            roads[dest] = {};
          }
          if (!roads[dest][src]) {
            roads[dest][src] = distance;
          }
        });
    });
};

/** there is a road from a to b */
function road(a, b) {
  return (
    (roads[a] && roads[a][b])
    || (roads[b] && roads[b][a])
  );
}

// const locations = ["l1", "l2", "l3", "l4"];
//
// const initialState = {
//   location: "l1"
// }

// --------------------------------------------------------------------------
// ---- Actions

const history = [];

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
    console.log("EXECUTING", this.constructor.name, this._args);
    history.push({name: this.constructor.name, args: this._args});
    setTimeout(() => {
        this.emit('result', { success: true });
      }, 1000);
  }
}

/** args.location = where to go */
class GoTo extends Action {

  /** possible when there is a road from the current location to the
    destination */
  isPossible(state) {
    console.log(this.constructor.name, "(isPossible)", state, this._args);
    return (state.location != this._args.location &&
      road(state.location, this._args.location));
  }

  effect(state) {
    return _.defaults({ location: this._args.location }, state);
  }
}

/** args.text = text to display */
class AskYesNo extends Action {
}

/** args.text = text to display */
class Say extends Action {
}

/** sleep for args.time ms */
class Sleep extends Action {
  execute() {
    console.log("sleeping", this._args);
    setTimeout(() => {
        this.emit('result', { success: true, result: true });
      }, this._args.time);
  }
}

class A extends Action {
}

module.exports = {
  GoTo,
  AskYesNo,
  Say,
  Sleep,
  A,
  history
};
