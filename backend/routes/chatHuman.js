const express = require('express');
const router = express.Router();
const db = require('../db');
const userAuth = require('../middlewares/auth');

router.post('/human/user-message', userAuth, (req, res) => {
  console.log("👉 POST user-message", req.body, req.user);

  const user_id = req.user.userId;
  const { text } = req.body;

  if (!text || !text.trim()) return res.cc("消息不能为空");

  const sql = `
    INSERT INTO customer_service_messages (user_id, sender, message)
    VALUES (?, 'user', ?)
  `;

  db.query(sql, [user_id, text], (err, result) => {
    if (err) {
      console.error("❌ 插入失败", err);
      return res.cc(err);
    }
    res.send({ status: 0, message: "发送成功" });
  });
});

router.get('/human/messages', userAuth, (req, res) => {
  console.log("👉 GET human/messages", req.user);

  const user_id = req.user.userId;

  const sql = `
    SELECT id, sender, message, created_at
    FROM customer_service_messages
    WHERE user_id = ?
    ORDER BY id ASC
  `;

  db.query(sql, [user_id], (err, rows) => {
    if (err) {
      console.error("❌ 查询失败", err);
      return res.cc(err);
    }
    res.send({ status: 0, data: rows });
  });
});

module.exports = router;
