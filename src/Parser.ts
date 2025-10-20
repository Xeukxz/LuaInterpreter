import { tokens } from './tokens';
import { inspect } from 'util';

export interface BaseASTNode {
  type: string;
  parent?: ASTNode;
}

export enum ASTNodeType {
  Literal = 'Literal',
  ConcatExpression = 'ConcatExpression',
  Identifier = 'Identifier',
  MultipleValue = 'MultipleValue',
  VariableDeclaration = 'VariableDeclaration',
  Assignment = 'Assignment',
  Table = 'Table',
  TableListItem = 'TableListItem',
  TableDictItem = 'TableDictItem',
  IndexProperty = 'IndexProperty',
  Function = 'Function',
  Parameter = 'Parameter',
  Break = 'Break',
  Return = 'Return',
  ExpressionCall = 'ExpressionCall',
  BinaryExpression = 'BinaryExpression',
  LogicalExpression = 'LogicalExpression',
  NotExpression = 'NotExpression',
  LengthExpression = 'LengthExpression',
  NumericFor = 'NumericFor',
  GenericFor = 'GenericFor',
  While = 'While',
  Repeat = 'Repeat',
  If = 'If',
}

// Types of nodes that can resolve to a value
// Implemented as a tuple to serve as a single source of truth for both the type and the array used in isValueResolvable
export type ValueResolvableTypesTuple = [
  ASTNodeType.Literal,
  ASTNodeType.ConcatExpression,
  ASTNodeType.MultipleValue,
  ASTNodeType.Function,
  ASTNodeType.Identifier,
  ASTNodeType.Table,
  ASTNodeType.LengthExpression,
  ASTNodeType.BinaryExpression,
  ASTNodeType.LogicalExpression,
  ASTNodeType.NotExpression,
  ASTNodeType.IndexProperty,
  ASTNodeType.ExpressionCall,
];

export type ASTNode =
  | LiteralNode
  | ConcatExpressionNode
  | IdentifierNode
  | MultipleValueNode
  | VariableDeclarationNode
  | AssignmentExpressionNode
  | TableNode
  | TableItemNode
  | IndexPropertyNode
  | LengthNode
  | FunctionNode
  | BreakNode
  | ReturnNode
  | ExpressionCallNode
  | BinaryExpressionNode
  | LogicalExpressionNode
  | NotExpressionNode
  | NumericForNode
  | GenericForNode
  | WhileNode
  | RepeatNode
  | IfNode;

export type ValueResolvable = Extract<ASTNode, { type: ValueResolvableTypesTuple[number] }>;

export interface VariableDeclarationNode extends BaseASTNode {
  type: ASTNodeType.VariableDeclaration;
  identifier: IdentifierNode | MultipleValueNode;
  value: ValueResolvable;
}

export interface LiteralNode<T = string | number | boolean | null> extends BaseASTNode {
  type: ASTNodeType.Literal;
  value: T;
  raw: string;
}

export interface ConcatExpressionNode extends BaseASTNode {
  type: ASTNodeType.ConcatExpression;
  left: ValueResolvable;
  right: ValueResolvable;
}

export interface IdentifierNode extends BaseASTNode {
  type: ASTNodeType.Identifier;
  name: string;
}

export interface MultipleValueNode extends BaseASTNode {
  type: ASTNodeType.MultipleValue;
  values: ValueResolvable[];
}

export type FunctionNode = AnonymousFunctionNode | NamedFunctionNode;

export interface FunctionParameterNode {
  type: ASTNodeType.Parameter;
  name: IdentifierNode;
  defaultValue: ValueResolvable;
}

export interface BaseFunctionNode extends BaseASTNode {
  type: ASTNodeType.Function;
  params: FunctionParameterNode[];
  body: ASTNode[];
  local: boolean;
}

export interface AnonymousFunctionNode extends BaseFunctionNode {
  anonymous: true;
}

export interface NamedFunctionNode extends BaseFunctionNode {
  anonymous?: false;
  name: IdentifierNode;
}

export interface ExpressionCallNode extends BaseASTNode {
  type: ASTNodeType.ExpressionCall;
  id: IdentifierResolvable;
  params: ValueResolvable[];
}

export interface TableNode extends BaseASTNode {
  type: ASTNodeType.Table;
  properties: TableItemNode[];
}

export type TableItemNode = TableListItemNode | TableDictItemNode;

