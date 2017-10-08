// plan(() => {
//     while(location != "l3") {
//       pi(l, locations);
//       GoTo(l);
//     }
//   });

// if (state.location == "l1") {
//   GoTo({location: "l2"});
// } else {
//   GoTo({location: "l3"});
// }

// state.location != 'l2';

module.exports = () => {

  // if-then-else
  // if (state.location == "l1") {
  //   GoTo({location: "l2"});
  // } else {
  //   GoTo({location: "l3"});
  // }
  // state.location != 'l2';

  // ---- planning, non-determinism
  // plan(() => {
  //     or([
  //         () => GoTo({location: "l3"}),
  //         () => GoTo({location: "l2"}),
  //         () => GoTo({location: state.location})
  //         ]);
  //     state.location != 'l3';
  //   });

  // ---- action results
  // var happy = AskYesNo({ text: "Happy today?"});
  // if (happy) {
  //   Say({text: "yes"});
  // } else {
  //   Say({text: "no"});
  // }

  // ---- concurrency
  conc([
      () => GoTo({location: "l3"}),
      () => AskYesNo({ text: "Happy today?"})
    ])
}

// -------------------------------------------------------------------------
// Sketching programs

// Charge Program
// function charge() {
//   GoToDock();
//   WaitFor({ battery > 0.10 });
// }
