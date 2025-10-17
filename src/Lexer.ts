import { tokens } from './tokens';

const multiSymbolOperators = [...tokens.operators, '.'];

/**
 * A lexer for Lua code that tokenizes the input string into meaningful components.
 * @param lua The Lua code as a string to be tokenized.
 */
export class Lexer {
  nextToken = "";
  states = {
    openstring: false,
    openbracket: false,
    openbracketCount: 0,
  }
  tokens: string[] = [];
  charIndex = 0;

  get char() {
    return this.lua[this.charIndex];
  }
  peek(offset: number) {
    return this.lua[this.charIndex + offset];
  }

  constructor(public lua: string, public debug = false) {
    if(this.debug) console.log(lua.length);
    while (this.charIndex < lua.length) {
      this.pushNextToken();
    }
  }

  /**
   * Identifies and pushes the next token from the input Lua string to the tokens array.
   */
  pushNextToken() {
    
    // Skip initial whitespace
    while(/\s/.test(this.lua[this.charIndex])) this.charIndex++;

    if(this.checkForAndSkipComment()) return; // return if a comment was found and skipped to recheck white space after it
    if(this.charIndex >= this.lua.length) return;
    if(this.checkForAndPushString()) return;

    const char = this.char;
    if(this.debug) console.log(`Current char: ${char} at index ${this.charIndex}`);
    
    // check for and combine consecutive operators
    if(multiSymbolOperators.includes(char)) {
      let tokenOfOperators = char;
      while(multiSymbolOperators.includes(this.peek(1))) {
        tokenOfOperators += this.peek(1);
        this.charIndex++;
      }
      this.pushToken(tokenOfOperators);
      this.charIndex++;
      return;
    }

    // Check for delimiters
    if(tokens.delimiters.includes(char)) {
      this.pushToken(char);
      this.charIndex++;
      return;
    }

    // Check for keywords or identifiers
    let identifier = "";
    while(/[a-zA-Z_\d]/.test(this.peek(0)) && this.charIndex < this.lua.length) {
      if(this.debug) console.log(`Building identifier: ${identifier}${this.peek(0)}`);
      identifier += this.peek(0);
      this.charIndex++;
    }
    if(identifier) {
      this.pushToken(identifier);
      return;
    }

    // Warn about funky characters
    console.warn(`\x1b[33mUnrecognized character: ${char} (${char.charCodeAt(0)}) at index ${this.charIndex}\x1b[0m`);

  }

  /**
   * Checks if the current character indicates the start of a string and processes it if so.  
   * Supports single quotes, double quotes, and double square brackets for multiline strings.
   * @returns true if a string was found and processed, false otherwise.
   */
  checkForAndPushString(): boolean {
    const char = this.char;
    if(char == "\"" || char == "'" || (char == "[" && this.peek(1) == "[")) {
      const stringType = char == "[" ? "[[" : char;
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
    let endingChars = stringType == "[[" ? "]]" : stringType;
    let string = new String();
    let i = this.charIndex;
    while (i < this.lua.length) {
      let stringChar = this.lua[i];
      if(this.debug) console.log(`Parsing string, current char: ${stringChar}, looking for ending: ${endingChars}`);
      
      // handle escape characters
      if(stringChar == '\\') string += this.lua[++i], i++, stringChar = this.lua[i];
      
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
    this.charIndex = i;
    return stringType + string + endingChars;
  }

  /**
   * Checks for comments starting at the current character index and skips them if found.  
   * Supports both single-line comments (--) and multi-line comments (--[[ ... ]]).
   * @returns true if a comment was found and skipped, false otherwise.
   */
  checkForAndSkipComment(): boolean {
    if(this.peek(0) == "-" && this.peek(1) == "-" ) {
      if(this.peek(2) == "[" && this.peek(3) == "[") { // Multiline comment
        this.charIndex += 4;
        while(this.charIndex < this.lua.length) {
          if(this.peek(0) == "-" && this.peek(1) == "-" && this.peek(2) == "]" && this.peek(3) == "]") {
            this.charIndex += 4;
            return true;
          }
          this.charIndex++;
        }
      } else { // Single line comment
        this.charIndex += 2;
        while(this.charIndex < this.lua.length && this.lua[this.charIndex] != '\n') this.charIndex++;
        this.charIndex++; // Skip the newline
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
    if(this.debug) console.log(`Pushing token: ${token} | index: ${this.charIndex}`);
    this.tokens.push(token);
    this.nextToken = this.lua[this.charIndex + 1]  || "";
  }
}
