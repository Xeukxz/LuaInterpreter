
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

print("full table:", table)
print("value1", table.key1) -- value1
print(42, table["key2"]) -- 42
print("key4", table[1]) -- key4
print("ten", table[10]) -- ten
print("boolKey", table[true]) -- boolKey
print("nested table:", table.key8) -- { nestedKey = "nestedValue", nestedArr = {1, 2, 3} }
print("nestedValue", table.key8.nestedKey) -- nestedValue
print(3, #table) -- 3

function table.func(x, y)
  return x + y
end

print(15, table.func(5, 10)) -- 15

print("---- pairs ----")
for k, v in pairs(table) do
  print(k, v)
end

print("---- ipairs ----")
for i, v in ipairs(table) do
  print(i, v)
end