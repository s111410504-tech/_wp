// 1. 定義模擬資料庫查詢的函數 fakeGet
function fakeGet(sql, params, callback) {
    // 這裡我們假裝經過了一段查詢時間...
    
    // 2. 模擬從資料庫抓回來的物件
    const row = { 
        id: 1, 
        title: "測試文章", 
        content: "這是內容" 
    };

    // 3. 依照「錯誤優先」模式執行 callback
    // 第一個參數是 null (無錯誤)，第二個是查詢到的資料物件
    callback(null, row);
}

// 4. 測試呼叫：模擬真實開發中的查詢情境
const sql = "SELECT * FROM posts WHERE id = ?";
const params = [1];

fakeGet(sql, params, (err, data) => {
    if (err) {
        console.error("查詢出錯了！");
    } else {
        // 5. 印出該文章的標題 (title)
        console.log("從資料庫抓到的標題是：", data.title);
    }
});