// 1. 給定的 JSON 字串
const jsonStr = '{"title": "Post 1", "tags": ["js", "node"]}';

// 2. 將 JSON 字串轉換成 JavaScript 物件
let obj = JSON.parse(jsonStr);

// 3. 印出 tags 陣列中的第二個元素 (索引值為 1)
console.log(obj.tags[1]); // 輸出: node