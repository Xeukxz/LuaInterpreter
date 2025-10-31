function Closure()
  local count = 0
  return function()
    count = count + 1
    return count
  end
end

-- Single line Comment
--[[
  Multi-line Comment
--]]

local myClosure = Closure()
print(1, myClosure()) -- 1
print(2, myClosure()) -- 2
print(3, myClosure()) -- 3

print(true, true and true) -- true
print(false, true and false) -- false
print(true, false or true) -- true
print(false, false or false) -- false
print(true, not false) -- true
print(true, not not true) -- true
print(12, #"Hello, World!") -- 13
print("concat" .. "enation") -- concatenation
