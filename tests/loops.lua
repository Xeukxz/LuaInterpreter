local repeatCount = 0
repeat 
  print("repeat " .. repeatCount)
  repeatCount = repeatCount + 1
until repeatCount > 5

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