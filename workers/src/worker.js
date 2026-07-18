// Cloudflare Workers — 意大利语动词变位 API
// 依赖：D1 数据库（绑定名 DB）

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { findVerb } from './verbs.js';
import { conjugate, generateQuestion } from './conjugator.js';

const JWT_SECRET = 'italian-verbs-worker-secret-change-in-production';
const ALLOWED_ORIGINS = [
  'https://platycoodon.github.io',
  'http://localhost:3000',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://localhost:3001'
];

// ── CORS ──
function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json'
  };
}

function json(data, status = 200, origin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: corsHeaders(origin)
  });
}

function error(msg, status = 400, origin) {
  return json({ error: msg }, status, origin);
}

// ── JWT 辅助 ──
function getUserId(request) {
  try {
    const auth = request.headers.get('Authorization');
    if (!auth || !auth.startsWith('Bearer ')) return null;
    const token = auth.slice(7);
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded.userId;
  } catch {
    return null;
  }
}

// ── 路由分发 ──
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    const origin = request.headers.get('Origin') || '';
    const headers = corsHeaders(origin);

    // 预检请求
    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers });
    }

    try {
      const body = ['POST', 'PUT', 'PATCH'].includes(method)
        ? await request.json().catch(() => ({}))
        : {};

      // ── 健康检查 ──
      if (path === '/api/health' && method === 'GET') {
        return json({ status: 'ok', time: new Date().toISOString() });
      }

      // ── 出题 POST /api/practice/question ──
      if (path === '/api/practice/question' && method === 'POST') {
        const { tense, verbType } = body;
        const q = generateQuestion({ tense: tense || undefined, verbType: verbType || 'all' });
        return json({
          verbInfinitive: q.verb.i,
          tenseId: q.tenseId,
          tenseLabel: q.tenseLabel,
          person: q.person,
          gender: q.gender,
          answer: q.answer
        });
      }

      // ── 判题 POST /api/practice/check ──
      if (path === '/api/practice/check' && method === 'POST') {
        const { verbInfinitive, tenseId, personId, gender, userAnswer } = body;
        if (!verbInfinitive || !tenseId || !personId || userAnswer === undefined) {
          return error('参数不完整');
        }
        const verb = findVerb(verbInfinitive);
        if (!verb) return error('找不到该动词', 404);
        const correctAnswer = conjugate(verb, tenseId, personId, gender);
        const isCorrect = String(userAnswer).trim().toLowerCase() === correctAnswer.trim().toLowerCase();
        return json({ isCorrect, correctAnswer });
      }

      // ── 注册 POST /api/auth/register ──
      if (path === '/api/auth/register' && method === 'POST') {
        const { email, password, name } = body;
        if (!email || !password) return error('邮箱和密码不能为空');
        if (password.length < 4) return error('密码至少 4 位');

        const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
        if (existing) return error('该邮箱已注册', 409);

        const id = crypto.randomUUID();
        const hashed = await bcrypt.hash(password, 10);
        await env.DB.prepare(
          'INSERT INTO users (id, email, password, name) VALUES (?, ?, ?, ?)'
        ).bind(id, email, hashed, name || '').run();

        const token = jwt.sign({ userId: id }, JWT_SECRET, { expiresIn: '30d' });
        return json({ token, user: { id, email, name: name || '' } }, 201);
      }

      // ── 登录 POST /api/auth/login ──
      if (path === '/api/auth/login' && method === 'POST') {
        const { email, password } = body;
        if (!email || !password) return error('邮箱和密码不能为空');

        const user = await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first();
        if (!user) return error('邮箱或密码错误', 401);

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return error('邮箱或密码错误', 401);

        const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' });
        return json({ token, user: { id: user.id, email: user.email, name: user.name } });
      }

      // ── 个人信息 GET /api/auth/me ──
      if (path === '/api/auth/me' && method === 'GET') {
        const userId = getUserId(request);
        if (!userId) return error('未登录', 401);

        const user = await env.DB.prepare('SELECT id, email, name, created_at FROM users WHERE id = ?').bind(userId).first();
        if (!user) return error('用户不存在', 401);
        return json({ user });
      }

      // ── 获取错题 GET /api/errors ──
      if (path === '/api/errors' && method === 'GET') {
        const userId = getUserId(request);
        if (!userId) return json([]);
        const { results } = await env.DB.prepare(
          'SELECT * FROM errors WHERE user_id = ? ORDER BY created_at DESC'
        ).bind(userId).all();
        return json(results || []);
      }

      // ── 添加错题 POST /api/errors ──
      if (path === '/api/errors' && method === 'POST') {
        const userId = getUserId(request);
        if (!userId) return error('请先登录', 401);

        const { verbInfinitive, tenseId, tenseLabel, personId, personLabel, gender, userAnswer, correctAnswer } = body;
        if (!verbInfinitive || !tenseId || !personId || !userAnswer || !correctAnswer) {
          return error('参数不完整');
        }

        const id = crypto.randomUUID();
        await env.DB.prepare(
          'INSERT INTO errors (id, user_id, verb_infinitive, tense_id, tense_label, person_id, person_label, gender, user_answer, correct_answer) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        ).bind(id, userId, verbInfinitive, tenseId, tenseLabel, personId, personLabel, gender || 'm', userAnswer, correctAnswer).run();

        return json({ id }, 201);
      }

      // ── 删除一条错题 DELETE /api/errors/:id ──
      if (path.match(/^\/api\/errors\/[\w-]+$/) && method === 'DELETE') {
        const userId = getUserId(request);
        if (!userId) return error('请先登录', 401);
        const errId = path.split('/').pop();
        await env.DB.prepare('DELETE FROM errors WHERE id = ? AND user_id = ?').bind(errId, userId).run();
        return json({ ok: true });
      }

      // ── 清空错题 DELETE /api/errors ──
      if (path === '/api/errors' && method === 'DELETE') {
        const userId = getUserId(request);
        if (!userId) return error('请先登录', 401);
        await env.DB.prepare('DELETE FROM errors WHERE user_id = ?').bind(userId).run();
        return json({ ok: true });
      }

      // ── 404 ──
      return json({ error: 'Not found' }, 404);

    } catch (err) {
      console.error('Worker error:', err);
      return json({ error: '服务器内部错误' }, 500);
    }
  }
};
