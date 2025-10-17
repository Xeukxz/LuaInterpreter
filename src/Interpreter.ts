import {
  ASTNode,
  ASTNodeType,
  BinaryExpressionNode,
  ExpressionCallNode,
  FunctionNode,
  IdentifierNode,
  IfNode,
  IndexPropertyNode,
  LogicalExpressionNode,
  NamedFunctionNode,
  TableDictItemNode,
  TableNode,
  ValueResolvable,
  VariableDeclarationNode,
} from './Parser';

type LuaPrimitive = string | number | boolean | null;

interface LuaTableValue {
  kind: 'table';
  sequence: RuntimeValue[];
  entries: Map<any, RuntimeValue>;
}

interface UserFunctionValue {
  kind: 'function';
  node: FunctionNode;
  closure: Environment;
}

interface BuiltinFunctionValue {
  kind: 'builtin';
  name: string;
  impl: (interpreter: Interpreter, args: RuntimeValue[]) => RuntimeValue;
}

type RuntimeFunction = UserFunctionValue | BuiltinFunctionValue;
type RuntimeValue = LuaPrimitive | LuaTableValue | RuntimeFunction;

/**
 * Represents a variable scope/environment, supporting nested scopes via a parent reference.
 */
class Environment {
  values = new Map<string, RuntimeValue>();

  constructor(public parent?: Environment) {}

  /**
   * Defines a new variable in the current environment.
   */
  define(name: string, value: RuntimeValue) {
    this.values.set(name, value);
  }

  /**
   * Assigns a value to an existing variable, searching parent environments if necessary.  
   * Throws an error if the variable is not found in any environment.
   */
  assign(name: string, value: RuntimeValue) {
    if (this.values.has(name)) {
      this.values.set(name, value);
      return;
    }
    if (this.parent) {
      this.parent.assign(name, value);
      return;
    }
    throw new Error(`Attempt to assign to undefined variable '${name}'`);
  }

  /**
   * Looks up a variable by name, searching parent environments if necessary.  
   * Throws an error if the variable is not found.
   */
  lookup(name: string): RuntimeValue {
    if (this.values.has(name)) return this.values.get(name)!;
    if (this.parent) return this.parent.lookup(name);
    throw new Error(`Undefined variable '${name}'`);
  }

  /**
   * Checks if a variable is defined in the current environment or any parent environment.  
   * Returns true if found, false otherwise.
   */
  has(name: string): boolean {
    if (this.values.has(name)) return true;
    return this.parent ? this.parent.has(name) : false;
  }

  getParent() {
    return this.parent;
  }
}

/**
 * Signal used to handle return statements in function execution.
 */
class ReturnSignal {
  constructor(public value: RuntimeValue) {}
}

/**
 * Interprets an AST representing Lua code.
 */
export class Interpreter {
  globalEnv = new Environment();

  constructor(public nodes: ASTNode[]) {
    this.installBuiltins();
    for (const node of nodes) {
      this.interpretNode(node, this.globalEnv);
    }
  }

