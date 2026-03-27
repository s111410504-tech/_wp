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
const myPostsBtn = document.getElementById('my-posts-btn');
const showRegisterBtn = document.getElementById('show-register-btn');
const showLoginBtn = document.getElementById('show-login-btn');
const cancelBtn = document.getElementById('cancel-btn');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const loginFormContainer = document.getElementById('login-form-container');
const registerFormContainer = document.getElementById('register-form-container');
const loginError = document.getElementById('login-error');
const registerError = document.getElementById('register-error');

const myPostsSection = document.getElementById('my-posts-section');
const myPostsContainer = document.getElementById('my-posts-container');
const userPostsSection = document.getElementById('user-posts-section');
const userPostsContainer = document.getElementById('user-posts-container');
const userPostsTitle = document.getElementById('user-posts-title');

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
      <span class="user-info">@${currentUser.username}</span>
      <button id="new-post-btn" class="nav-btn post-action">發佈</button>
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
  myPostsSection.classList.remove('active');
  userPostsSection.classList.remove('active');
  showPostsBtn.classList.remove('active');
  myPostsBtn.classList.remove('active');
  section.classList.add('active');
  if (section === postsSection) {
    showPostsBtn.classList.add('active');
  } else if (section === myPostsSection) {
    myPostsBtn.classList.add('active');
  }
}

async function loadPosts() {
  try {
    const response = await fetch(`${API_URL}/posts`);
    const posts = await response.json();
    postsContainer.innerHTML = posts.map(post => {
      const liked = currentUser && post.liked_by_user;
      const reposted = currentUser && post.reposted_by_user;
      return `
      <div class="post-card">
        <div class="post-header">
          <a href="#" class="author-link" data-user-id="${post.user_id}">
            <span class="post-author-name">${escapeHtml(post.author)}</span>
          </a>
          <span class="post-author-handle">@${escapeHtml(post.author)}</span>
          <span class="post-time">· ${formatTime(post.created_at)}</span>
        </div>
        ${post.title ? `<div class="post-title">${escapeHtml(post.title)}</div>` : ''}
        <div class="post-content">${escapeHtml(post.content)}</div>
        <div class="post-actions">
          <button class="post-action-btn reply-btn" data-post-id="${post.id}" onclick="event.stopPropagation(); showReplyBox(${post.id})">
            <span>💬</span> <span>${post.replies_count || 0}</span>
          </button>
          <button class="post-action-btn repost-btn ${reposted ? 'active' : ''}" data-post-id="${post.id}" onclick="event.stopPropagation(); repostPost(${post.id})">
            <span>🔁</span> <span>${post.reposts_count || 0}</span>
          </button>
          <button class="post-action-btn like-btn ${liked ? 'active' : ''}" data-post-id="${post.id}" onclick="event.stopPropagation(); likePost(${post.id})">
            <span>${liked ? '❤️' : '🤍'}</span> <span>${post.likes_count || 0}</span>
          </button>
          ${currentUser && currentUser.id === post.user_id ? `
            <button class="post-action-btn delete" onclick="event.stopPropagation(); deletePost(${post.id})">
              <span>🗑️</span>
            </button>
            <button class="post-action-btn" onclick="event.stopPropagation(); editPost(${post.id})">
              <span>✏️</span>
            </button>
          ` : ''}
        </div>
        <div class="reply-box" id="reply-box-${post.id}" style="display:none;">
          <textarea class="reply-content" id="reply-content-${post.id}" placeholder="回覆..." rows="2"></textarea>
          <button class="btn" onclick="submitReply(${post.id})">回覆</button>
        </div>
        <div class="replies-container" id="replies-${post.id}"></div>
      </div>
    `}).join('');
    
    document.querySelectorAll('.author-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const userId = link.dataset.userId;
        loadUserPosts(userId);
      });
    });
  } catch (error) {
    console.error('Error loading posts:', error);
  }
}

