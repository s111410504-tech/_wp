function multiplier(factor){
    return (n) => n*factor;
}
const double = multiplier(2);
console.log(double(10));
