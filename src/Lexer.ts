import { Tokens } from './tokens';

const multiSymbolOperators = [...Tokens.operators, '.'];

export enum TokenData {
  token,
  startIndex,
  endIndex,
}

export type Token = [string, number, number];

/**
 * A lexer for Lua code that tokenizes the input string into meaningful components.
 * @param lua The Lua code as a string to be tokenized.
 */
export class Lexer {
  states = {
    openstring: false,
    openbracket: false,
    openbracketCount: 0,
  }
  tokens: Token[] = [];
  charIndex = -1

  get currentChar(): string {
    return this.lua[this.charIndex];
  }

  peek(offset: number = 1): string | undefined {
    return this.lua[this.charIndex + offset];
  }

  constructor(public lua: string, public debug = false) {
    while (this.charIndex < lua.length) {
      this.pushNextToken();
    }
  }

  /**
   * Identifies and pushes the next token from the input Lua string to the tokens array.
   */
  pushNextToken() {
    
    let char = this.nextChar();

    // Skip initial whitespace
    if (/\s/.test(char)) return;

    if(this.checkForAndSkipComment()) return;
    if(this.charIndex >= this.lua.length) return;
    if(this.checkForAndPushString()) return;

    // Check for numbers
    if (/\d/.test(char) || (char === '.' && /\d/.test(this.peek() ?? ''))) return this.parseNumber(char);
    

    // Check for and combine consecutive operators
    if(multiSymbolOperators.includes(char)) {
      let tokenOfOperators = char;
      while(multiSymbolOperators.includes(this.peek() ?? "")) tokenOfOperators += this.nextChar();
      this.pushToken(tokenOfOperators);
      return;
    }

    // Check for delimiters
    if(Tokens.delimiters.includes(char)) {
      this.pushToken(char);
      return;
    }

    // Check for keywords or identifiers
    let identifier = "";
    while(/[a-zA-Z_\d]/.test(char) && this.charIndex < this.lua.length) {
      identifier += char;
      char = this.nextChar();
    }
    if(identifier) return this.charIndex--, void this.pushToken(identifier);

    // Warn about funky characters
    console.warn(`\x1b[33mUnrecognized character: ${char} (${char.charCodeAt(0)}) at index ${this.charIndex}\x1b[0m`);

  }

  /**
   * Checks if the current character indicates the start of a string and processes it if so.  
   * Supports single quotes, double quotes, and double square brackets for multiline strings.
   * @returns true if a string was found and processed, false otherwise.
   */
  checkForAndPushString(): boolean {
    const char = this.currentChar;
    if(char === "\"" || char === "'" || (char === "[" && this.peek() === "[")) {
      const stringType = char === "[" ? "[[" : char;
      this.charIndex += stringType.length;
      this.pushToken(this.parseString(stringType as '"' | "'" | "[["));
      return true;
    }
    return false;
  }

  /**
   * Parses a string from the current position in the input Lua code.  
   * Handles escape characters and different string delimiters.
   * @param stringType The type of string delimiter used ('"', "'", or '[[').
   * @returns The complete parsed string including delimiters.
   */
  parseString(stringType: '"' | "'" | "[[") {
    let endingChars = stringType === "[[" ? "]]" : stringType;
    let string = new String();
    let i = this.charIndex;
    while (i < this.lua.length) {
      let stringChar = this.lua[i];
      
      // handle escape characters
      if(stringChar === '\\') string += this.lua[++i], i++, stringChar = this.lua[i];
      
      let matchedEnding = true;
      for(let j = 0; j < endingChars.length; j++) {
        if(this.lua[i + j] != endingChars[j]) {
          matchedEnding = false;
          break;
        }
      }
      
      if(matchedEnding) {
        i += endingChars.length;
        break;
      }

      string += this.lua[i];
      i++;
    }
    this.charIndex = i-1;
    return stringType + string + endingChars;
  }