async function loadMyPosts() {
  if (!currentUser) return;
  try {
    const response = await fetch(`${API_URL}/users/${currentUser.id}/posts`);
    const posts = await response.json();
    myPostsContainer.innerHTML = posts.map(post => `
      <div class="post-card">
        <div class="post-header">
          <span class="post-author-name">${escapeHtml(post.author)}</span>
          <span class="post-author-handle">@${escapeHtml(post.author)}</span>
          <span class="post-time">· ${formatTime(post.created_at)}</span>
        </div>
        ${post.title ? `<div class="post-title">${escapeHtml(post.title)}</div>` : ''}
        <div class="post-content">${escapeHtml(post.content)}</div>
        <div class="post-actions">
          <button class="post-action-btn delete" onclick="deletePost(${post.id})">
            <span>🗑️</span>
          </button>
          <button class="post-action-btn" onclick="editPost(${post.id})">
            <span>✏️</span>
          </button>
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Error loading my posts:', error);
  }
}

async function loadUserPosts(userId) {
  try {
    const userResponse = await fetch(`${API_URL}/users/${userId}`);
    const user = await userResponse.json();
    userPostsTitle.innerHTML = `<a href="#" onclick="showSection(postsSection); loadPosts(); return false;" class="author-link">← 返回</a> @${user.username} 的貼文`;
    
    const response = await fetch(`${API_URL}/users/${userId}/posts`);
    const posts = await response.json();
    userPostsContainer.innerHTML = posts.map(post => `
      <div class="post-card">
        <div class="post-header">
          <span class="post-author-name">${escapeHtml(post.author)}</span>
          <span class="post-author-handle">@${escapeHtml(post.author)}</span>
          <span class="post-time">· ${formatTime(post.created_at)}</span>
        </div>
        ${post.title ? `<div class="post-title">${escapeHtml(post.title)}</div>` : ''}
        <div class="post-content">${escapeHtml(post.content)}</div>
        <div class="post-actions">
          <button class="post-action-btn reply-btn" data-post-id="${post.id}" onclick="event.stopPropagation(); showReplyBox(${post.id})">
            <span>💬</span> <span>${post.replies_count || 0}</span>
          </button>
          <button class="post-action-btn repost-btn" data-post-id="${post.id}" onclick="event.stopPropagation(); repostPost(${post.id})">
            <span>🔁</span> <span>${post.reposts_count || 0}</span>
          </button>
          <button class="post-action-btn like-btn" data-post-id="${post.id}" onclick="event.stopPropagation(); likePost(${post.id})">
            <span>🤍</span> <span>${post.likes_count || 0}</span>
          </button>
        </div>
        <div class="reply-box" id="reply-box-${post.id}" style="display:none;">
          <textarea class="reply-content" id="reply-content-${post.id}" placeholder="回覆..." rows="2"></textarea>
          <button class="btn" onclick="submitReply(${post.id})">回覆</button>
        </div>
        <div class="replies-container" id="replies-${post.id}"></div>
      </div>
    `).join('');
    showSection(userPostsSection);
  } catch (error) {
    console.error('Error loading user posts:', error);
  }
}

function formatTime(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = (now - date) / 1000;
  
  if (diff < 60) return '剛剛';
  if (diff < 3600) return `${Math.floor(diff / 60)}分鐘`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}小時`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}天`;
  return date.toLocaleDateString('zh-TW');
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
      if (currentUser) loadMyPosts();
    } else {
      const data = await response.json();
      alert(data.error || '刪除失敗');
    }
  }
}

async function likePost(postId) {
  if (!currentUser) {
    alert('請先登入');
    return;
  }
  const btn = document.querySelector(`.like-btn[data-post-id="${postId}"]`);
  const response = await fetch(`${API_URL}/posts/${postId}/like`, { method: 'POST' });
  if (response.ok) {
    const data = await response.json();
    if (data.liked) {
      btn.classList.add('active');
      btn.innerHTML = `<span>❤️</span> <span>${parseInt(btn.querySelector('span:last-child').textContent) + 1}</span>`;
    } else {
      btn.classList.remove('active');
      btn.innerHTML = `<span>🤍</span> <span>${parseInt(btn.querySelector('span:last-child').textContent) - 1}</span>`;
    }
  }
}

async function repostPost(postId) {
  if (!currentUser) {
    alert('請先登入');
    return;
  }
  const btn = document.querySelector(`.repost-btn[data-post-id="${postId}"]`);
  const response = await fetch(`${API_URL}/posts/${postId}/repost`, { method: 'POST' });
  if (response.ok) {
    btn.classList.add('active');
    btn.innerHTML = `<span>🔁</span> <span>${parseInt(btn.querySelector('span:last-child').textContent) + 1}</span>`;
    alert('已轉推');
  }
}

function showReplyBox(postId) {
  const replyBox = document.getElementById(`reply-box-${postId}`);
  replyBox.style.display = replyBox.style.display === 'none' ? 'block' : 'none';
  if (replyBox.style.display === 'block') {
    loadReplies(postId);
  }
}

async function loadReplies(postId) {
  try {
    const response = await fetch(`${API_URL}/posts/${postId}/replies`);
    const replies = await response.json();
    const container = document.getElementById(`replies-${postId}`);
    container.innerHTML = replies.map(reply => `
      <div class="reply-item">
        <span class="post-author-name">${escapeHtml(reply.author)}</span>
        <span class="post-content">${escapeHtml(reply.content)}</span>
      </div>
    `).join('');
  } catch (error) {
    console.error('Error loading replies:', error);
  }
}

async function submitReply(postId) {
  if (!currentUser) {
    alert('請先登入');
    return;
  }
  const content = document.getElementById(`reply-content-${postId}`).value;
  if (!content.trim()) {
    alert('請輸入內容');
    return;
  }
  const response = await fetch(`${API_URL}/posts/${postId}/reply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content })
  });
  if (response.ok) {
    document.getElementById(`reply-content-${postId}`).value = '';
    loadReplies(postId);
    loadPosts();
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
    if (currentUser) loadMyPosts();
  } else {
    const result = await response.json();
    alert(result.error);
  }
});

showPostsBtn.addEventListener('click', () => showSection(postsSection));

myPostsBtn.addEventListener('click', () => {
  if (!currentUser) {
    alert('請先登入');
    showSection(authSectionMain);
    return;
  }
  loadMyPosts();
  showSection(myPostsSection);
});

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
