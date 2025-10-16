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

local i = 0
-- i = i
i = i + 1
while( i < 5 ) do
  i = i + 1

  if i > 3 then
    print("i is greater than 3")
  else
    print("i is 3 or less")
  end
end
print(i) -- Output: 5

if true then
  print("This is if")

elseif true then
  print("This is elseif")
else
  print("This is else")
end

a = 0

print(foo()) -- Output: 9

print(table.key1) -- Output: value1
print(table["key2"]) -- Output: 42
print(table[1]) -- Output: key4
print(table[10]) -- Output: ten
print(table.key8) -- Output: { nestedKey = "nestedValue", nestedArr = {1, 2, 3} }
print(table.key8.nestedKey) -- Output: nestedValue