export interface TableListItemNode extends BaseASTNode {
  type: ASTNodeType.TableListItem;
  value: ValueResolvable;
}

export interface TableDictItemNode extends BaseASTNode {
  type: ASTNodeType.TableDictItem;
  key: Exclude<ValueResolvable, LiteralNode<null>>;
  value: ValueResolvable;
}

export interface IndexPropertyNode extends BaseASTNode {
  type: ASTNodeType.IndexProperty;
  table: IdentifierResolvable;
  property: ValueResolvable;
}

export interface LengthNode extends BaseASTNode {
  type: ASTNodeType.LengthExpression;
  operand: ValueResolvable;
}

export interface BreakNode extends BaseASTNode {
  type: ASTNodeType.Break;
}

export interface ReturnNode extends BaseASTNode {
  type: ASTNodeType.Return;
  value: ValueResolvable | void;
}

export interface AssignmentExpressionNode extends BaseASTNode {
  type: ASTNodeType.Assignment;
  operator: '=' | '+=' | '-=' | '*=' | '/=' | '%=' | '^=';
  left: IdentifierResolvable | MultipleValueNode;
  right: ValueResolvable;
}

export interface BinaryExpressionNode extends BaseASTNode {
  type: ASTNodeType.BinaryExpression;
  operator: '+' | '-' | '*' | '/' | '%' | '^' | '<' | '<=' | '>' | '>=' | '==' | '~=';
  left: ValueResolvable;
  right: ValueResolvable;
}

export interface LogicalExpressionNode extends BaseASTNode {
  type: ASTNodeType.LogicalExpression;
  operator: 'and' | 'or';
  left: ValueResolvable;
  right: ValueResolvable;
}

export interface NotExpressionNode extends BaseASTNode {
  type: ASTNodeType.NotExpression;
  operand: ValueResolvable;
}

export interface IfNode extends BaseASTNode {
  type: ASTNodeType.If;
  condition: ValueResolvable;
  body: ASTNode[];

  else: IfNode | ASTNode[] | null;
}

export interface NumericForNode extends BaseASTNode {
  type: ASTNodeType.NumericFor;
  variable: IdentifierNode;
  start: ValueResolvable;
  end: ValueResolvable;
  step: ValueResolvable | null;
  body: ASTNode[];
}

export interface GenericForNode extends BaseASTNode {
  type: ASTNodeType.GenericFor;
  iterator: ValueResolvable;
  variables: IdentifierNode[];
  body: ASTNode[];
}

export type ForNode = NumericForNode | GenericForNode;

export interface WhileNode extends BaseASTNode {
  type: ASTNodeType.While;
  condition: ValueResolvable;
  body: ASTNode[];
}

export interface RepeatNode extends BaseASTNode {
  type: ASTNodeType.Repeat;
  body: ASTNode[];
  condition: ValueResolvable;
}

export type IdentifierResolvable = IdentifierNode | IndexPropertyNode;

/**
 * Parses a stream of tokens into an Abstract Syntax Tree for interpretation.
 * @param tokens An array of string tokens to parse.
 * @param options Optional settings for the parser, including debug mode and max tokens to process.
 */
export class Parser {
  ast: ASTNode[] = [];
  currentTokenIndex = -1;
  currentToken!: string;
  currentScope?: {
    node: ASTNode;
    body: ASTNode[];
  };
  dontResolveCurrentStatement = false;
  debug = false;
  lastCreatedNode: ASTNode | null = null;
  maxTokens = Number.MAX_VALUE;
  blacklistedOperators: string[] = [];

  constructor(public tokens: string[], options?: { debug?: boolean; maxTokens?: number }) {
    if (options?.debug) this.debug = true;
    if (options?.maxTokens) this.maxTokens = options.maxTokens;

    if(this.debug) process.on('uncaughtException', (err) => {
      console.log(inspect(this.ast, { depth: null, colors: true }));
      console.error(err);
    });

    this.parseTokens();
  }

  /**
   * Centralized debug logging helper.
   */
  log(...args: any[]) {
    if (this.debug) console.log(...args);
  }

  /**
   * Helper to assert the next token is the expected value
   */
  expect(value: string, message?: string) {
    const t = this.next();
    if (t !== value) throw new Error(message || `Expected '${value}' but got '${t}'`);
    return t;
  }

