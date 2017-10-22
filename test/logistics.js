var assert = require('chai').assert;

const actions = require('../logistics.bat.js');
const Golog = require('../golog.js');

describe('Semantics', function() {
    describe('either', function() {
        it('should terminate other threads when first finishes', function() {

            const program = () => {
              either([
                  () => { A({id: 1}); A({id: 2}); },
                  () => { Sleep({time: 10}); }
                ]);
              A({id: 3});
            }

            Golog.parseAndRun(program.toString(), { location: 'l1' }, () => {
                assert.equal([
                    {name: "A", args: {id: 1}},
                    {name: "A", args: {id: 3}}
                  ],
                  actions.history);
              });
          });
      });
  });
