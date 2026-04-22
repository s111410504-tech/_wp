function mathTool(num1, num2, action){
    return action(num1, num2);
}

const plus = mathTool(10, 5, function(a, b){return a+b;});
const minus = mathTool(10, 5, function(a, b){return a-b;});

console.log(plus);
console.log(minus);

