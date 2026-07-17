// 路由：练习（出题 + 判题）

import { Router } from 'express';
import { conjugate, isIrregular, generateQuestion } from '../lib/conjugator.js';
import { findVerb } from '../lib/verbs.js';

const router = Router();

// POST /api/practice/question — 生成一道题
router.post('/question', (req, res) => {
  try {
    const { tense, verbType } = req.body || {};
    const q = generateQuestion({ tense: tense || undefined, verbType: verbType || 'all' });

    res.json({
      verbInfinitive: q.verb.i,
      tenseId: q.tenseId,
      tenseLabel: q.tenseLabel,
      person: q.person,
      gender: q.gender,
      answer: q.answer
    });
  } catch (err) {
    console.error('question error:', err);
    res.status(500).json({ error: '出题失败' });
  }
});

// POST /api/practice/check — 检查答案
router.post('/check', (req, res) => {
  try {
    const { verbInfinitive, tenseId, personId, gender, userAnswer } = req.body || {};
    if (!verbInfinitive || !tenseId || !personId || userAnswer === undefined) {
      return res.status(400).json({ error: '参数不完整' });
    }

    const verb = findVerb(verbInfinitive);
    if (!verb) {
      return res.status(404).json({ error: '找不到该动词' });
    }

    const correctAnswer = conjugate(verb, tenseId, personId, gender);
    const isCorrect = userAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();

    res.json({ isCorrect, correctAnswer });
  } catch (err) {
    console.error('check error:', err);
    res.status(500).json({ error: '检查答案失败' });
  }
});

export default router;
