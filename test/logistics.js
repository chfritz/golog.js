var assert = require('chai').assert;

const actions = require('../logistics.bat.js');
const Golog = require('../golog.js');

describe('Semantics', function() {
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
