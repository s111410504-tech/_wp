const contents = [
    "Very long content here", 
    "Another Very long content here", 
    "3rd Very long content here"
];

// 處理陣列中的第一個字串作為範例
const originalStr = contents[0];

// 1. 取出前 10 個字元 (從索引 0 到 10，不包含 10)
const shortContent = originalStr.substring(0, 10);

// 2. 在後方加上 "..."
const result = shortContent + "...";

console.log(result); 
// 輸出: Very long ...