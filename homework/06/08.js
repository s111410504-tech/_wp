let listA = [1, 2];
let listB = [3, 4];

function process(a, b) {
  a.push(99);
  b = [100];
}
process(listA, listB);

//listA = [1, 2, 99]
//listB = [3, 4]
//原因:a修改了listA裡面的東西，所以改變了
//原因:b是重新賦予新的值，並無修改listB裡面的東西