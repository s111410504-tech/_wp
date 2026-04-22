// 1. 定義 fetchData 函數
function fetchData(id, callback) {
    // 2. 模擬抓取到的物件資料
    const result = { 
        id: id, 
        status: "success" 
    };

    // 3. 呼叫 callback：第一個參數傳 null（代表沒錯誤），第二個傳結果物件
    callback(null, result);
}

// 4. 測試呼叫
fetchData(101, (error, data) => {
    if (error) {
        console.error("發生錯誤:", error);
    } else {
        console.log("成功取得資料:", data);
    }
});