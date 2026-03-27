# Blog 專案對話摘要

## 專案位置
`C:\Users\yuan0\Desktop\html\_wp\homework\05\blog`

## 功能需求與實作

### 1. 個人貼文區與公共貼文區
- 新增「所有貼文」按鈕顯示所有使用者的貼文
- 新增「我的貼文」按鈕（需登入）顯示自己的貼文
- 刪除/編輯/發佈貼文時同步更新兩個區域

### 2. 其他作者個人貼文區
- 點擊文章作者名稱可查看該作者的貼文
- 在作者頁面顯示「← 返回」連結

### 3. Thread 風格設計
- 黑色背景配藍色主題 (#000 背景, #1d9bf0 藍色)
- 貼文卡片式設計：作者名、@帳號、時間、標題、內容
- 底部操作欄：💬 回覆、🔁 轉推、❤️ 愛心、🗑️ 刪除、✏️ 編輯
- 發佈按鈕改為圓角藍色按鈕
- 貼文時間顯示格式（剛剛、X分鐘、X小時、X天）

### 4. 操作功能實作
- **按讚**：點擊愛心可 toggle 按讚狀態，即時更新數量
- **轉推**：點擊 🔁 可轉推貼文
- **回覆**：點擊 💬 展開回覆框，可輸入回覆內容

### 5. 資料庫新增表格
- `likes` - 按讚記錄
- `reposts` - 轉推記錄
- `replies` - 回覆記錄

### 6. API 端點
- `POST /api/posts/:id/like` - 按讚/取消按讚
- `POST /api/posts/:id/repost` - 轉推
- `POST /api/posts/:id/reply` - 回覆
- `GET /api/posts/:id/replies` - 取得回覆列表
- `GET /api/users/:id/posts` - 取得使用者貼文
- `GET /api/users/:id` - 取得使用者資訊

### 7. 其他修改
- 網頁標題改為 "My Blog"
- 新增 `.gitignore` 檔案過濾 node_modules、*.log、*.db 等檔案
- 預設帳號：admin，密碼：admin123

## 技術堆疊
- Node.js + Express
- sql.js (SQLite)
- HTML/CSS/JavaScript