  /**
   * Checks if the supplied token is a string literal
   */
  isStringLiteral(token: string) {
    const opening = token.match(/^("|'|\[\[)/)?.[1];
    if (!opening) return false;
    const closing = opening === '[[' ? ']]' : opening;
    if (!token.endsWith(closing)) return false;
    return true;
  }

  /**
   * Parses a string literal token and returns its content
   */
  parseStringLiteral(token: string) {
    if (!this.isStringLiteral(token)) throw new Error(`Token is not a string literal: ${token}`);
    return token[0] === '[' ? token.slice(2, -2) : token.slice(1, -1);
  }

  /**
   * Helper to test if a token is a valid identifier
   */
  isIdentifier(token: string) {
    return /[A-Za-z_$][A-Za-z0-9_$]*/.test(token) && !this.isKeyToken(token);
  }

  /**
   * Helper to test if a node is of a specific type
   * @param node The AST node to check
   * @param type The expected type string
   * @returns True if the node is of the specified type, false otherwise
   */
  isNodeType<T extends ASTNode, U extends T extends { type: infer V } ? V : never>(node: T | null, ...type: U[]): node is Extract<T, { type: U }> {
    return type.includes(node?.type as U);
  }

  /**
   * Helper to assert the next token is a valid identifier and return it
   */
  expectIdentifier(errorMessage?: string): string {
    const t = this.next();
    if (!this.isIdentifier(t)) throw new Error(errorMessage || `Expected identifier but got '${t}'`);
    return t;
  }

  /**
   * Type guard to check if a node is ValueResolvable
   */
  isValueResolvable(node: ASTNode): node is ValueResolvable {
    const validTypes = [
      ASTNodeType.Literal,
      ASTNodeType.ConcatExpression,
      ASTNodeType.MultipleValue,
      ASTNodeType.Function,
      ASTNodeType.Identifier,
      ASTNodeType.Table,
      ASTNodeType.LengthExpression,
      ASTNodeType.BinaryExpression,
      ASTNodeType.LogicalExpression,
      ASTNodeType.NotExpression,
      ASTNodeType.IndexProperty,
      ASTNodeType.ExpressionCall,
    ] as ValueResolvableTypesTuple
    return validTypes.includes(node.type as ValueResolvable['type']);
  }
  
  /**
   * Helper to create and track a new AST node
   */
  createNode<T extends ASTNode>(rawNode: T): T {
    this.lastCreatedNode = rawNode;
    return rawNode;
  }

  /**
   * Helper to create a Null literal node
   */
  createNullLiteralNode(): LiteralNode<null> {
    return this.createNode({
      type: ASTNodeType.Literal,
      value: null,
      raw: 'null',
    });
  }

  /**
   * Helper to create a Literal node (string, number, boolean, null)
   */
  createLiteralNode(value: any, originalToken: string): LiteralNode {
    return this.createNode({
      type: ASTNodeType.Literal,
      value,
      raw: value == null ? 'null' : originalToken,
    });
  }

  /**
   * Helper to create an Identifier node
   */
  createIdentifierNode(name: string): IdentifierNode {
    return this.createNode({
      type: ASTNodeType.Identifier,
      name
    });
  }

  /**
   * Helper to create a VariableDeclaration node
   */
  createVariableDeclarationNode(nameOrIdentifier: string | IdentifierNode | MultipleValueNode, value: ValueResolvable): VariableDeclarationNode {
    return this.createNode({
      type: ASTNodeType.VariableDeclaration,
      identifier: typeof nameOrIdentifier === 'string' ? this.createIdentifierNode(nameOrIdentifier) : nameOrIdentifier,
      value
    });
  }

  /**
   * Helper to create a MultipleValue node
   */
  createMultipleValueNode(values: ValueResolvable[]): MultipleValueNode {
    return this.createNode({
      type: ASTNodeType.MultipleValue,
      values
    });
  }

  /**
   * Checks if the provided token is an operator
   */
  isNextTokenOperator(): boolean {
    const peekFirstChar = (this.peek() ?? '')[0];
    return [...tokens.operators, 'and', 'or', 'not', '.', ',', '[', '(', '#'].includes(/\w/.test(peekFirstChar) ? this.peek() ?? '' : peekFirstChar);
  }

  /**
   * handles tokens that satisfy `isNextTokenOperator()`
   */
  handleOperator(): ASTNode | null {
    while(this.isNextTokenOperator() && !this.blacklistedOperators.includes(this.peek() ?? '')) {
      const operator = this.next();
      switch(operator) {
        case '+':
        case '-':
        case '*':
        case '/':
        case '%':
        case '^':
        case '<':
        case '<=':
        case '>':
        case '>=':
        case '==':
        case '~=':
          const left = this.lastCreatedNode;
          if (!left || !this.isValueResolvable(left)) throw new Error(`Left operand is not a value for operator '${operator}' ${JSON.stringify(left)}`);
          const right = this.parseValue(this.next());
          if (!right || !this.isValueResolvable(right)) throw new Error(`Right operand is not a value for operator '${operator}' ${JSON.stringify(right)}`);

          this.createNode({
            type: ASTNodeType.BinaryExpression,
            operator,
            left,
            right,
          }) as ValueResolvable;
          break;

        case 'and':
        case 'or':
          const logicalLeft = this.lastCreatedNode;
          if (!logicalLeft || !this.isValueResolvable(logicalLeft)) throw new Error(`Left operand is not a value for operator '${operator}' ${JSON.stringify(logicalLeft)}`);
          const logicalRight = this.parseValue(this.next());
          if (!logicalRight || !this.isValueResolvable(logicalRight)) throw new Error(`Right operand is not a value for operator '${operator}' ${JSON.stringify(logicalRight)}`);
          
          this.createNode({
            type: ASTNodeType.LogicalExpression,
            operator,
            left: logicalLeft,
            right: logicalRight,
          });
          break;
        
        case 'not':
          const notValue = this.parseValue(this.next());
          if (!notValue || !this.isValueResolvable(notValue)) throw new Error(`Operand is not a value for operator 'not' ${JSON.stringify(notValue)}`);
          this.createNode({
            type: ASTNodeType.NotExpression,
            operand: notValue,
          });
          break;

        case '=':
        case '+=':
        case '-=':
        case '*=':
        case '/=':
        case '%=':
        case '^=':
          const leftNode = this.lastCreatedNode;
          if (!leftNode) throw new Error('No left-hand side for assignment');
          if (!this.isNodeType(leftNode, ASTNodeType.Identifier, ASTNodeType.IndexProperty, ASTNodeType.MultipleValue)) throw new Error('Left-hand side of assignment must be an identifier or index property');
          const rightValue = this.parseValue(this.next());
          if (!rightValue || !this.isValueResolvable(rightValue)) throw new Error('Right-hand side of assignment must be a value');

          this.createNode({
            type: ASTNodeType.Assignment,
            operator,
            left: leftNode,
            right: rightValue,
          });
          break;
        
        case ',':
          const variables = [this.lastCreatedNode as ValueResolvable];

          this.back(); // step back to re-process the last value
          while(this.peek() === ',') {
            this.next(); // consume the comma
            const nextValue = this.parseValue(this.next(), ['=', ',']);
            if (!nextValue || !this.isValueResolvable(nextValue)) throw new Error(`Right operand is not a value for operator ',' ${JSON.stringify(nextValue)}`);
            variables.push(nextValue);
          }
          this.createNode({
            type: ASTNodeType.MultipleValue,
            values: variables,
          });


          break;

        case '.': {
          this.createNode({
            type: ASTNodeType.IndexProperty,
            table: this.lastCreatedNode as IdentifierResolvable,
            property: this.createIdentifierNode(this.expectIdentifier(`Expected identifier after ., got '${this.peek()}'`)),
          });
          break;
        }

        case '..':
          const concatLeft = this.lastCreatedNode;
          if(!concatLeft || !this.isValueResolvable(concatLeft)) throw new Error(`Left operand is not a value for operator '..' ${JSON.stringify(concatLeft)}`);
          const concatRight = this.parseValue(this.next());
          if(!concatRight || !this.isValueResolvable(concatRight)) throw new Error(`Right operand is not a value for operator '..' ${JSON.stringify(concatRight)}`);

          this.createNode({
            type: ASTNodeType.ConcatExpression,
            left: concatLeft,
            right: concatRight,
          });
          break;
        
        case '#':
          const lengthOperand = this.parseValue(this.next());
          if(!lengthOperand || !this.isValueResolvable(lengthOperand)) throw new Error(`Operand is not a value for operator '#' ${JSON.stringify(lengthOperand)}`);
          this.createNode({
            type: ASTNodeType.LengthExpression,
            operand: lengthOperand,
          });
          break;

        case '[':
          const indexNode: IndexPropertyNode = this.createNode({
            type: ASTNodeType.IndexProperty,
            table: this.lastCreatedNode as IdentifierResolvable,
            property: ((p = this.parseValue(this.next())) => (this.expect(']'), p))(),
          });
          this.pushNode(indexNode);
          break;

        case '(':
          const funcToken = this.lastCreatedNode as IdentifierResolvable;
          const params = this.parseCalledFunctionOrMethodParams();
          this.createNode({
            type: ASTNodeType.ExpressionCall,
            id: funcToken,
            params,
          });
          break;

        default:
          throw new Error(`Unhandled operator: ${operator}`);
      }
    }
    return this.lastCreatedNode;
  }

  /**
   * Main parsing loop to process all tokens into AST nodes
   */
  parseTokens() {
    while (this.currentTokenIndex < this.tokens.length - 1) {
      this.parseNextStatement();
    }
  }

  /**
   * Parses the next statement from the token stream and updates the AST accordingly if applicable.
   */
  parseNextStatement() {
    const token = this.next();

    this.log(`Parsing statement: ${token}`);
    switch (token) {
      case 'local':
        this.parseVariableDeclaration();
        return;

      case 'if': {
        const condition = this.parseValue(this.next());
        this.expect('then');
        this.pushNode(this.createNode({
          type: ASTNodeType.If,
          condition: condition,
          body: [],
          else: null,
        }));
        let ifNode = this.lastCreatedNode as IfNode;
        this.parseBlockBody(ifNode, ifNode.body, ['elseif', 'else', 'end']);
        while(this.peek() === 'elseif') {
          this.next(); // consume 'elseif'
          const elseifCondition = this.parseValue(this.next());
          this.expect('then');
          ifNode.else = this.createNode({
            type: ASTNodeType.If,
            condition: elseifCondition,
            body: [],
            else: null,
          });
          this.parseBlockBody(ifNode.else, ifNode.else.body, ['elseif', 'else', 'end']);
          ifNode = ifNode.else;
        }

        if(this.peek() === 'else') {
          this.next(); // consume 'else'
          ifNode.else = [];
          this.parseBlockBody(ifNode, ifNode.else, ['elseif', 'else', 'end']);
        }

        return;
      }

      case 'for': {
        const variable = this.createIdentifierNode(this.expectIdentifier());
        this.blacklistedOperators.push(',');
        if(this.peek() === '=') {
          this.next(); // consume '='
          const start = this.parseValue(this.next());
          this.expect(',');
          const end = this.parseValue(this.next());
          const step: ValueResolvable | null = this.peek() === ',' ? (this.next(), this.parseValue(this.next())) : null;
          this.expect('do');
          this.pushNode(this.createNode({
            type: ASTNodeType.NumericFor,
            variable,
            start,
            end,
            step,
            body: [],
          }));
        } else if(this.peek() === ',') {
          const variableNames = [variable];
          while(this.peek() === ',') {
            this.next(); // consume ','
            variableNames.push(this.createIdentifierNode(this.next()));
          }
          this.expect('in');
          this.pushNode(this.createNode({
            type: ASTNodeType.GenericFor,
            iterator: this.parseValue(this.next()),
            variables: variableNames,
            body: [],
          }));
          this.expect('do');
        }
        this.blacklistedOperators.pop();
        const forNode = this.lastCreatedNode as ForNode;
        this.parseBlockBody(forNode, forNode.body, ['end']);
        return;
      }

      case 'while': {
        const condition = this.parseValue(this.next());
        this.expect('do');
        this.pushNode(this.createNode({
          type: ASTNodeType.While,
          condition: condition,
          body: [],
        }));
        const whileNode = this.lastCreatedNode as WhileNode;
        this.parseBlockBody(whileNode, whileNode.body, ['end']);
        return;
      }

      case 'repeat': {
        this.pushNode(this.createNode({
          type: ASTNodeType.Repeat,
          condition: this.createNullLiteralNode(), // will be set later
          body: [],
        }));
        const repeatNode = this.lastCreatedNode as RepeatNode;
        this.parseBlockBody(repeatNode, repeatNode.body, ['until']);
        this.expect('until');
        repeatNode.condition = this.parseValue(this.next());
        return;
      }

      case 'break':
        this.pushNode(this.createNode({
          type: ASTNodeType.Break,
        }));
        return;

      case 'return':
        const returnNode: ReturnNode = {
          type: ASTNodeType.Return,
          value: this.peek() == 'end' ? this.createNullLiteralNode() : this.parseValue(this.next()),
        };
        this.pushNode(returnNode);
        return;

      case 'elseif':
      case 'else':
      case 'end':
        this.log('Ending current scope');
        return;

      default:
        let potentialValue = this.parseValue(token); // Handles literals, functions, and tables
        if ([ASTNodeType.Function, ASTNodeType.ExpressionCall, ASTNodeType.Assignment].includes(potentialValue.type)) {
          this.pushNode(potentialValue);
          return potentialValue;
        } else if (!potentialValue) console.warn(`Unrecognized token: ${token}`);
        return;
    }
  }

  /**
   * Parses a variable declaration, and pushes the resulting VariableDeclarationNode to the AST.
   */
  parseVariableDeclaration() {
    if (this.peek() === 'function') {
      this.next();
      const funcNode = this.parseFunctionDeclaration((node) => node.local = true);
      return this.pushNode(funcNode);
    }
    
    const identifier = this.parseValue(this.expectIdentifier(), ['=']) as VariableDeclarationNode["identifier"];
    let initializer: ValueResolvable | null = null;
    if (this.peek() === '=') {
      this.next(); // consume '='
      initializer = this.parseValue(this.next());
    } else initializer = identifier.type === ASTNodeType.MultipleValue
            ? this.createMultipleValueNode(new Array(identifier.values.length).fill(this.createNullLiteralNode()))
            : this.createNullLiteralNode();
    
    
    const variableNode = this.createVariableDeclarationNode(identifier, initializer);
    this.log(`Created variable node: ${JSON.stringify(variableNode)}`, variableNode);
    this.pushNode(variableNode);
  }

  /**
   * Parses a function declaration, and pushes the resulting FunctionNode to the AST.
   */
  parseFunctionDeclaration(callback?: (node: FunctionNode) => void): FunctionNode {
    this.log(`Parsing function declaration`);
    if(this.currentToken === 'function') this.next();
    const basefunctionNode: BaseFunctionNode = {
      type: ASTNodeType.Function,
      params: [],
      body: [],
      local: false,
    };
    if(this.isIdentifier(this.currentToken)) {
      this.createNode({
        ...basefunctionNode,
        name: this.createIdentifierNode(this.currentToken),
        anonymous: false,
      });
    } else {
      this.back();
      this.createNode({
        ...basefunctionNode,
        anonymous: true,
      });
    }
    const functionNode = this.lastCreatedNode as FunctionNode;
    this.log(`Function name: ${(functionNode as NamedFunctionNode).name?.name || 'anonymous'}`);

    functionNode.params = this.parseParamsDeclaration();
    callback?.(functionNode as FunctionNode);
    // this.pushNode(functionNode as FunctionNode);
    this.parseBlockBody(functionNode, functionNode.body, ['end']);
    return functionNode as FunctionNode;
  }

  /**
   * Parses a scope body (e.g. function, if, while) until the matching end/else/elseif token is found.  
   * Updates the currentScope context accordingly.
   */
  parseBlockBody(node: ASTNode, scopeBody: ASTNode[], terminators: string[]) {
    this.currentScope = {
      node,
      body: scopeBody,
    };
    if(terminators.includes(this.peek() ?? '')) { // handle empty bodies
      if(!node.parent) this.currentScope = undefined;
      this.next();
      return;
    };
    do {
      this.parseNextStatement();
    } while (!terminators.includes(this.peek() ?? '') && this.currentTokenIndex < this.tokens.length - 1);
    if(!node.parent) this.currentScope = undefined;
  }

  /**
   * Parses function parameters declaration and returns an array of FunctionParameterNode.
   */
  parseParamsDeclaration() {
    this.blacklistedOperators.push(',');
    this.log(`Parsing function parameters`);
    const paramValues: FunctionParameterNode[] = [];
    if(this.currentToken !== '(') this.expect('(');
    while (this.peek() !== ')') {
      const param: FunctionParameterNode = {
        type: ASTNodeType.Parameter,
        name: this.createIdentifierNode(this.expectIdentifier()),
        defaultValue: this.peek() === '=' ? (this.next(), this.parseValue(this.next())) : this.createNullLiteralNode(),
      };
      paramValues.push(param);
      if (this.peek() === ',') this.next();
    }
    this.expect(')');
    this.blacklistedOperators.pop();
    return paramValues;
  }

  /**
   * Helper to jump to the matching closing bracket for the current opening bracket.  
   * Assumes the initial '(' has already been consumed by the caller.
   * Returns the index of when it was called.
   */
  jumpToClosingBracket() {
    let initialIndex = this.currentTokenIndex;
    let bracketCount = 1;
    while (this.currentTokenIndex < this.tokens.length - 1) {
      this.next();
      if (this.currentToken === '(') bracketCount++;
      else if (this.currentToken === ')') {
        bracketCount--;
        if (bracketCount === 0) break;
      }
    }
    return initialIndex;
  }

  /**
   * Parses parameters for a called function or method, returning an array of ValueResolvable nodes.  
   * Assumes the caller has already consumed the function/method name.
   */
  parseCalledFunctionOrMethodParams() {
    this.blacklistedOperators.push(',');
    if (this.currentToken !== '(' && this.next() !== '(') throw new Error("Expected '(' after function name");
    const paramValues: ValueResolvable[] = [];
    while (this.peek() !== ')') {
      const t = this.next();
      const value = this.parseValue(t);
      paramValues.push(value);
      if (this.peek() === ',') this.next();
    }
    this.expect(')');
    this.blacklistedOperators.pop();
    return paramValues;
  }

  /**
   * Parses a statement involving brackets, which could be a function call or an encapsulated expression.  
   * Assumes the caller has already consumed the opening '('.  
   * Returns the parsed AST node representing the bracketed statement.
   */
  parseBracketStatement() {
    // Determine if it's a function/method call
    if(this.isNodeType(this.lastCreatedNode, ASTNodeType.Identifier)) {
      const identifier = this.lastCreatedNode as IdentifierNode;
      const params = this.parseCalledFunctionOrMethodParams();
      const callNode: ExpressionCallNode = {
        type: ASTNodeType.ExpressionCall,
        id: identifier,
        params,
      };
      return callNode;
    }

    let encapsulatedStatement: ValueResolvable | null = this.parseValue(this.next());
    if(!encapsulatedStatement) throw new Error('Empty bracket statement');
    this.expect(')');
    return encapsulatedStatement;
  }

  /**
   * Helper to create a TableDictItem node
   */
  createDictPropertyNode(key: TableDictItemNode["key"], value: ValueResolvable): TableDictItemNode {
    return {
      type: ASTNodeType.TableDictItem,
      key,
      value,
    };
  }

  /**
   * Helper to create a TableListItem node
   */
  createArrayItemNode(value: ValueResolvable): TableListItemNode {
    return {
      type: ASTNodeType.TableListItem,
      value,
    };
  }

  /**
   * Parses a table from the token stream and returns the resulting TableNode.
   */
  parseTable() {
    if(this.currentToken !== '{') this.expect('{');
    this.blacklistedOperators.push(',')

    const propertyNodes: TableItemNode[] = [];

    while (this.peek() !== '}' && this.currentTokenIndex < this.tokens.length - 1) {
      const token = this.next();

      let propertyNode: TableItemNode | null = null;

      // ensure that multi-line strings are handled first to prevent issues with expression keys ([[...]] syntax)
      if (this.isStringLiteral(token)) propertyNode = this.createArrayItemNode(this.createLiteralNode(this.parseStringLiteral(token), token)); 

      // if key is an expression
      else if (token === '[') {
        const key = this.parseValue(this.next());
        this.expect(']');
        this.expect('=');
        const value = this.parseValue(this.next());
        propertyNode = this.createDictPropertyNode(key, value)

      } else if (this.isIdentifier(token)) {
        if (this.peek() === '=') {
          this.next(); // consume '='
          const value = this.parseValue(this.next());
          propertyNode = this.createDictPropertyNode(this.createIdentifierNode(token), value);
        } else propertyNode = this.createArrayItemNode(this.createIdentifierNode(token));
        
      } else { // value only (array item)
        const value = this.parseValue(token);
        propertyNode = this.createArrayItemNode(value);
      }
      propertyNodes.push(propertyNode);
      // consume separator. (not present after last item)
      if (this.peek() === ',' || this.peek() === ';') this.next();
    }
    this.expect('}');
    this.blacklistedOperators.pop();
    return this.createNode({
      type: ASTNodeType.Table,
      properties: propertyNodes,
    });
  }

  /**
   * Helper to check if a token is a reserved keyword or operator/delimiter.
   */
  isKeyToken(token: string): boolean {
    return tokens.all.includes(token);
  }

  /**
   * Parses a value, which could be a literal, identifier, function, or table.  
   * Returns the resulting ValueResolvable node.
   */
  parseValue(token: string, blacklistedOperators: string[] = []): ValueResolvable {
    this.blacklistedOperators.push(...blacklistedOperators);
    if (!token) throw new Error('Unexpected end of input while parsing value');
    let returnValue: ValueResolvable | null = null;
    if (this.isStringLiteral(token)) {
      returnValue = this.createLiteralNode(this.parseStringLiteral(token), token);
    } else if (!isNaN(Number(token))) {
      returnValue = this.createLiteralNode(Number(token), token);
    } else if (token === 'true' || token === 'false') {
      returnValue = this.createLiteralNode(token === 'true', token);
    } else if (token === 'nil') {
      returnValue = this.createNullLiteralNode();
    } else if (token === '{') {
      returnValue = this.parseTable();
    } else if (token === 'function') {
      returnValue = this.parseFunctionDeclaration() as AnonymousFunctionNode;
    } else if (token === '(') {
      const bracketStatement = this.parseBracketStatement();
      if (bracketStatement) returnValue = bracketStatement;
      else throw new Error('Unexpected token while parsing value: ' + token);
    } else if (['#', '-', 'not'].includes(token)) {
      this.back();
      returnValue = this.handleOperator() as ValueResolvable;
    } else if (this.isIdentifier(token)) {
      if(!this.isKeyToken(token)) returnValue = this.createIdentifierNode(token);
      else throw new Error(`Unexpected keyword token while parsing value: ${token}`);
    }
    if(!this.blacklistedOperators.includes(this.peek() ?? '')) {
      if(this.isNextTokenOperator()) returnValue = this.handleOperator() as ValueResolvable;
    }
    if(!returnValue) throw new Error(`Unexpected token while parsing value: ${token}, ${this.peek()}, ${JSON.stringify(this.lastCreatedNode)}`);

    for(let i = 0; i < blacklistedOperators.length; i++) this.blacklistedOperators.pop();
    return this.lastCreatedNode as ValueResolvable;
  }

  /**
   * Helper to push a new node into the AST at the current scope level.  
   * If the node has a body (like functions), it updates the scope tracking accordingly.
   */
  pushNode(node: ASTNode) {
    node.parent = this.currentScope?.node;
    this.currentScope?.body.push(node) ?? this.ast.push(node);
  }

  /**
   * Helper to get the body of a scope from a given node, if applicable
   */
  getScopeBodyFromNode(node: ASTNode): ASTNode[] | null {
    if (!node) return null;
    if (node.type === 'VariableDeclaration') {
      if (
        (node as VariableDeclarationNode).value &&
        typeof (node as VariableDeclarationNode).value === 'object' &&
        ((node as VariableDeclarationNode).value as FunctionNode).type === 'Function'
      ) {
        return ((node as VariableDeclarationNode).value as FunctionNode).body;
      } else return null;
    } else if (node.type === 'Function') {
      return (node as FunctionNode).body;
    } else return null;
  }

  /**
   * Advances to the next token in the stream and returns it.
   */
  next(): string {
    if (this.currentTokenIndex >= this.tokens.length - 1) return (this.currentToken = undefined as any);
    if (this.currentTokenIndex > this.maxTokens) {
      this.log(inspect(this.ast))
      throw new Error('Max token debug limit reached');
    }
    this.currentTokenIndex++;
    this.currentToken = this.tokens[this.currentTokenIndex];
    this.log(this.currentTokenIndex, this.currentToken);
    return this.currentToken;
  }

  /**
   * Peeks ahead in the token stream by a specified offset without advancing the current position.
   */
  peek(offset = 1): string | undefined {
    return this.tokens[this.currentTokenIndex + offset];
  }

  /**
   * Moves back one token in the stream.  
   * opposite of `next()`
   */
  back() {
    if (this.currentTokenIndex <= 0) return;
    this.currentTokenIndex--;
    this.currentToken = this.tokens[this.currentTokenIndex];
  }
}
