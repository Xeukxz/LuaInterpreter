const Tokens = {
  keywords: [
    'and',
    'break',
    'do',
    'else',
    'elseif',
    'end',
    'false',
    'for',
    'function',
    'if',
    'in',
    'local',
    'nil',
    'not',
    'or',
    'repeat',
    'return',
    'then',
    'true',
    'until',
    'while',
  ],
  operators: ['+', '-', '*', '/', '%', '^', '=', '~', '<', '>', '#'],
  delimiters: [';', ',', '{', '}', '(', ')', '.', '[', ']', ':'],
  all: [] as string[],
};

Tokens.all = [
  ...Tokens.keywords,
  ...Tokens.operators,
  ...Tokens.delimiters,
];

export { Tokens };