  /**
   * Handles and consumes a number literal from the current position in the input Lua code.  
   * Supports integers, decimals, and scientific notation.
   * @param initialChar The first character of the number literal.
   * @returns The complete parsed number literal.
   */
  private parseNumber(initialChar: string) {
    let numberLiteral = initialChar;
    let hasDecimalPoint = initialChar === '.';
    let isHex = initialChar === '0' && (this.peek() === 'x' || this.peek() === 'X');
    let hasExponent = false;

    const isDigit = (value: string | undefined) => value !== undefined && /\d/.test(value);
    const isHexDigit = (value: string | undefined) => isDigit(value) || ['a','b','c','d','e','f','A','B','C','D','E','F'].includes(value ?? '');

    if(isHex) numberLiteral += this.nextChar(); // consume 'x' or 'X'

    while (true) {
      const nextChar = this.peek();
      if (!nextChar) break;

      if (nextChar === '.' && !hasDecimalPoint && this.peek(2) !== '.') {
        hasDecimalPoint = true;
        numberLiteral += this.nextChar();
        continue;
      }

      if ((nextChar === 'e' || nextChar === 'E') && !hasExponent && !isHex) {
        const afterExponent = this.peek(2);
        const digitAfterSign = this.peek(3);
        if (isDigit(afterExponent) || ((afterExponent === '+' || afterExponent === '-') && isDigit(digitAfterSign))) {
          hasExponent = true;
          numberLiteral += this.nextChar();
          if (this.peek() === '+' || this.peek() === '-') numberLiteral += this.nextChar();
          while (isDigit(this.peek())) numberLiteral += this.nextChar();
          continue;
        }
      }

      if (isHex && isHexDigit(nextChar)) {
        numberLiteral += this.nextChar();
        continue;
      }

      if (isDigit(nextChar)) {
        numberLiteral += this.nextChar();
        continue;
      }

      if (isHex && (nextChar === 'p' || nextChar === 'P') && !hasExponent) {
        const afterExponent = this.peek(2);
        const digitAfterSign = this.peek(3);
        if (isDigit(afterExponent) || ((afterExponent === '+' || afterExponent === '-') && isDigit(digitAfterSign))) {
          hasExponent = true;
          numberLiteral += this.nextChar();
          if (this.peek() === '+' || this.peek() === '-') numberLiteral += this.nextChar();
          while (isDigit(this.peek())) numberLiteral += this.nextChar();
          continue;
        }
      }

      break;
    }

    this.pushToken(numberLiteral);
  }

  /**
   * Checks for comments starting at the current character index and skips them if found.  
   * Supports both single-line comments (--) and multi-line comments (--[[ ... ]]).
   * @returns true if a comment was found and skipped, false otherwise.
   */
  checkForAndSkipComment(): boolean {
    if(this.peek(0) === "-" && this.peek() === "-") {
      this.charIndex += 2;
      if(this.peek(0) === "[" && this.peek() === "[") { // Multiline comment
        this.charIndex += 2;
        while(this.charIndex < this.lua.length) {
          if(this.peek(0) === "]" && this.peek(1) === "]") {
            this.charIndex += 2;
            return true;
          }
          this.charIndex++;
        }
        return true;
      } else { // Single line comment
        while(this.charIndex < this.lua.length && this.lua[this.charIndex] !== '\n') this.charIndex++;
        return true;
      }
    }
    return false;
  }

  /**
   * Pushes a token to the tokens array and updates the nextToken property.  
   * Also logs the action if debug mode is enabled.
   * @param token The token string to push.
   */
  pushToken(token: string) {
    const endIndex = this.charIndex + 1;
    const startIndex = endIndex - token.length;
    const tokenData = [token, startIndex, endIndex] as Token;
    this.tokens.push(tokenData);
    if(token !== this.lua.slice(startIndex, endIndex)) 
      throw new Error(`Missmatched Token: "${token}" vs "${this.lua.slice(startIndex, endIndex)}", at index ${startIndex}-${endIndex}`);
  }

  nextChar() {
    this.charIndex++;
    // console.log(this.lua[this.charIndex], this.charIndex);
    return this.lua[this.charIndex];
  }
}
