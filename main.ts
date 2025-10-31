import { inspect } from 'util';
import { Lexer } from './src/Lexer';
import { Parser } from './src/Parser';
import fs from 'fs';
import { Interpreter } from './src/Interpreter';

const testFiles = [
  'tests/variablesAndAssignments.lua', // 0
  'tests/tables.lua', // 1
  'tests/if.lua', // 2
  'tests/loops.lua', // 3
  'tests/metatables.lua', // 4
  'tests/misc.lua', // 5
]

const code = fs.readFileSync(testFiles[5], "utf-8");

const lexer = new Lexer(code);

// console.log(lexer.tokens.map(token => token[0]).join(" "))

const parser = new Parser(lexer.tokens, {
  debug: false,
});

// console.log(inspect(parser.ast, { depth: null, colors: true }));

const interpreter = new Interpreter(parser.ast);