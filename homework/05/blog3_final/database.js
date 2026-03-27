const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const dbPath = path.join(__dirname, 'blog.db');
let db;

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
}

async function initDB() {
  const SQL = await initSqlJs();
  
  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      salt TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS likes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      post_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (post_id) REFERENCES posts(id),
      UNIQUE(user_id, post_id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS reposts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      post_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (post_id) REFERENCES posts(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS replies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      post_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (post_id) REFERENCES posts(id)
    )
  `);

  const userResult = db.exec('SELECT COUNT(*) as count FROM users');
  if (userResult.length === 0 || userResult[0].values[0][0] === 0) {
    const salt = crypto.randomBytes(32).toString('hex');
    const hashedPassword = hashPassword('admin123', salt);
    db.run('INSERT INTO users (username, password, salt) VALUES (?, ?, ?)', ['admin', hashedPassword, salt]);
    saveDB();
  }

  const postResult = db.exec('SELECT COUNT(*) as count FROM posts');
  if (postResult.length === 0 || postResult[0].values[0][0] === 0) {
    const user = getUserByUsername('admin');
    if (user) {
      db.run('INSERT INTO posts (user_id, title, content) VALUES (?, ?, ?)', [user.id, '歡迎來到我的部落格', '這是我的第一篇文章！']);
      db.run('INSERT INTO posts (user_id, title, content) VALUES (?, ?, ?)', [user.id, 'Node.js 學習筆記', 'Node.js 是一個 JavaScript 執行環境...']);
    }
    saveDB();
  }
  
  return db;
}

function saveDB() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
}

function createUser(username, password) {
  const existing = getUserByUsername(username);
  if (existing) {
    return null;
  }
  const salt = crypto.randomBytes(32).toString('hex');
  const hashedPassword = hashPassword(password, salt);
  db.run('INSERT INTO users (username, password, salt) VALUES (?, ?, ?)', [username, hashedPassword, salt]);
  const result = db.exec('SELECT last_insert_rowid() as id');
  saveDB();
  return result[0].values[0][0];
}

function getUserByUsername(username) {
  const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
  stmt.bind([username]);
  let user = null;
  if (stmt.step()) {
    user = stmt.getAsObject();
  }
  stmt.free();
  return user;
}

function verifyUser(username, password) {
  const user = getUserByUsername(username);
  if (!user) return null;
  const hashedPassword = hashPassword(password, user.salt);
  if (hashedPassword === user.password) {
    return { id: user.id, username: user.username };
  }
  return null;
}

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
  const posts = [];
  while (stmt.step()) {
    const post = stmt.getAsObject();
    if (currentUserId) {
      post.liked_by_user = hasUserLiked(currentUserId, post.id);
      post.reposted_by_user = hasUserReposted(currentUserId, post.id);
    }
    posts.push(post);
  }
  stmt.free();
  return posts;
}

function getPostById(id) {
  const stmt = db.prepare(`
    SELECT posts.*, users.username as author,
    (SELECT COUNT(*) FROM likes WHERE post_id = posts.id) as likes_count,
    (SELECT COUNT(*) FROM reposts WHERE post_id = posts.id) as reposts_count,
    (SELECT COUNT(*) FROM replies WHERE post_id = posts.id) as replies_count
    FROM posts 
    JOIN users ON posts.user_id = users.id 
    WHERE posts.id = ?
  `);
  stmt.bind([id]);
  let post = null;
  if (stmt.step()) {
    post = stmt.getAsObject();
  }
  stmt.free();
  return post;
}

function createPost(userId, title, content) {
  db.run('INSERT INTO posts (user_id, title, content) VALUES (?, ?, ?)', [userId, title, content]);
  const result = db.exec('SELECT last_insert_rowid() as id');
  saveDB();
  return result[0].values[0][0];
}

function updatePost(id, title, content, userId) {
  db.run('UPDATE posts SET title = ?, content = ? WHERE id = ? AND user_id = ?', [title, content, id, userId]);
  saveDB();
  return db.getRowsModified() > 0;
}

function deletePost(id, userId) {
  db.run('DELETE FROM posts WHERE id = ? AND user_id = ?', [id, userId]);
  saveDB();
  return db.getRowsModified() > 0;
}

function getPostsByUserId(userId) {
  const stmt = db.prepare(`
    SELECT posts.*, users.username as author,
    (SELECT COUNT(*) FROM likes WHERE post_id = posts.id) as likes_count,
    (SELECT COUNT(*) FROM reposts WHERE post_id = posts.id) as reposts_count,
    (SELECT COUNT(*) FROM replies WHERE post_id = posts.id) as replies_count
    FROM posts 
    JOIN users ON posts.user_id = users.id 
    WHERE posts.user_id = ?
    ORDER BY posts.created_at DESC
  `);
  stmt.bind([userId]);
  const posts = [];
  while (stmt.step()) {
    posts.push(stmt.getAsObject());
  }
  stmt.free();
  return posts;
}

function getUserById(userId) {
  const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
  stmt.bind([userId]);
  let user = null;
  if (stmt.step()) {
    user = stmt.getAsObject();
  }
  stmt.free();
  return user;
}

function likePost(userId, postId) {
  try {
    db.run('INSERT OR IGNORE INTO likes (user_id, post_id) VALUES (?, ?)', [userId, postId]);
    saveDB();
    return true;
  } catch (e) {
    return false;
  }
}

function unlikePost(userId, postId) {
  db.run('DELETE FROM likes WHERE user_id = ? AND post_id = ?', [userId, postId]);
  saveDB();
  return true;
}

function getLikesCount(postId) {
  const stmt = db.prepare('SELECT COUNT(*) as count FROM likes WHERE post_id = ?');
  stmt.bind([postId]);
  let count = 0;
  if (stmt.step()) {
    count = stmt.getAsObject().count;
  }
  stmt.free();
  return count;
}

function hasUserLiked(userId, postId) {
  const stmt = db.prepare('SELECT id FROM likes WHERE user_id = ? AND post_id = ?');
  stmt.bind([userId, postId]);
  const liked = stmt.step();
  stmt.free();
  return liked;
}

function repostPost(userId, postId) {
  try {
    db.run('INSERT INTO reposts (user_id, post_id) VALUES (?, ?)', [userId, postId]);
    saveDB();
    return true;
  } catch (e) {
    return false;
  }
}

function getRepostsCount(postId) {
  const stmt = db.prepare('SELECT COUNT(*) as count FROM reposts WHERE post_id = ?');
  stmt.bind([postId]);
  let count = 0;
  if (stmt.step()) {
    count = stmt.getAsObject().count;
  }
  stmt.free();
  return count;
}

function hasUserReposted(userId, postId) {
  const stmt = db.prepare('SELECT id FROM reposts WHERE user_id = ? AND post_id = ?');
  stmt.bind([userId, postId]);
  const reposted = stmt.step();
  stmt.free();
  return reposted;
}

function createReply(userId, postId, content) {
  db.run('INSERT INTO replies (user_id, post_id, content) VALUES (?, ?, ?)', [userId, postId, content]);
  const result = db.exec('SELECT last_insert_rowid() as id');
  saveDB();
  return result[0].values[0][0];
}

function getRepliesByPostId(postId) {
  const stmt = db.prepare(`
    SELECT replies.*, users.username as author 
    FROM replies 
    JOIN users ON replies.user_id = users.id 
    WHERE replies.post_id = ?
    ORDER BY replies.created_at ASC
  `);
  stmt.bind([postId]);
  const replies = [];
  while (stmt.step()) {
    replies.push(stmt.getAsObject());
  }
  stmt.free();
  return replies;
}

function getRepliesCount(postId) {
  const stmt = db.prepare('SELECT COUNT(*) as count FROM replies WHERE post_id = ?');
  stmt.bind([postId]);
  let count = 0;
  if (stmt.step()) {
    count = stmt.getAsObject().count;
  }
  stmt.free();
  return count;
}

module.exports = { 
  initDB, createUser, verifyUser, getUserByUsername, getUserById,
  getAllPosts, getPostById, getPostsByUserId, createPost, updatePost, deletePost,
  likePost, unlikePost, getLikesCount, hasUserLiked,
  repostPost, getRepostsCount, hasUserReposted,
  createReply, getRepliesByPostId, getRepliesCount
};
