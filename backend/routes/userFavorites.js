// routes/userFavorites.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;

const handleError = (res, error, status = 500) => {
  console.error(error);
  res.status(status).json({ error: error.message || '服务器错误' });
};

// ================== 收藏状态切换 ==================
router.post('/toggle', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: '未登录' });

  let userId;
  try {
    userId = jwt.verify(token, JWT_SECRET).userId;
  } catch (err) {
    return res.status(401).json({ error: 'Token无效' });
  }

  const { performance_id: performanceId } = req.body;
  if (!performanceId) return res.status(400).json({ error: '参数错误' });

  // 查询是否已经收藏
  db.query(
    'SELECT 1 FROM user_favorites WHERE user_id = ? AND performance_id = ?',
    [userId, performanceId],
    (err, rows) => {
      if (err) return handleError(res, err);

      if (rows.length > 0) {
        // 已收藏 → 执行取消
        db.query(
          'DELETE FROM user_favorites WHERE user_id = ? AND performance_id = ?',
          [userId, performanceId],
          (err) => {
            if (err) return handleError(res, err);
            res.json({ status: 0, message: '已取消想看', isFavorite: false });
          }
        );
      } else {
        // 未收藏 → 执行添加
        db.query(
          'INSERT INTO user_favorites (user_id, performance_id) VALUES (?, ?)',
          [userId, performanceId],
          (err) => {
            if (err) return handleError(res, err);
            res.status(201).json({ status: 0, message: '已添加到想看', isFavorite: true });
          }
        );
      }
    }
  );
});

// ================== 检查收藏状态 ==================
router.get('/:performanceId', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: '未登录' });

  let userId;
  try {
    userId = jwt.verify(token, JWT_SECRET).userId;
  } catch (err) {
    return res.status(401).json({ error: 'Token无效' });
  }

  const performanceId = req.params.performanceId;
  db.query(
    'SELECT 1 FROM user_favorites WHERE user_id = ? AND performance_id = ?',
    [userId, performanceId],
    (err, rows) => {
      if (err) return handleError(res, err);
      res.json({ status: 0, isFavorite: rows.length > 0 });
    }
  );
});

module.exports = router;
