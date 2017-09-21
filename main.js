"use strict"

const acorn = require('acorn');
const actions = require('./logistics.bat.js');
const program = require('./logistics.golog.js');

const Golog = require('./golog.js');

const code = program.toString();
console.log(code);

const result = acorn.parse(code);
console.log( Golog.run(result, { location: 'l1' }) );
