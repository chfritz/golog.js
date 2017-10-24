var assert = require('chai').assert;

const actions = require('../bat.js');
const Golog = require('../golog.js');

describe('Semantics', function() {

    // --- assert
    describe('assert', function() {
        it('true', function() {
            const program = () => {
              state.location != 'l2';
            };

            Golog.parseAndRun(program.toString(), { location: 'l1' }, () => {
                // #HERE: what should happen when it is not true?
                //
                assert.equal([], actions.Action.history);
              });

          });
      });


    // --- if-then-else
    describe('if-then-else', function() {
        const program = () => {
          if (state.location == "l1") {
            GoTo({location: "l2"});
          } else {
            GoTo({location: "l3"});
          }
        };

        it('then path', function() {
            Golog.parseAndRun(program.toString(), { location: 'l1' }, () => {
                assert.equal([
                    {name: "GoTo", args: {location: 'l2'}}
                  ],
                  actions.Action.history);
              });
          });

        it('else path', function() {
            Golog.parseAndRun(program.toString(), { location: 'l2' }, () => {
                assert.equal([
                    {name: "GoTo", args: {location: 'l3'}}
                  ],
                  actions.Action.history);
              });
          });
      });


    describe('either', function() {
        it('should terminate other threads when first finishes', function() {

            const program = () => {
              either([
                  () => { Action({id: 1}); Action({id: 2}); },
                  () => { Sleep({time: 10}); }
                ]);
              Action({id: 3});
            }

            Golog.parseAndRun(program.toString(), { location: 'l1' }, () => {
                assert.equal([
                    {name: "Action", args: {id: 1}},
                    {name: "Action", args: {id: 3}}
                  ],
                  actions.Action.history);
              });
          });
      });
  });
