local str = "Hello, World!"
local str2 = 'Lua is fun!'
local str3 = [[This is a
multi-line string.]]

print(str)
print(str2)
print(str3)

local v1, v2 = 10, 20
print('unswapped:', v1, v2) -- 20 10
v1, v2 = v2, v1 -- swap values
print('swapped:', v1, v2) -- 10 20

local function func()
  return 40, 50
end

local function func2()
  return 30, func()
end

local mv1, mv2, mv3, mv4, mv5, mv6 = 10, 20, func2(), 60

print(mv1 == 10, mv2 == 20, mv3 == 30, mv4 == 40, mv5 == 50, mv6 == 60) -- 10 20 30 40 50 60