  /**
   * Interprets a single AST node within the given environment.
   */
  interpretNode(node: ASTNode, env: Environment): RuntimeValue | void {
    switch (node.type) {
      case ASTNodeType.VariableDeclaration:
        return this.interpretVariableDeclaration(node, env);
      case ASTNodeType.Function:
        return this.interpretFunctionDeclaration(node, env);
      case ASTNodeType.ExpressionCall:
        return this.interpretExpressionCall(node, env);
      case ASTNodeType.Table:
        return this.buildTable(node, env);
      case ASTNodeType.Literal:
        return node.value ?? null;
      case ASTNodeType.ConcatExpression: 
        return this.evaluateValue(node, env); // Handled in evaluateValue
      case ASTNodeType.Identifier:
        return this.resolveIdentifier(node, env);
      case ASTNodeType.IndexProperty:
        return this.resolveIndexProperty(node, env);
      case ASTNodeType.Return:
        throw new ReturnSignal(node.value ? this.evaluateValue(node.value, env) : null);
      case ASTNodeType.BinaryExpression:
        return this.evaluateBinaryExpression(node, env);
      case ASTNodeType.TableDictItem:
      case ASTNodeType.TableListItem:
        // These nodes only appear inside a table literal; evaluation handled there.
        return;
      case ASTNodeType.Assignment: {
        const value = this.evaluateValue(node.right, env);
        if(node.left.type === ASTNodeType.Identifier) {
          env.assign(node.left.name, value);
        } else if(node.left.type === ASTNodeType.IndexProperty) {
          const tableValue = this.evaluateIdentifierResolvable(node.left.table, env);
          if (!this.isTable(tableValue)) throw new Error('Attempt to index a non-table value');
          const key = node.left.property.type === 'Identifier' ? node.left.property.name : this.evaluateValue(node.left.property, env);
          tableValue.entries.set(key, value);
        }
        return value;
      }
      case ASTNodeType.LogicalExpression: {
        const left = this.evaluateValue(node.left, env);
        const right = this.evaluateValue(node.right, env);
        switch (node.operator) {
          case 'and':
            return left && right;
          case 'or':
            return left || right;
          default:
            throw new Error(`Unknown logical operator: ${'operator' in node ? (node as any).operator : 'unknown'}`);
        }
      }
      case ASTNodeType.NotExpression:
        return this.evaluateValue(node, env); // Handled in evaluateValue
      case ASTNodeType.While: {
        while (this.evaluateValue(node.condition, env)) 
          for (const statement of node.body) this.interpretNode(statement, env);
        return;
      }
      case ASTNodeType.If: {
        if (this.evaluateValue(node.condition, env)) {
          for (const statement of node.body) this.interpretNode(statement, env);
        } else {
          if ((node.else as IfNode)?.condition) this.interpretNode((node.else as IfNode), env);
          else for (const statement of (node.else ?? []) as ASTNode[]) this.interpretNode(statement, env);
        }
        return;
      }
      default: {
        const exhaustive: never = node; exhaustive;
        throw new Error('Unsupported AST node type');
      }
    }
  }

  /**
   * Gets a global variable by name from the global environment.
   */
  getGlobal(name: string): RuntimeValue {
    return this.globalEnv.lookup(name);
  }

  /**
   * Interprets a variable declaration node, defining the variable in the appropriate environment.
   */
  interpretVariableDeclaration(node: VariableDeclarationNode, env: Environment): RuntimeValue {
    const value = this.evaluateValue(node.value, env);
    if (node.variableType === 'local') env.define(node.name, value);
    else this.globalEnv.define(node.name, value);
    return value;
  }

  /**
   * Interprets a function declaration node, creating the function and assigning it to the appropriate environment if named.
   */
  interpretFunctionDeclaration(node: FunctionNode, env: Environment): RuntimeValue {
    const fn = this.createUserFunction(node, env);
    if ((node as NamedFunctionNode).name) {
      const targetEnv = node.local ? env : this.globalEnv;
      const name = (node as NamedFunctionNode).name.name;
      if (targetEnv.has(name)) targetEnv.assign(name, fn);
      else targetEnv.define(name, fn);
    }
    return fn;
  }

  /**
   * Interprets a function call expression, evaluating the function and its arguments, then invoking it.
   */
  interpretExpressionCall(node: ExpressionCallNode, env: Environment): RuntimeValue {
    const callable = this.evaluateIdentifierResolvable(node.id, env);
    if (!this.isFunction(callable)) throw new Error('Attempt to call a non-function value');
    const args = node.params.map((param) => this.evaluateValue(param, env));
    return this.callFunction(callable, args);
  }

  /**
   * Evaluates an identifier or index property node to retrieve its value from the environment or table.
   */
  evaluateIdentifierResolvable(node: IdentifierNode | IndexPropertyNode, env: Environment): RuntimeValue {
    return node.type === 'Identifier' ? this.resolveIdentifier(node, env) : this.resolveIndexProperty(node, env);
  }

  /**
   * Gets the value of an identifier from the environment.
   */
  resolveIdentifier(node: IdentifierNode, env: Environment): RuntimeValue {
    return env.lookup(node.name);
  }

