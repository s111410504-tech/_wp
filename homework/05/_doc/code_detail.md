# Blog 專案程式碼詳細解說

## 專案概述

這是一個類似 Twitter/Thread 的社群部落格系統，採用 Node.js + Express 後端搭配原生 HTML/CSS/JavaScript 前端，使用 SQLite (sql.js) 作為資料庫。

---

## 1. 資料庫 (database.js)

### 1.1 初始化與資料表結構

專案使用 `sql.js` 這是一個可在瀏覽器和 Node.js 中執行的 SQLite 實作。資料庫檔案為 `blog.db`。

```javascript
const initSqlJs = require('sql.js');
```

#### 資料表設計

**users 表** - 儲存使用者資訊
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,  -- 自增主鍵
  username TEXT UNIQUE NOT NULL,          -- 使用者名稱（唯一）
  password TEXT NOT NULL,                 -- 雜湊後的密碼
  salt TEXT NOT NULL,                     -- 密碼鹽值
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

**posts 表** - 儲存貼文
```sql
CREATE TABLE posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,               -- 關聯 users 表
  title TEXT NOT NULL,                   -- 標題（可選）
  content TEXT NOT NULL,                 -- 內容
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
)
```

**likes 表** - 儲存按讚記錄
```sql
CREATE TABLE likes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  post_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, post_id)               -- 防止重複按讚
)
```

**reposts 表** - 儲存轉推記錄
```sql
CREATE TABLE reposts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  post_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

**replies 表** - 儲存回覆
```sql
CREATE TABLE replies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  post_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

### 1.2 密碼雜湊機制

使用 PBKDF2 (Password-Based Key Derivation Function 2) 進行密碼雜湊：

```javascript
function hashPassword(password, salt) {
  // 執行 100,000 次 SHA-512 雜湊
  return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
}
```

**原理**：
- 每次註冊時產生隨機的 salt（32位元組隨機字串）
- 將密碼與 salt 混合後進行 100,000 次 SHA-512 雜湊
- 儲存時同時儲存鹽值和雜湊後的密碼
- 登入時使用相同的鹽值進行雜湊比對

### 1.3 查詢函數

**getAllPosts()** - 取得所有貼文（含統計數據）

```javascript
function getAllPosts(currentUserId = null) {
  const stmt = db.prepare(`
    SELECT posts.*, users.username as author,
    (SELECT COUNT(*) FROM likes WHERE post_id = posts.id) as likes_count,
    (SELECT COUNT(*) FROM reposts WHERE post_id = posts.id) as reposts_count,
    (SELECT COUNT(*) FROM replies WHERE post_id = posts.id) as replies_count
    FROM posts 
    JOIN users ON posts.user_id = users.id 
    ORDER BY posts.created_at DESC
  `);
  // ...
}
```

這裡使用 SQL 子查詢來計算每篇貼文的按讚數、轉推數和回覆數。若有 currentUserId，會額外查詢目前使用者是否已按讚或轉推。

---

## 2. 後端伺服器 (server.js)

### 2.1 Express 中間件設定

```javascript
app.use(express.json());           // 解析 JSON 請求體
app.use(express.urlencoded({ extended: true }));  // 解析 URL 編碼
app.use(express.static(path.join(__dirname, 'public')));  // 靜態檔案服務
```

### 2.2 Session 管理

使用 express-session 管理使用者登入狀態：

```javascript
app.use(session({
  secret: 'blog-secret-key-2024',  // 用於簽署 session ID
  resave: false,                    // 不變更時不重新儲存
  saveUninitialized: false,         // 不儲存未初始化的 session
  cookie: { maxAge: 24 * 60 * 60 * 1000 }  // 24小時過期
}));
```

### 2.3 API 端點詳解

| 方法 | 路徑 | 功能 |
|------|------|------|
| GET | /api/user | 取得目前登入狀態 |
| POST | /api/register | 註冊新帳號 |
| POST | /api/login | 登入 |
| POST | /api/logout | 登出 |
| GET | /api/posts | 取得所有貼文 |
| GET | /api/posts/:id | 取得單篇貼文 |
| POST | /api/posts | 發佈新貼文 |
| PUT | /api/posts/:id | 編輯貼文 |
| DELETE | /api/posts/:id | 刪除貼文 |
| POST | /api/posts/:id/like | 按讚/取消按讚 |
| POST | /api/posts/:id/repost | 轉推 |
| POST | /api/posts/:id/reply | 回覆貼文 |
| GET | /api/posts/:id/replies | 取得回覆列表 |
| GET | /api/users/:id/posts | 取得使用者貼文 |
| GET | /api/users/:id | 取得使用者資訊 |

### 2.4 權限驗證

大部分需要登入的 API 都會檢查 `req.session.user`：

