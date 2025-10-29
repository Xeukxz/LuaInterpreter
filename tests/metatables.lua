local operationsMetatable = {
  __add = function(table, other)
    return 1 + other
  end,
  __sub = function(table, other)
    return -other
  end,
  __mul = function(table, other)
    return other * 2
  end,
  __div = function(table, other)
    return other / 2
  end,
  __idiv = function(table, other)
    return other // 2
  end,
  __mod = function(table, other)
    return other % 3
  end,
  __pow = function(table, other)
    return other ^ 2
  end,
  __concat = function(table, other)
    return other .. other
  end,
  __unm = function(table)
    return -1
  end,
  __index = function(table, key)
    return "default value"
  end,
}

local count = 0

local table = {
  data = "test"
}
table.__index = table

function table.new()
  local newTable = setmetatable(table, operationsMetatable)
  newTable.id = count + 1
  count = count + 1
  return newTable
end

local table1 = table.new()
local table2 = table.new()

print(1, table1.id)
print(2, table2.id)

print(6, table1 + 5)
print(-10, table2 - 10)
print(8, table1 * 4)
print(4, table2 / 8)
print(4, table1 // 9)
print(1, table1 % 10)
print(9, table2 ^ 3)
print("concatconcat", table1 .. "concat")
print(-1, -table2)
print("default value", table1.nonExistentKey)
print("test", table1.data)