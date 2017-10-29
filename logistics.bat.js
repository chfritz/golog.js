const _ = require('underscore');

const bat = require('./bat.js');

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

/** there is a road from a to b */
function road(a, b) {
  return (
    (roads[a] && roads[a][b])
    || (roads[b] && roads[b][a])
  );
}

// const locations = ["l1", "l2", "l3", "l4"];

// --------------------------------------------------------------------------
// ---- Actions

/** args.location = where to go */
class GoTo extends bat.Action {

  /** possible when there is a road from the current location to the
    destination */
  isPossible(state) {
    // console.log(this.constructor.name, "(isPossible)", state, this._args);
    return (state.location != this._args.location &&
      road(state.location, this._args.location));
  }

  effect(state) {
    return _.defaults({ location: this._args.location }, state);
  }
}


module.exports = _.extend({GoTo}, bat);
