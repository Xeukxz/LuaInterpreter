const tokens = {
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

tokens.all = [
  ...tokens.keywords,
  ...tokens.operators,
  ...tokens.delimiters,
];

export { tokens };
