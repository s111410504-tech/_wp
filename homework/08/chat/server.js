const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const db = new sqlite3.Database('./social.db');

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    nickname TEXT,
    avatar TEXT DEFAULT ''
  )`);
  
  db.run(`CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id INTEGER,
    receiver_id INTEGER,
    content TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  
  db.run(`CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    content TEXT,
    image TEXT DEFAULT '',
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  
  db.run(`CREATE TABLE IF NOT EXISTS user_profile (
    user_id INTEGER PRIMARY KEY,
    bio TEXT DEFAULT '',
    favorite_genre TEXT DEFAULT ''
  )`);
  
  db.run(`CREATE TABLE IF NOT EXISTS likes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER,
    user_id INTEGER,
    UNIQUE(post_id, user_id)
  )`);
  
  db.run(`CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER,
    user_id INTEGER,
    content TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
});

app.post('/api/register', (req, res) => {
  const { username, password, nickname } = req.body;
  db.run(`INSERT INTO users (username, password, nickname) VALUES (?, ?, ?)`, 
    [username, password, nickname], 
    function(err) {
      if (err) return res.json({ success: false, message: '使用者名稱已存在' });
      res.json({ success: true, userId: this.lastID });
    }
  );
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  db.get(`SELECT * FROM users WHERE username = ?`, [username], (err, user) => {
    if (err || !user || user.password !== password) {
      return res.json({ success: false, message: '使用者名稱或密碼錯誤' });
    }
    res.json({ success: true, user });
  });
});

app.get('/api/users', (req, res) => {
  db.all(`SELECT id, nickname, avatar FROM users`, (err, users) => {
    res.json(users);
  });
});

app.get('/api/user/:userId', (req, res) => {
  const { userId } = req.params;
  db.get(`SELECT id, nickname FROM users WHERE id = ?`, [userId], (err, user) => {
    if (err || !user) return res.json(null);
    res.json(user);
  });
});

app.get('/api/user-posts/:userId', (req, res) => {
  const { userId } = req.params;
  db.all(`SELECT p.*, u.nickname, u.avatar FROM posts p 
    JOIN users u ON p.user_id = u.id 
    WHERE p.user_id = ? 
    ORDER BY p.timestamp DESC`, [userId], (err, posts) => {
      if (err) return res.json([]);
      
      const postIds = posts.map(p => p.id);
      if (postIds.length === 0) return res.json(posts);
      
      const placeholders = postIds.map(() => '?').join(',');
      
      db.all(`SELECT post_id, COUNT(*) as count FROM likes WHERE post_id IN (${placeholders}) GROUP BY post_id`, postIds, (err, likesCounts) => {
        const likesMap = {};
        likesCounts.forEach(l => likesMap[l.post_id] = l.count);
        
        db.all(`SELECT l.post_id, l.user_id, u.nickname FROM likes l JOIN users u ON l.user_id = u.id WHERE l.post_id IN (${placeholders})`, postIds, (err, likes) => {
          const likedMap = {};
          likes.forEach(l => {
            if (!likedMap[l.post_id]) likedMap[l.post_id] = [];
            likedMap[l.post_id].push({ user_id: l.user_id, nickname: l.nickname });
          });
          
          const postsWithData = posts.map(p => ({
            ...p,
            likes_count: likesMap[p.id] || 0,
            liked_users: likedMap[p.id] || []
          }));
          
          res.json(postsWithData);
        });
      });
    }
  );
});

app.post('/api/messages', (req, res) => {
  const { sender_id, receiver_id, content } = req.body;
  db.run(`INSERT INTO messages (sender_id, receiver_id, content) VALUES (?, ?, ?)`,
    [sender_id, receiver_id, content],
    function(err) {
      if (err) return res.json({ success: false });
      res.json({ success: true, id: this.lastID });
    }
  );
});

app.get('/api/messages/:user1/:user2', (req, res) => {
  const { user1, user2 } = req.params;
  db.all(`SELECT * FROM messages WHERE 
    (sender_id = ? AND receiver_id = ?) OR 
    (sender_id = ? AND receiver_id = ?) 
    ORDER BY timestamp ASC`, 
    [user1, user2, user2, user1],
    (err, messages) => {
      res.json(messages);
    }
  );
});

app.get('/api/conversations/:userId', (req, res) => {
  const { userId } = req.params;
  db.all(`SELECT DISTINCT 
    CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END as partner_id,
    (SELECT content FROM messages WHERE 
      (sender_id = ? AND receiver_id = partner_id) OR 
      (sender_id = partner_id AND receiver_id = ?)
      ORDER BY timestamp DESC LIMIT 1) as last_message,
    (SELECT timestamp FROM messages WHERE 
      (sender_id = ? AND receiver_id = partner_id) OR 
      (sender_id = partner_id AND receiver_id = ?)
      ORDER BY timestamp DESC LIMIT 1) as last_time
    FROM messages 
    WHERE sender_id = ? OR receiver_id = ?`,
    [userId, userId, userId, userId, userId, userId, userId],
    (err, conversations) => {
      res.json(conversations);
    }
  );
});

app.post('/api/posts', (req, res) => {
  const { user_id, content, image } = req.body;
  db.run(`INSERT INTO posts (user_id, content, image) VALUES (?, ?, ?)`, [user_id, content || '', image || ''],
    function(err) {
      if (err) return res.json({ success: false });
      res.json({ success: true, id: this.lastID });
    }
  );
});

