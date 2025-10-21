local str = "Hello, World!"
local str2 = 'Lua is fun!'
local str3 = [[This is a
multi-line string.]]
local a = 1
local b = 2
local bool = true

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
while i < 5  do
  i = i + 1

  if i > 3 then
    print("i is greater than 3")
  else
    print("i is 3 or less")
  end
end
print(i) -- 5

if true then print("This is if") elseif true then print("This is elseif") else print("This is else") end
if false then print("This is if") elseif true then print("This is elseif") else print("This is else") end
if false then print("This is if") elseif false then print("This is elseif") else print("This is else") end

a = 0

local repeatCount = 0
repeat 
  print("repeat " .. repeatCount)
  repeatCount = repeatCount + 1
until repeatCount > 5

for i = 1, 3, 1 do
  print("for loop iteration:", i)
end
print(i) -- 5 (for loop redeclares i locally)

print(foo()) -- 9
print(FooGlobal) -- global foo
print(table.key1) -- value1
print(table["key2"]) -- 42
print(table[1]) -- key4
print(table[10]) -- ten
print(table[true]) -- boolKey
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
print(table)
print(#table)
print(#str)

print("---- pairs ----")
for k, v in pairs(table) do
  print(k, v)
end
print("---- ipairs ----")
for i, v in ipairs(table) do
  print(i, v)
end

local v1, v2 = 10, 20
print('unswapped:', v1, v2) -- 20 10
v1, v2 = v2, v1 -- swap values
print('swapped:', v1, v2) -- 10 20

for i = 1, 5, 1 do
  print("i:", i)
  if i == 3 then
    break
  end
end

local j = 0
while true do
  print("j:", j)
  j = j + 1
  if j >= 3 then
    break
  end
end

local function func()
  return 40, 50
end

local function func2()
  return 30, func()
end

---@diagnostic disable-next-line: unbalanced-assignments
local mv1, mv2, mv3, mv4, mv5, mv6 = 10, 20, func2(), 60

print(mv1, mv2, mv3, mv4, mv5, mv6) -- 10 20 30 40 50 60

function Closure()
  local count = 0
  return function()
    count = count + 1
    return count
  end
end

local myClosure = Closure()
print(myClosure()) -- 1
print(myClosure()) -- 2
print(myClosure()) -- 3