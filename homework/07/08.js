// 1. 宣告變數
let user = "Guest";

// 2. 使用反引號建立字串，並在 ${} 內進行邏輯判斷
const html = `<h1>Welcome, ${user ? user : "Stranger"}</h1>`;

// 3. 印出結果
console.log(html); // 輸出: <h1>Welcome, Guest</h1>

// --- 測試另一種情況 ---
user = ""; // 假裝沒有值（空字串在 JS 中被視為 false）
const html2 = `<h1>Welcome, ${user ? user : "Stranger"}</h1>`;
console.log(html2); // 輸出: <h1>Welcome, Stranger</h1>