```javascript
app.post('/api/posts', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Please login first' });
  }
  // ... 處理發佈貼文
});
```

---

## 3. 前端 (script.js)

### 3.1 頁面狀態管理

使用 CSS class 切換顯示不同區塊：

```javascript
function showSection(section) {
  // 移除所有區塊的 active class
  authSectionMain.classList.remove('active');
  postsSection.classList.remove('active');
  // ...
  // 給目標區塊加上 active class
  section.classList.add('active');
}
```

### 3.2 貼文渲染

使用模板字串動態生成 HTML：

```javascript
postsContainer.innerHTML = posts.map(post => `
  <div class="post-card">
    <div class="post-header">
      <span class="post-author-name">${escapeHtml(post.author)}</span>
      <span class="post-time">· ${formatTime(post.created_at)}</span>
    </div>
    <div class="post-content">${escapeHtml(post.content)}</div>
    <!-- 操作欄 -->
  </div>
`).join('');
```

### 3.3 XSS 防護

使用 `escapeHtml()` 函數防止跨站腳本攻擊：

```javascript
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;  // 自動轉義 HTML 特殊字元
  return div.innerHTML;
}
```

這會將 `<script>` 轉換成 `&lt;script&gt;` 等安全格式。

### 3.4 時間格式化

```javascript
function formatTime(dateStr) {
  const diff = (now - date) / 1000;
  
  if (diff < 60) return '剛剛';
  if (diff < 3600) return `${Math.floor(diff / 60)}分鐘`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}小時`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}天`;
  return date.toLocaleDateString('zh-TW');
}
```

### 3.5 互動功能

**按讚**：
- 點擊愛心圖示發送 POST 請求到 `/api/posts/:id/like`
- 伺服器檢查是否已按讚，若有則刪除、若無則新增
- 前端更新愛心圖示和數量

**轉推**：
- 點擊轉推圖示發送 POST 請求到 `/api/posts/:id/repost`
- 新增轉推記錄並更新數量

**回覆**：
- 點擊回覆圖示展開回覆框
- 輸入內容後發送 POST 請求到 `/api/posts/:id/reply`
- 顯示該貼文的所有回覆

### 3.6 作者連結

點擊作者名稱可查看該作者的所有貼文：

```javascript
document.querySelectorAll('.author-link').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const userId = link.dataset.userId;
    loadUserPosts(userId);  // 載入該使用者貼文
  });
});
```

---

## 4. 樣式 (style.css)

### 4.1 Thread/Twitter 風格設計

- **背景色**：純黑 `#000`
- **主題色**：Twitter 藍 `#1d9bf0`
- **字體**：系統字體 `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
- **邊框**：深灰色 `#2f3336`
- **按鈕**：圓角9999px（膠囊形）

### 4.2 響應式設計

主要內容區塊最大寬度 600px，適合行動裝置和桌面閱讀。

---

## 5. 資料流程

### 5.1 發佈貼文流程

1. 使用者填寫標題和內容，點擊「發佈」
2. JavaScript 發送 POST 請求到 `/api/posts`
3. 伺服器驗證 session（檢查是否登入）
4. 呼叫 `createPost()` 寫入資料庫
5. 回傳成功訊息，前端重新載入貼文列表

### 5.2 按讚流程

1. 使用者點擊愛心圖示
2. JavaScript 發送 POST 請求到 `/api/posts/:id/like`
3. 伺服器檢查是否已按讚
4. 若已按讚：刪除 likes 資料表中記錄
5. 若未按讚：新增 likes 資料表記錄
6. 回傳目前按讚狀態，前端更新 UI

---

## 6. 安全性考量

1. **密碼雜湊**：使用 PBKDF2 + SHA-512 雜湊，避免明文儲存密碼
2. **SQL 注入防護**：使用參數化查詢 `db.prepare()` 與 `stmt.bind()`
3. **XSS 防護**：使用 `escapeHtml()` 轉義輸出內容
4. **Session 管理**：設定 secret 金鑰和過期時間
5. **權限驗證**：編輯/刪除/按讚等操作需先登入

---

## 7. 技術堆疊

| 層面 | 技術 |
|------|------|
| 後端框架 | Express.js |
| 資料庫 | SQLite (sql.js) |
| 密碼雜湊 | Node.js crypto (PBKDF2 + SHA-512) |
| Session | express-session |
| 前端 | 原生 HTML + CSS + JavaScript |
| 執行環境 | Node.js |

---

## 8. 檔案結構

```
blog/
├── server.js        # Express 伺服器與 API
├── database.js       # 資料庫操作
├── blog.db          # SQLite 資料庫檔案
├── package.json     # 專案依賴
└── public/
    ├── index.html   # 主頁面
    ├── style.css   # 樣式
    └── script.js   # 前端邏輯
```
