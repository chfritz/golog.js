var assert = require('chai').assert;

// const actions = require('../bat.js');
const actions = require('../logistics.bat.js');
const Golog = require('../golog.js');

describe('Semantics', function() {

    before(() => {
        Golog.initialize({ actions });
      });

    beforeEach(() => {
        actions.Action.history = [];
      });

    describe('assert', function() {
        const program = () => {
          state.location != 'l2';
        };

        it('true', function(done) {
            Golog.parseAndRun(program.toString(), { location: 'l1' }, (e,r) => {
                assert.isNull(e);
                done();
              });
          });

        it('false', function(done) {
            Golog.parseAndRun(program.toString(), { location: 'l2' }, (e,r) => {
                assert.isNotNull(e);
                done();
              });
          });
      });


    describe('if-then-else', function() {
        const program = () => {
          if (state.location == "l1") {
            GoTo({location: "l2"});
          } else {
            GoTo({location: "l3"});
          }
        };

        it('then path', function(done) {
            Golog.parseAndRun(program.toString(), { location: 'l1' }, () => {
                assert.deepEqual([
                    {name: "GoTo", args: {location: 'l2'}}
                  ],
                  actions.Action.history);
                done();
              });
          });

        it('else path', function(done) {
            Golog.parseAndRun(program.toString(), { location: 'l2' }, () => {
                assert.deepEqual([
                    {name: "GoTo", args: {location: 'l3'}}
                  ],
                  actions.Action.history);
                done();
              });
          });
      });



    // ---- action results
    describe('action results', function() {
        it('action results are available in the global scope', function(done) {

            const program = () => {
              var x = Identity({ value: 1 });
              if (x == 1) {
                Action({ id: 'right' });
              } else {
                Action({ id: 'wrong' });
              }

              if (x != 1) {
                Action({ id: 'wrong' });
              } else {
                Action({ id: 'right' });
              }
            };

            Golog.parseAndRun(program.toString(), {}, (error, result) => {
                assert.isNull(error);
                assert.deepEqual([
                    {name: "Action", args: {id: 'right'}},
                    {name: "Action", args: {id: 'right'}}
                  ],
                  actions.Action.history);
                done();
              });

          });
      });


    describe('concurrency', function() {
        it('threads interleave', function(done) {

            const program = () => {
              conc([
                  () => { Action({id: 1.1}); Action({id: 1.2}); },
                  () => { Action({id: 2.1}); Action({id: 2.2}); }
                ]);
              Action({id: 3});
            }

            Golog.parseAndRun(program.toString(), {}, () => {
                assert.deepEqual([
                    {name: "Action", args: {id: 1.1}},
                    {name: "Action", args: {id: 2.1}},
                    {name: "Action", args: {id: 1.2}},
                    {name: "Action", args: {id: 2.2}},
                    {name: "Action", args: {id: 3}}
                  ],
                  actions.Action.history);
                done();
              });
          });
      });


    describe('either', function() {
        it('should not continue other threads when first one finishes', function(done) {

            const program = () => {
              either([
                  () => { Action({id: 1}); Action({id: 2}); },
                  () => { Sleep({time: 10}); }
                ]);
              Action({id: 3});
            }

            Golog.parseAndRun(program.toString(), {}, () => {
                assert.deepEqual([
                    {name: "Action", args: {id: 1}},
                    {name: "Action", args: {id: 3}}
                  ],
                  actions.Action.history);
                done();
              });
          });

        it('state is preserved within each thread', function(done) {
            const program = () => {
              either([
                  () => {
                    var x = Identity({value: 1});
                    if (x != 1) {
                      Action({msg: `this shouldn't happen`});
                    }
                  },
                  () => { Action({id: 1}); Action({id: 2}); }
                ]);
              Action({id: 3});
            }

            Golog.parseAndRun(program.toString(), {}, () => {
                assert.deepEqual([
                    {name: "Action", args: {id: 1}},
                    {name: "Action", args: {id: 3}}
                  ],
                  actions.Action.history);
                done();
              });
          });

      });


    // ---- planning, non-determinism
    describe('planning', function() {
        it('should backtrack when necessary to finish program', function(done) {

            const program = () => {
              plan(() => {
                  or([
                      () => GoTo({location: "l3"}),
                      () => GoTo({location: "l2"}),
                      () => GoTo({location: state.location})
                    ]);
                  state.location != 'l3';
                });
            };

            Golog.parseAndRun(program.toString(), { location: 'l1' }, () => {
                assert.deepEqual([
                    {name: "GoTo", args: {location: "l2"}}
                  ],
                  actions.Action.history);
                done();
              });

          });

        it('plan over assertions', function(done) {

            const program = () => {
              plan(() => {
                  state.location != 'l2';
                  GoTo({location: "l2"});
                });
            };

            Golog.parseAndRun(program.toString(), { location: 'l1' }, (err) => {
                assert.isNull(err);
                assert.deepEqual([
                    {name: "GoTo", args: {location: "l2"}}
                  ],
                  actions.Action.history);
                done();
              });

          });

      });


    describe('complex programs', function() {
        it('combine programming and planning', function(done) {

            const program = () => {
              GoTo({location: "l3"});
              plan(() => {
                  or([
                      () => GoTo({location: "l1"}),
                      () => GoTo({location: "l2"}),
                      () => GoTo({location: state.location})
                    ]);
                  state.location != 'l1';
                  GoTo({location: "l1"});
                });
              GoTo({location: "l2"});
            };

            Golog.parseAndRun(program.toString(), { location: 'l1' }, (err) => {
                assert.isNull(err);
                assert.deepEqual([
                    {name: "GoTo", args: {location: "l3"}},
                    {name: "GoTo", args: {location: "l2"}},
                    {name: "GoTo", args: {location: "l1"}},
                    {name: "GoTo", args: {location: "l2"}}
                  ],
                  actions.Action.history);
                done();
              });

          });
      });


  });
