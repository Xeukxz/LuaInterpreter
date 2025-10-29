import { inspect } from 'util';
import { Lexer } from './src/Lexer';
import { Parser } from './src/Parser';
import fs from 'fs';
import { Interpreter } from './src/Interpreter';

const testFiles = [
  'tests/variablesAndAssignments.lua', // 0
  'tests/tables.lua', // 1
  'tests/loops.lua', // 2
  'tests/metatables.lua', // 3
  'tests/misc.lua', // 4
]

const lexer = new Lexer(fs.readFileSync(testFiles[3], "utf-8"));

// console.log(lexer.tokens.join(" "))

const parser = new Parser(lexer.tokens, {
  debug: false,
});

// console.log(inspect(parser.ast, { depth: null, colors: true }));

const interpreter = new Interpreter(parser.ast);