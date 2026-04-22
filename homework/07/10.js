// 1. 定義 checkAdmin 函數
function checkAdmin(role, callback) {
    if (role !== "admin") {
        // 情況 A：有錯誤（權限不符），第一個參數傳入錯誤訊息
        return callback("Access Denied");
    }
    
    // 情況 B：沒錯誤，第一個參數傳 null，第二個傳入成功訊息
    callback(null, "Welcome");
}

// 2. 測試：處理有錯誤的情況
checkAdmin("guest", (err, msg) => {
    if (err) {
        console.error("[錯誤]:", err); // 輸出: [錯誤]: Access Denied
        return; // 這裡的 return 很重要，可以防止程式繼續往下執行
    }
    console.log(msg);
});

// 3. 測試：處理沒錯誤的情況
checkAdmin("admin", (err, msg) => {
    if (err) {
        console.error("[錯誤]:", err);
        return;
    }
    console.log("[成功]:", msg); // 輸出: [成功]: Welcome
});