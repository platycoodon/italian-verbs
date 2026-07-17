// API 通信层 — 所有后端调用集中在这里

// 后端地址：开发时用 localhost，部署后改成线上地址
const API_BASE = localStorage.getItem('api_base_url') || 'http://localhost:3001';

// ── 辅助 ──
function getToken() {
  return localStorage.getItem('auth_token');
}

function setToken(token) {
  if (token) localStorage.setItem('auth_token', token);
  else localStorage.removeItem('auth_token');
}

async function request(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = 'Bearer ' + token;

  const res = await fetch(API_BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '网络错误' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// ── 练习 ──

export async function getQuestion(tense, verbType) {
  return request('POST', '/api/practice/question', { tense, verbType });
}

export async function checkAnswer(verbInfinitive, tenseId, personId, gender, userAnswer) {
  return request('POST', '/api/practice/check', {
    verbInfinitive, tenseId, personId, gender, userAnswer
  });
}

// ── 认证 ──

export async function register(email, password, name) {
  const data = await request('POST', '/api/auth/register', { email, password, name });
  if (data.token) setToken(data.token);
  return data;
}

export async function login(email, password) {
  const data = await request('POST', '/api/auth/login', { email, password });
  if (data.token) setToken(data.token);
  return data;
}

export async function getMe() {
  return request('GET', '/api/auth/me');
}

export function logout() {
  setToken(null);
}

export function isLoggedIn() {
  return !!getToken();
}

// ── 错题本（云端同步，未登录时用 localStorage 兜底）──

export async function getErrors() {
  if (!isLoggedIn()) return [];
  return request('GET', '/api/errors');
}

export async function addError(record) {
  if (!isLoggedIn()) return null;
  return request('POST', '/api/errors', record);
}

export async function deleteError(id) {
  if (!isLoggedIn()) return;
  return request('DELETE', `/api/errors/${id}`);
}

export async function clearAllErrors() {
  if (!isLoggedIn()) return;
  return request('DELETE', '/api/errors');
}

// ── 工具 ──

export function getApiBase() { return API_BASE; }

export { setToken, getToken };
