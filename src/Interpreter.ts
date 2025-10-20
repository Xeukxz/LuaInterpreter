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
  MultipleValueNode,
  NamedFunctionNode,
  TableDictItemNode,
  TableNode,
  ValueResolvable,
  VariableDeclarationNode,
} from './Parser';

type LuaPrimitive = string | number | boolean | null;

enum NonPrimitiveKind {
  Table = 'table',
  Function = 'function',
  BuiltinFunction = 'builtin',
  MultipleValue = 'multipleValue',
}

interface LuaTableValue {
  kind: NonPrimitiveKind.Table;
  entries: Map<any, RuntimeValue>;
}

interface UserFunctionValue {
  kind: NonPrimitiveKind.Function;
  node: FunctionNode;
  closure: Environment;
}

interface BuiltinFunctionValue {
  kind: NonPrimitiveKind.BuiltinFunction;
  name: string;
  impl: (interpreter: Interpreter, args: RuntimeValue[]) => RuntimeValue;
}

interface MultipleValue {
  kind: NonPrimitiveKind.MultipleValue;
  values: RuntimeValue[];
}

type RuntimeFunction = UserFunctionValue | BuiltinFunctionValue;
type RuntimeValue = LuaPrimitive | LuaTableValue | RuntimeFunction | MultipleValue;

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
    } else {
      // If no parent (global scope), define it here
      this.values.set(name, value);
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
 * Signal used to handle break statements in loops.
 */
class BreakSignal {}

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
      case ASTNodeType.Identifier:
        return this.resolveIdentifier(node, env);
      case ASTNodeType.IndexProperty:
        return this.resolveIndexProperty(node, env);
      case ASTNodeType.Break:
        throw new BreakSignal();
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
        } else if(node.left.type === ASTNodeType.MultipleValue) {
          const evaluatedValue = this.evaluateValue(node.right, env);
          if(!this.isMultipleValue(evaluatedValue)) throw new Error('Right-hand side does not evaluate to multiple values');
          if(node.left.values.length !== evaluatedValue.values.length) throw new Error('Mismatched number of values in multiple assignment');
          this.assignMultipleValues(node.left.values as IdentifierNode[], evaluatedValue, env);
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
      case ASTNodeType.MultipleValue:
      case ASTNodeType.NotExpression:
      case ASTNodeType.LengthExpression:
      case ASTNodeType.ConcatExpression:
        return this.evaluateValue(node, env); // Handled in evaluateValue
      case ASTNodeType.NumericFor: {
        try {
          const start = this.evaluateValue(node.start, env);
          const end = this.evaluateValue(node.end, env);
          const step = node.step ? this.evaluateValue(node.step, env) : 1;
          if (typeof start !== 'number' || typeof end !== 'number' || typeof step !== 'number') 
            throw new Error('Numeric for loop expects numeric start, end, and step values');

          for (let i = start; step > 0 ? i <= end : i >= end; i += step) {
            const loopEnv = new Environment(env);
            loopEnv.define(node.variable.name, i);
            for (const statement of node.body) this.interpretNode(statement, loopEnv);
          }
        } catch (error) {
          if (error instanceof BreakSignal) return;
          throw error;
        }
        return;
      }
      case ASTNodeType.GenericFor: {
        try {
          const iterator = this.evaluateValue(node.iterator, env);
          if (!this.isFunction(iterator)) throw new Error('Generic for loop iterator is not a function');
          const loopEnv = new Environment(env);
          while (true) {
            const result = this.callFunction(iterator, (node.iterator as ExpressionCallNode).params.map(param => this.evaluateValue(param, env)));
            if (result === null) break;
            if (this.isMultipleValue(result)) this.assignMultipleValues(node.variables, result, loopEnv);
            else {
              for(let i = 0; i < node.variables.length; i++) {
                const varName = node.variables[i].name;
                loopEnv.define(varName, result ?? null);
              }
            }
            for (const statement of node.body) this.interpretNode(statement, loopEnv);
          }
        } catch (error) {
          if (error instanceof BreakSignal) return;
          throw error;
        }
        return;
      }
      case ASTNodeType.While: {
        try {
          while (this.evaluateValue(node.condition, env)) {
            const loopEnv = new Environment(env);
            for (const statement of node.body) this.interpretNode(statement, loopEnv);
          }
        } catch (error) {
          if (error instanceof BreakSignal) return;
          throw error;
        }
        return;
      }
      case ASTNodeType.Repeat:
        try {
          do {
            const loopEnv = new Environment(env);
            for (const statement of node.body) this.interpretNode(statement, loopEnv);
          } while (!this.evaluateValue(node.condition, env));
        } catch (error) {
          if (error instanceof BreakSignal) return;
          throw error;
        }
        return;
      
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
   * Assigns multiple values to multiple identifier targets in the given environment.
   */
  assignMultipleValues(targets: IdentifierNode[], values: MultipleValue, env: Environment) {
    if (!Array.isArray(targets) || !Array.isArray(values.values)) throw new Error('Targets and values must be arrays');

    for (let i = 0; i < targets.length; i++) {
      const target = targets[i];
      let value = values.values[i] ?? null;
      if (this.isMultipleValue(value)) {
        for(let j = 1; j < value.values.length; j++) values.values.splice(i + j, 0, value.values[j]);
        value = value.values[0] ?? null;
      }
      env.define(target.name, value);
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
    if(node.identifier.type === ASTNodeType.MultipleValue) return this.assignMultipleValues(node.identifier.values as IdentifierNode[], value as MultipleValue, env), value;
    return env.define(node.identifier.name, value), value;
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
  evaluateIdentifierResolvable(node: IdentifierNode | IndexPropertyNode | MultipleValueNode, env: Environment): RuntimeValue {
    return node.type === 'Identifier' 
            ? this.resolveIdentifier(node, env) 
            : node.type === ASTNodeType.MultipleValue
              ? this.resolveIndexProperty(node as any, env)
              : this.resolveIndexProperty(node, env);
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
        return this.evaluateBinaryExpression(node, env);
      case ASTNodeType.ExpressionCall:
        return this.interpretExpressionCall(node, env);
      case ASTNodeType.IndexProperty:
        return this.resolveIndexProperty(node, env);
      case ASTNodeType.LogicalExpression:
        return this.evaluateLogicalExpression(node, env);
      case ASTNodeType.NotExpression:
        return !this.evaluateValue(node.operand, env);
      case ASTNodeType.LengthExpression: {
        const value = this.evaluateValue(node.operand, env);
        if(this.isTable(value)) {
          let index = 0;
          while (value.entries.has(index + 1)) index++;
          return index;
        } else if(typeof value === 'string') return value.length;
        else throw new Error(`Attempt to get length of a non-table/non-string value`);
      }
      case ASTNodeType.MultipleValue:
        return {
          kind: NonPrimitiveKind.MultipleValue,
          values: node.values.map(val => this.evaluateValue(val, env)),
        };
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
      kind: NonPrimitiveKind.Function,
      node,
      closure: env,
    };
  }

  /**
   * Calls a function (builtin or user-defined) with the provided arguments.
   */
  callFunction(fn: RuntimeFunction, args: RuntimeValue[]): RuntimeValue {
    return fn.kind === NonPrimitiveKind.BuiltinFunction ? fn.impl(this, args) : this.callUserFunction(fn, args);
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
      kind: NonPrimitiveKind.Table,
      entries: new Map<any, RuntimeValue>(),
    };

    let sequenceIndex = 1;
    for (const property of node.properties) {
      if (property.type === 'TableListItem') {
        const value = this.evaluateValue(property.value, env);
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
    return typeof value === 'object' && value !== null && ('kind' in value) && (value.kind === NonPrimitiveKind.Function || value.kind === NonPrimitiveKind.BuiltinFunction);
  }

  /**
   * Checks if a value is a Lua table.
   */
  isTable(value: RuntimeValue): value is LuaTableValue {
    return typeof value === 'object' && value !== null && 'kind' in value && value.kind === NonPrimitiveKind.Table;
  }

  isMultipleValue(value: RuntimeValue): value is MultipleValue {
    return typeof value === 'object' && value !== null && 'kind' in value && value.kind === NonPrimitiveKind.MultipleValue;
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
    this.globalEnv.define('print', {
      kind: NonPrimitiveKind.BuiltinFunction,
      name: 'print',
      impl: (_interpreter, args) => {
        const rendered = args.map((arg) => this.renderValue(arg)).join('\t');
        console.log(rendered);
        return null;
      },
    });
    this.globalEnv.define('pairs', {
      kind: NonPrimitiveKind.BuiltinFunction,
      name: 'pairs',
      impl: (_interpreter, args) => {
        if (args.length === 0 || !_interpreter.isTable(args[0])) {
          throw new Error('pairs expects a table as its first argument');
        }
        const table = args[0] as LuaTableValue;
        let index = 0;
        return {
          kind: NonPrimitiveKind.BuiltinFunction,
          name: 'ipairs_iterator',
          impl: () => {
            const keys = Array.from(table.entries.keys())
            if (index <= keys.length - 1) {
              return {
                kind: NonPrimitiveKind.MultipleValue,
                values: [keys[index], table.entries.get(keys[index++])!],
              };
            } else return null;
          },
        } as BuiltinFunctionValue;
      },
    });
    this.globalEnv.define('ipairs', {
      kind: NonPrimitiveKind.BuiltinFunction,
      name: 'ipairs',
      impl: (_interpreter, args) => {
        if (args.length === 0 || !_interpreter.isTable(args[0])) {
          throw new Error('ipairs expects a table as its first argument');
        }
        const table = args[0] as LuaTableValue;
        let index = 0;
        return {
          kind: NonPrimitiveKind.BuiltinFunction,
          name: 'ipairs_iterator',
          impl: () => {
            index += 1;
            if (table.entries.has(index)) {
              return {
                kind: NonPrimitiveKind.MultipleValue,
                values: [index, table.entries.get(index)!],
              };
            } else return null;
          },
        } as BuiltinFunctionValue;
      },
    });
  }

  /**
   * Renders a runtime value to a string for display, handling primitives, functions, and tables.
   */
  renderValue(value: RuntimeValue): string {
    if (value === null) return 'nil';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (this.isFunction(value)) return value.kind === NonPrimitiveKind.BuiltinFunction ? `[builtin ${value.name}]` : '[function]';
    if (this.isTable(value)) {
      const entries: string[] = [];
      for (const [key, val] of value.entries.entries()) 
        entries.push(`${this.renderTableKey(key)} = ${this.renderValue(val)}`);
      
      const body = entries.join(', ')
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
    if (typeof key === 'number' || typeof key === 'boolean') return `[${String(key)}]`;
    if (typeof key === 'boolean') return `[${String(key)}]`;
    if (this.isFunction(key)) return '[function]';
    if (this.isTable(key)) return '[table]';
    return '[unknown]';
  }
}