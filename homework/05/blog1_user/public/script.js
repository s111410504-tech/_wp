const API_URL = '/api';

const authSectionMain = document.getElementById('auth-section-main');
const postsSection = document.getElementById('posts-section');
const newPostSection = document.getElementById('new-post-section');
const authNav = document.getElementById('auth-section');
const postsContainer = document.getElementById('posts-container');
const postForm = document.getElementById('post-form');
const postIdInput = document.getElementById('post-id');
const postTitleInput = document.getElementById('post-title');
const postContentInput = document.getElementById('post-content');
const showPostsBtn = document.getElementById('show-posts-btn');
const showRegisterBtn = document.getElementById('show-register-btn');
const showLoginBtn = document.getElementById('show-login-btn');
const cancelBtn = document.getElementById('cancel-btn');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const loginFormContainer = document.getElementById('login-form-container');
const registerFormContainer = document.getElementById('register-form-container');
const loginError = document.getElementById('login-error');
const registerError = document.getElementById('register-error');

let currentUser = null;

async function checkAuth() {
  const response = await fetch(`${API_URL}/user`);
  const data = await response.json();
  if (data.loggedIn) {
    currentUser = data.user;
    updateAuthUI();
    showSection(postsSection);
  } else {
    currentUser = null;
    updateAuthUI();
    showSection(authSectionMain);
  }
}

function updateAuthUI() {
  if (currentUser) {
    authNav.innerHTML = `
      <span class="user-info">歡迎, ${currentUser.username}</span>
      <button id="new-post-btn" class="nav-btn post-action">撰寫文章</button>
      <button id="logout-btn" class="nav-btn logout">登出</button>
    `;
    document.getElementById('new-post-btn').addEventListener('click', () => {
      postForm.reset();
      postIdInput.value = '';
      showSection(newPostSection);
    });
    document.getElementById('logout-btn').addEventListener('click', logout);
  } else {
    authNav.innerHTML = '';
  }
}

function showSection(section) {
  authSectionMain.classList.remove('active');
  postsSection.classList.remove('active');
  newPostSection.classList.remove('active');
  showPostsBtn.classList.remove('active');
  section.classList.add('active');
  if (section === postsSection) {
    showPostsBtn.classList.add('active');
  }
}

async function loadPosts() {
  try {
    const response = await fetch(`${API_URL}/posts`);
    const posts = await response.json();
    postsContainer.innerHTML = posts.map(post => `
      <div class="post-card">
        <h3>${escapeHtml(post.title)}</h3>
        <p class="meta">作者: ${escapeHtml(post.author)} | ${new Date(post.created_at).toLocaleString('zh-TW')}</p>
        <p class="content">${escapeHtml(post.content)}</p>
        ${currentUser && currentUser.id === post.user_id ? `
          <div class="actions">
            <button class="btn primary" onclick="editPost(${post.id})">編輯</button>
            <button class="btn danger" onclick="deletePost(${post.id})">刪除</button>
          </div>
        ` : ''}
      </div>
    `).join('');
  } catch (error) {
    console.error('Error loading posts:', error);
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

async function editPost(id) {
  try {
    const response = await fetch(`${API_URL}/posts/${id}`);
    const post = await response.json();
    postIdInput.value = post.id;
    postTitleInput.value = post.title;
    postContentInput.value = post.content;
    showSection(newPostSection);
  } catch (error) {
    console.error('Error loading post:', error);
  }
}

async function deletePost(id) {
  if (confirm('確定要刪除這篇文章嗎？')) {
    const response = await fetch(`${API_URL}/posts/${id}`, { method: 'DELETE' });
    if (response.ok) {
      loadPosts();
    } else {
      alert('刪除失敗');
    }
  }
}

async function logout() {
  await fetch(`${API_URL}/logout`, { method: 'POST' });
  currentUser = null;
  updateAuthUI();
  showSection(authSectionMain);
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.textContent = '';
  const username = document.getElementById('login-username').value;
  const password = document.getElementById('login-password').value;
  
  const response = await fetch(`${API_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  
  if (response.ok) {
    const user = await response.json();
    currentUser = user;
    updateAuthUI();
    showSection(postsSection);
    loadPosts();
    loginForm.reset();
  } else {
    const data = await response.json();
    loginError.textContent = data.error;
  }
});

registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  registerError.textContent = '';
  const username = document.getElementById('register-username').value;
  const password = document.getElementById('register-password').value;
  
  const response = await fetch(`${API_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  
  if (response.ok) {
    const user = await response.json();
    currentUser = user;
    updateAuthUI();
    showSection(postsSection);
    loadPosts();
    registerForm.reset();
  } else {
    const data = await response.json();
    registerError.textContent = data.error;
  }
});

postForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = postIdInput.value;
  const data = {
    title: postTitleInput.value,
    content: postContentInput.value
  };

  const url = id ? `${API_URL}/posts/${id}` : `${API_URL}/posts`;
  const method = id ? 'PUT' : 'POST';

  const response = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  if (response.ok) {
    postForm.reset();
    postIdInput.value = '';
    showSection(postsSection);
    loadPosts();
  } else {
    const result = await response.json();
    alert(result.error);
  }
});

showPostsBtn.addEventListener('click', () => showSection(postsSection));

showRegisterBtn.addEventListener('click', () => {
  loginFormContainer.style.display = 'none';
  registerFormContainer.style.display = 'block';
  loginError.textContent = '';
  registerError.textContent = '';
});

showLoginBtn.addEventListener('click', () => {
  loginFormContainer.style.display = 'block';
  registerFormContainer.style.display = 'none';
  loginError.textContent = '';
  registerError.textContent = '';
});

cancelBtn.addEventListener('click', () => {
  postForm.reset();
  postIdInput.value = '';
  showSection(postsSection);
});

checkAuth();
