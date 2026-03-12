const express = require('express');
const router = express.Router();
const db = require('../../db');
const adminAuth = require('../adminAuth');

// 获取聊天记录
router.get('/messages/:userId', adminAuth, (req, res) => {
  const userId = req.params.userId;

  const sql = `
    SELECT id, sender, message, created_at, is_read
    FROM customer_service_messages
    WHERE user_id = ?
    ORDER BY id ASC
  `;

  db.query(sql, [userId], (err, rows) => {
    if (err) return res.cc(err);

    // ⭐ 清除未读消息（用户消息 & 仅未读）
    const updateSql = `
      UPDATE customer_service_messages
      SET is_read = 1
      WHERE user_id = ? AND sender = 'user' AND is_read = 0
    `;

    db.query(updateSql, [userId], () => {});

    res.send({ status: 0, data: rows });
  });
});

// 管理员发送消息
router.post('/send', adminAuth, (req, res) => {
  const { user_id, text } = req.body;

  if (!text || !text.trim()) return res.cc("消息不能为空");

  const sql = `
    INSERT INTO customer_service_messages (user_id, sender, message, is_read)
    VALUES (?, 'admin', ?, 1)
  `;

  db.query(sql, [user_id, text], (err) => {
    if (err) return res.cc(err);

    res.send({ status: 0, message: "发送成功" });
  });
});

module.exports = router;
