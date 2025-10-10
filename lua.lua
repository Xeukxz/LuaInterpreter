local str = "Hello, World!"
local str2 = 'Lua is fun!'
local str3 = [[This is a
multi-line string.]]
local a = 1
local b = 2
local bool = true

local arr = {1, 2, 3, 4, 5}
local arr2 = {
  "aaaaa",
  "bbbbb",
  "ccccc",
}

local table = {
  key1 = "value1",
  key2 = 42,
  key3 = false,
  "key4",
  'key5',
  [[key6]],
  ["key7"] = "value7",
  [10] = "ten",
  [true] = "boolKey";
  [false] = "boolKey2",
  [{}] = "tableKey",
  [function() end] = "funcKey",
  key8 = {
    nestedKey = "nestedValue",
    nestedArr = {1, 2, 3},
  },
}

local function foo()
  local c = 3
  local d = 4
  return a + b + c + d
end

print(foo()) -- Output: 10