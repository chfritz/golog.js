var assert = require('chai').assert;

const actions = require('../bat.js');
const Golog = require('../golog.js');

describe('Semantics', function() {

    beforeEach(() => {
        actions.Action.history = [];
      });

    describe('assert', function(done) {
        it('true', function() {
            const program = () => {
              state.location != 'l2';
            };

            Golog.parseAndRun(program.toString(), { location: 'l1' }, () => {
                // #HERE: what should happen when it is not true?
                //
                assert.deepEqual([], actions.Action.history);
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


    describe('concurrency', function() {
        it('threads interleave', function(done) {

            const program = () => {
              conc([
                  () => { Action({id: 1.1}); Action({id: 1.2}); },
                  () => { Action({id: 2.1}); Action({id: 2.2}); }
                ]);
              Action({id: 3});
            }

            Golog.parseAndRun(program.toString(), { location: 'l1' }, () => {
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

            Golog.parseAndRun(program.toString(), { location: 'l1' }, () => {
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

            Golog.parseAndRun(program.toString(), { location: 'l1' }, () => {
                assert.deepEqual([
                    {name: "Action", args: {id: 1}},
                    {name: "Action", args: {id: 3}}
                  ],
                  actions.Action.history);
                done();
              });
          });

      });


  });
