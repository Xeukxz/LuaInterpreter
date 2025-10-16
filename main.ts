import { inspect } from 'util';
import { Lexer } from './src/Lexer';
import { Parser } from './src/Parser';
import fs from 'fs';

const lexer = new Lexer(fs.readFileSync("lua.lua", "utf-8"));

// console.log(lexer.tokens.join(" "))

const parser = new Parser(lexer.tokens, {
  debug: false,
});

console.log(inspect(parser.ast, { depth: null, colors: true }));