  /**
   * Evaluates an index property node to retrieve the value from the referenced table.
   */
  resolveIndexProperty(node: IndexPropertyNode, env: Environment): RuntimeValue {
    const tableValue = this.evaluateIdentifierResolvable(node.table, env);
    if (!this.isTable(tableValue)) throw new Error('Attempt to index a non-table value');
    const key = node.property.type === 'Identifier' ? node.property.name : this.evaluateValue(node.property, env);
    const value = this.getFromTable(tableValue, key);
    return value ?? null;
  }

  /**
   * Evaluates a value node, which can be a literal, identifier, function, table, binary expression, function call, or index property.
   */
  evaluateValue(
    node: ValueResolvable,
    env: Environment,
  ): RuntimeValue {
    switch (node.type) {
      case ASTNodeType.Literal:
        return node.value ?? null;
      case ASTNodeType.ConcatExpression: {
        const left = this.evaluateValue(node.left, env) ?? 'nil';
        const right = this.evaluateValue(node.right, env) ?? 'nil';
        if(typeof left === 'object' || typeof right === 'object') 
          throw new Error('Attempt to concatenate non-primitive value');
        return String(left) + String(right);
      }
      case ASTNodeType.Identifier:
        return this.resolveIdentifier(node, env);
      case ASTNodeType.Function:
        return this.createUserFunction(node, env);
      case ASTNodeType.Table:
        return this.buildTable(node, env);
      case ASTNodeType.BinaryExpression:
        // console.log('Evaluating binary expression', node);
        return this.evaluateBinaryExpression(node, env);
      case ASTNodeType.ExpressionCall:
        return this.interpretExpressionCall(node, env);
      case ASTNodeType.IndexProperty:
        return this.resolveIndexProperty(node, env);
      case ASTNodeType.LogicalExpression:
        return this.evaluateLogicalExpression(node, env);
      case ASTNodeType.NotExpression:
        return !this.evaluateValue(node.operand, env);
      default: {
        const exhaustive: never = node; exhaustive;
        throw new Error(`Unsupported value node type '${(node as ASTNode).type}'`);
      }
    }
  }

  /**
   * Creates a user-defined function value, capturing its declaration node and closure environment.
   */
  createUserFunction(node: FunctionNode, env: Environment): UserFunctionValue {
    return {
      kind: 'function',
      node,
      closure: env,
    };
  }

  /**
   * Calls a function (builtin or user-defined) with the provided arguments.
   */
  callFunction(fn: RuntimeFunction, args: RuntimeValue[]): RuntimeValue {
    return fn.kind === 'builtin' ? fn.impl(this, args) : this.callUserFunction(fn, args);
  }

  /**
   * Calls a user-defined function, setting up its activation environment and handling return values.
   */
  callUserFunction(fn: UserFunctionValue, args: RuntimeValue[]): RuntimeValue {
    const activationEnv = new Environment(fn.closure);
    fn.node.params.forEach((param, index) => {
      const value = index < args.length ? args[index] : this.evaluateValue(param.defaultValue, activationEnv);
      activationEnv.define(param.name.name, value);
    });

    // throws the ReturnSignal to unwind the stack
    try {
      for (const statement of fn.node.body) {
        this.interpretNode(statement, activationEnv);
      }
    } catch (signal) {
      if (signal instanceof ReturnSignal) {
        return signal.value ?? null;
      }
      throw signal;
    }

    return null;
  }

  /**
   * Creates a Lua table from a TableNode, evaluating its properties and handling both list and dictionary items.
   */
  buildTable(node: TableNode, env: Environment): LuaTableValue {
    const table: LuaTableValue = {
      kind: 'table',
      sequence: [],
      entries: new Map<any, RuntimeValue>(),
    };

    let sequenceIndex = 1;
    for (const property of node.properties) {
      if (property.type === 'TableListItem') {
        const value = this.evaluateValue(property.value, env);
        table.sequence.push(value);
        table.entries.set(sequenceIndex, value);
        sequenceIndex++;
      } else {
        const key = this.evaluateTableKey(property, env);
        const value = this.evaluateValue(property.value, env);
        table.entries.set(key, value);
      }
    }

    return table;
  }

  /**
   * Evaluates a table dictionary item to get its key, which can be an identifier or an expression.
   */
  evaluateTableKey(item: TableDictItemNode, env: Environment): RuntimeValue {
    const keyNode = item.key;
    return keyNode.type === 'Identifier' ? keyNode.name : this.evaluateValue(keyNode, env);
  }

