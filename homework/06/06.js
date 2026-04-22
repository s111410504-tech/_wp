function myFilter(arr, callback){
    const result = [];
    for(let i=0;i<arr.length;i++){
        if(callback(arr[i])) result.push(arr[i]);
    }
    return result;
}

const number = [1, 5, 8, 12];
const filter = myFilter(number, (n) => n>7);
console.log(filter);