// 路由：错题本 CRUD

import { Router } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { getErrors, addError, removeError, clearErrors } from '../lib/db.js';
import { JWT_SECRET } from './auth.js';

const router = Router();

// 中间件：解析登录 token（可选——不登录也能用，但错题只存在本地）
function getUserId(req) {
  try {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) return null;
    const token = auth.slice(7);
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded.userId;
  } catch { return null; }
}

// GET /api/errors — 获取错题列表
router.get('/', (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.json([]);
  res.json(getErrors(userId));
});

// POST /api/errors — 添加一条错题
router.post('/', (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: '请先登录' });

  try {
    const { verbInfinitive, tenseId, tenseLabel, personId, personLabel, gender, userAnswer, correctAnswer } = req.body;
    if (!verbInfinitive || !tenseId || !personId || !userAnswer || !correctAnswer) {
      return res.status(400).json({ error: '参数不完整' });
    }

    const id = crypto.randomUUID();
    addError({ id, userId, verbInfinitive, tenseId, tenseLabel, personId, personLabel, gender, userAnswer, correctAnswer });
    res.status(201).json({ id });
  } catch (err) {
    console.error('add error:', err);
    res.status(500).json({ error: '添加错题失败' });
  }
});

// DELETE /api/errors/:id — 删除一条错题（重做正确后）
router.delete('/:id', (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: '请先登录' });
  removeError(req.params.id);
  res.json({ ok: true });
});

// DELETE /api/errors — 清空所有错题
router.delete('/', (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: '请先登录' });
  clearErrors(userId);
  res.json({ ok: true });
});

export default router;
