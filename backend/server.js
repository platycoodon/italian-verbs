// 入口：Express 服务器

import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import practiceRoutes from './routes/practice.js';
import errorsRoutes from './routes/errors.js';

const app = express();
const PORT = process.env.PORT || 3001;

// ── 中间件 ──
app.use(cors({
  origin: [  // 允许的前端域名
    'https://platycoodon.github.io',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5500',
    'http://127.0.0.1:5500'
  ],
  credentials: true
}));
app.use(express.json());

// ── 路由 ──
app.use('/api/auth', authRoutes);
app.use('/api/practice', practiceRoutes);
app.use('/api/errors', errorsRoutes);

// ── 健康检查 ──
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// ── 启动 ──
app.listen(PORT, () => {
  console.log(`✅ Italian Verbs API running on http://localhost:${PORT}`);
});
