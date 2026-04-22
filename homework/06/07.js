const users = [{name: "Alice", age: 25}, {name: "Bob", age: 17}];
const adult = users.filter(users => users.age >18);
console.log(adult);