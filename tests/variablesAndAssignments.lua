local str = "Hello, World!"
local str2 = 'Lua is fun!'
local str3 = [[This is a
multi-line string.]]

print(str)
print(str2)
print(str3)

local num = 123
local floatNum = 45.67
local hex = 0x1A3
local hexFloat = 0x1.5p2

print(num)
print(floatNum)
print(num + floatNum)
print(419, hex)
print(5.25, hexFloat)

local v1, v2 = 10, 20
print('unswapped:', v1, v2)
v1, v2 = v2, v1
print('swapped:', v1, v2)

local function func()
  return 40, 50
end

local function func2()
  return 30, func()
end

local mv1, mv2, mv3, mv4, mv5, mv6 = 10, 20, func2(), 60

print((mv1 == 10) and (mv2 == 20) and (mv3 == 30) and (mv4 == 40) and (mv5 == 50) and (mv6 == 60))