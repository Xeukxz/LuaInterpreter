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
  FooGlobal = "global foo"
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
print(i) -- 5

if true then
  print("This is if")

elseif true then
  print("This is elseif")
else
  print("This is else")
end

a = 0

print(foo()) -- 9
print(FooGlobal) -- global foo
print(table.key1) -- value1
print(table["key2"]) -- 42
print(table[1]) -- key4
print(table[10]) -- ten
print(table.key8) -- { nestedKey = "nestedValue", nestedArr = {1, 2, 3} }
print(table.key8.nestedKey) -- nestedValue
print(true and true) -- true
print(true and false) -- false
print(false or true) -- true
print(false or false) -- false
print(not false) -- true
print(not not true) -- true
print("concat" .. "enation") -- concatenation
print(not function() end) -- true