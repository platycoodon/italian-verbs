// 路由：认证（注册 / 登录 / 个人信息）

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { createUser, findUserByEmail, findUserById } from '../lib/db.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'italian-verbs-dev-secret-change-in-production';

function generateId() {
  return crypto.randomUUID();
}

// POST /api/auth/register
router.post('/register', (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: '邮箱和密码不能为空' });
    }
    if (password.length < 4) {
      return res.status(400).json({ error: '密码至少 4 位' });
    }

    const existing = findUserByEmail(email);
    if (existing) {
      return res.status(409).json({ error: '该邮箱已注册' });
    }

    const hashed = bcrypt.hashSync(password, 10);
    const id = generateId();
    createUser({ id, email, password: hashed, name });

    const token = jwt.sign({ userId: id }, JWT_SECRET, { expiresIn: '30d' });
    res.status(201).json({ token, user: { id, email, name: name || '' } });
  } catch (err) {
    console.error('register error:', err);
    res.status(500).json({ error: '注册失败' });
  }
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: '邮箱和密码不能为空' });
    }

    const user = findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: '邮箱或密码错误' });
    }

    const valid = bcrypt.compareSync(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: '邮箱或密码错误' });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
  } catch (err) {
    console.error('login error:', err);
    res.status(500).json({ error: '登录失败' });
  }
});

// GET /api/auth/me
router.get('/me', (req, res) => {
  try {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) {
      return res.status(401).json({ error: '未登录' });
    }
    const token = auth.slice(7);
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = findUserById(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: '用户不存在' });
    }
    res.json({ user });
  } catch (err) {
    res.status(401).json({ error: '登录已过期，请重新登录' });
  }
});

export default router;
export { JWT_SECRET };
