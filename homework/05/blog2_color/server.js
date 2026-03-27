const express = require('express');
const session = require('express-session');
const path = require('path');
const { initDB, createUser, verifyUser, getAllPosts, getPostById, createPost, updatePost, deletePost } = require('./database');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: 'blog-secret-key-2024',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

app.get('/api/user', (req, res) => {
  if (req.session.user) {
    res.json({ loggedIn: true, user: req.session.user });
  } else {
    res.json({ loggedIn: false });
  }
});

app.post('/api/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  if (username.length < 3 || password.length < 6) {
    return res.status(400).json({ error: 'Username must be 3+ chars, password must be 6+ chars' });
  }
  const id = createUser(username, password);
  if (id) {
    req.session.user = { id, username };
    res.status(201).json({ id, username });
  } else {
    res.status(400).json({ error: 'Username already exists' });
  }
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = verifyUser(username, password);
  if (user) {
    req.session.user = user;
    res.json(user);
  } else {
    res.status(401).json({ error: 'Invalid username or password' });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ message: 'Logged out' });
});

app.get('/api/posts', (req, res) => {
  const posts = getAllPosts();
  res.json(posts);
});

app.get('/api/posts/:id', (req, res) => {
  const post = getPostById(parseInt(req.params.id));
  if (post) {
    res.json(post);
  } else {
    res.status(404).json({ error: 'Post not found' });
  }
});

app.post('/api/posts', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Please login first' });
  }
  const { title, content } = req.body;
  if (!title || !content) {
    return res.status(400).json({ error: 'Title and content are required' });
  }
  const id = createPost(req.session.user.id, title, content);
  res.status(201).json({ id, title, content });
});

app.put('/api/posts/:id', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Please login first' });
  }
  const { title, content } = req.body;
  if (!title || !content) {
    return res.status(400).json({ error: 'Title and content are required' });
  }
  const success = updatePost(parseInt(req.params.id), title, content, req.session.user.id);
  if (success) {
    res.json({ id: req.params.id, title, content });
  } else {
    res.status(404).json({ error: 'Post not found or not authorized' });
  }
});

app.delete('/api/posts/:id', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Please login first' });
  }
  const success = deletePost(parseInt(req.params.id), req.session.user.id);
  if (success) {
    res.json({ message: 'Post deleted' });
  } else {
    res.status(404).json({ error: 'Post not found or not authorized' });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

async function start() {
  await initDB();
  app.listen(PORT, () => {
    console.log(`Blog server running at http://localhost:${PORT}`);
  });
}

start();
