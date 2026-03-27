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

function getAllPosts() {
  const stmt = db.prepare(`
    SELECT posts.*, users.username as author 
    FROM posts 
    JOIN users ON posts.user_id = users.id 
    ORDER BY posts.created_at DESC
  `);
  const posts = [];
  while (stmt.step()) {
    posts.push(stmt.getAsObject());
  }
  stmt.free();
  return posts;
}

function getPostById(id) {
  const stmt = db.prepare(`
    SELECT posts.*, users.username as author 
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

module.exports = { 
  initDB, createUser, verifyUser, getUserByUsername,
  getAllPosts, getPostById, createPost, updatePost, deletePost 
};
