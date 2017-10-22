"use strict"

const actions = require('./logistics.bat.js');
const program = require('./logistics.golog.js');
const Golog = require('./golog.js');

console.log( Golog.parseAndRun(program.toString(), { location: 'l1' }) );