  /**
   * Retrieves a value from a Lua table by key, handling primitive and complex keys appropriately.
   */
  getFromTable(table: LuaTableValue, key: RuntimeValue): RuntimeValue | undefined {
    return this.isPrimitive(key) ? table.entries.get(key) : table.entries.get(key);
  }

  /**
   * Evaluates a binary expression node, performing the specified operation on its left and right operands.
   */
  evaluateBinaryExpression(node: BinaryExpressionNode, env: Environment): RuntimeValue {
    const left = this.evaluateValue(node.left, env);
    const right = this.evaluateValue(node.right, env);
    if (typeof left !== 'number' || typeof right !== 'number') {
      throw new Error(`Binary operator '${node.operator}' expects numeric operands`);
    }
    switch (node.operator) {
      case '+':
        return left + right;
      case '-':
        return left - right;
      case '*':
        return left * right;
      case '/':
        return left / right;
      case '%':
        return left % right;
      case '^':
        return Math.pow(left, right);
      case '<':
        return left < right;
      case '<=':
        return left <= right;
      case '>':
        return left > right;
      case '>=':
        return left >= right;
      case '==':
        return left === right;
      case '~=':
        return left !== right;
      default:
        throw new Error(`Unsupported binary operator '${node.operator}'`);
    }
  }

  /**
   * Evaluates a logical expression node, performing 'and' or 'or' operations on its operands.
   */
  evaluateLogicalExpression(node: LogicalExpressionNode, env: Environment): RuntimeValue {
    const left = this.evaluateValue(node.left, env);
    const right = this.evaluateValue(node.right, env);
    switch (node.operator) {
      case 'and':
        return left && right;
      case 'or':
        return left || right;
      default:
        throw new Error(`Unknown logical operator: ${node.operator}`);
    }
  }

  /**
   * Checks if a value is a function (either user-defined or built-in).
   */
  isFunction(value: RuntimeValue): value is RuntimeFunction {
    return typeof value === 'object' && value !== null && ('kind' in value) && (value.kind === 'function' || value.kind === 'builtin');
  }

  /**
   * Checks if a value is a Lua table.
   */
  isTable(value: RuntimeValue): value is LuaTableValue {
    return typeof value === 'object' && value !== null && 'kind' in value && value.kind === 'table';
  }

  /**
   * Checks if a value is a primitive (string, number, boolean, or null).
   */
  isPrimitive(value: RuntimeValue): value is LuaPrimitive {
    return value == null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
  }

  /**
   * Installs built-in functions into the global environment, such as 'print'.
   */
  installBuiltins() {
    const printFunction: BuiltinFunctionValue = {
      kind: 'builtin',
      name: 'print',
      impl: (_interpreter, args) => {
        const rendered = args.map((arg) => this.renderValue(arg)).join('\t');
        console.log(rendered);
        return null;
      },
    };
    this.globalEnv.define('print', printFunction);
  }

  /**
   * Renders a runtime value to a string for display, handling primitives, functions, and tables.
   */
  renderValue(value: RuntimeValue): string {
    if (value === null) return 'nil';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (this.isFunction(value)) return value.kind === 'builtin' ? `[builtin ${value.name}]` : '[function]';
    if (this.isTable(value)) {
      const sequence = value.sequence.map((item) => this.renderValue(item)).join(', ');
      const entries: string[] = [];
      for (const [key, val] of value.entries.entries()) {
        if (typeof key === 'number' && value.sequence[key - 1] === val) continue;
        entries.push(`${this.renderTableKey(key)} = ${this.renderValue(val)}`);
      }
      const body = [sequence, entries.join(', ')].filter((part) => part.length > 0).join(', ');
      return `{${body}}`;
    }
    return '[unknown]';
  }

  /**
   * Renders a table key to a string for display, handling different key types appropriately.
   */
  renderTableKey(key: RuntimeValue): string {
    if (key === null) return 'nil';
    if (typeof key === 'string') return key;
    if (typeof key === 'number' || typeof key === 'boolean') return String(key);
    if (this.isFunction(key)) return '[function]';
    if (this.isTable(key)) return '[table]';
    return '[unknown]';
  }
}