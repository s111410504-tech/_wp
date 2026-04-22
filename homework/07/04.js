// 1. 建立一個空的 params 物件
const params = {};

// 2. 動態新增鍵為 "id"，值為 99 的屬性
// 方式 A：中括號法 (適合動態變數)
params["id"] = 99;

// 方式 B：點符號法
// params.id = 99;

// 3. 印出物件
console.log(params); 
// 輸出: { id: 99 }

// 驗證存取
console.log(params.id); // 輸出: 99