"use strict"

const fs = require('fs');
// const util = require('util');
const acorn = require('acorn');
const actions = require('./logistics.bat.js');

const Golog = require('./golog.js');

// const parser = require('./parser');

const code = fs.readFileSync(process.argv[2], 'utf-8');
// const result = parser.parse(code);
const result = acorn.parse(code);

// console.log("--------");
// console.log(util.inspect(result, {depth: null}));

// console.log("--------");
console.log( Golog.run(result, { location: 'l1' }) );