app.put('/api/profile', (req, res) => {
  const { user_id, bio, favorite_genre } = req.body;
  db.run(`INSERT OR REPLACE INTO user_profile (user_id, bio, favorite_genre) VALUES (?, ?, ?)`,
    [user_id, bio || '', favorite_genre || ''],
    function(err) {
      if (err) return res.json({ success: false });
      res.json({ success: true });
    }
  );
});

app.get('/api/profile/:userId', (req, res) => {
  const { userId } = req.params;
  db.get(`SELECT * FROM user_profile WHERE user_id = ?`, [userId], (err, profile) => {
    res.json(profile || { bio: '', favorite_genre: '' });
  });
});

app.get('/api/posts/:userId', (req, res) => {
  const { userId } = req.params;
  db.all(`SELECT p.*, u.nickname, u.avatar FROM posts p 
    JOIN users u ON p.user_id = u.id 
    WHERE p.user_id = ? 
    ORDER BY p.timestamp DESC`, [userId], (err, posts) => {
      res.json(posts);
    }
  );
});

app.get('/api/all-posts', (req, res) => {
  db.all(`SELECT p.*, u.nickname, u.avatar FROM posts p 
    JOIN users u ON p.user_id = u.id 
    ORDER BY p.timestamp DESC`, (err, posts) => {
      if (err) return res.json([]);
      
      const postIds = posts.map(p => p.id);
      if (postIds.length === 0) return res.json(posts);
      
      const placeholders = postIds.map(() => '?').join(',');
      
      db.all(`SELECT post_id, COUNT(*) as count FROM likes WHERE post_id IN (${placeholders}) GROUP BY post_id`, postIds, (err, likesCounts) => {
        const likesMap = {};
        likesCounts.forEach(l => likesMap[l.post_id] = l.count);
        
        db.all(`SELECT l.post_id, l.user_id, u.nickname FROM likes l JOIN users u ON l.user_id = u.id WHERE l.post_id IN (${placeholders})`, postIds, (err, likes) => {
          const likedMap = {};
          likes.forEach(l => {
            if (!likedMap[l.post_id]) likedMap[l.post_id] = [];
            likedMap[l.post_id].push({ user_id: l.user_id, nickname: l.nickname });
          });
          
          const postsWithData = posts.map(p => ({
            ...p,
            likes_count: likesMap[p.id] || 0,
            liked_users: likedMap[p.id] || []
          }));
          
          res.json(postsWithData);
        });
      });
    }
  );
});

app.post('/api/like', (req, res) => {
  const { post_id, user_id } = req.body;
  db.run(`INSERT OR IGNORE INTO likes (post_id, user_id) VALUES (?, ?)`, [post_id, user_id], function(err) {
    if (err) return res.json({ success: false });
    res.json({ success: true });
  });
});

app.post('/api/unlike', (req, res) => {
  const { post_id, user_id } = req.body;
  db.run(`DELETE FROM likes WHERE post_id = ? AND user_id = ?`, [post_id, user_id], function(err) {
    res.json({ success: true });
  });
});

app.get('/api/comments/:postId', (req, res) => {
  const { postId } = req.params;
  db.all(`SELECT c.*, u.nickname FROM comments c 
    JOIN users u ON c.user_id = u.id 
    WHERE c.post_id = ? 
    ORDER BY c.timestamp ASC`, [postId], (err, comments) => {
      res.json(comments);
    }
  );
});

app.post('/api/comments', (req, res) => {
  const { post_id, user_id, content } = req.body;
  db.run(`INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)`, [post_id, user_id, content], function(err) {
    if (err) return res.json({ success: false });
    res.json({ success: true, id: this.lastID });
  });
});

app.delete('/api/posts/:postId', (req, res) => {
  const { postId } = req.params;
  const { user_id } = req.body;
  
  db.run(`DELETE FROM posts WHERE id = ? AND user_id = ?`, [postId, user_id], function(err) {
    if (err) return res.json({ success: false });
    db.run(`DELETE FROM likes WHERE post_id = ?`, [postId]);
    db.run(`DELETE FROM comments WHERE post_id = ?`, [postId]);
    res.json({ success: true });
  });
});

const typingStatus = {};

app.post('/api/typing', (req, res) => {
  const { sender_id, receiver_id, is_typing } = req.body;
  typingStatus[receiver_id] = typingStatus[receiver_id] || {};
  typingStatus[receiver_id][sender_id] = is_typing;
  res.json({ success: true });
});

app.get('/api/typing/:userId/:partnerId', (req, res) => {
  const { userId, partnerId } = req.params;
  const isTyping = typingStatus[userId]?.[partnerId] || false;
  res.json({ is_typing: isTyping });
});

app.get('/api/latest-messages/:user1/:user2/:lastId', (req, res) => {
  const { user1, user2, lastId } = req.params;
  const sinceId = parseInt(lastId) || 0;
  db.all(`SELECT * FROM messages WHERE 
    ((sender_id = ? AND receiver_id = ?) OR 
    (sender_id = ? AND receiver_id = ?))
    AND id > ?
    ORDER BY timestamp ASC`, 
    [user1, user2, user2, user1, sinceId],
    (err, messages) => {
      res.json(messages);
    }
  );
});

app.listen(PORT, () => {
  console.log(`伺服器运行中: http://localhost:${PORT}`);
});