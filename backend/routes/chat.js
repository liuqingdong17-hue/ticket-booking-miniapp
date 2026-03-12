const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth");
const db = require("../db");
const aiService = require("../utils/ai-service");


// 🟦 用户发送消息（存入数据库）
router.post("/user", auth, (req, res) => {
  const user_id = req.user.userId;
  const { text } = req.body;

  const userSql = `SELECT username FROM users WHERE id = ?`;

  db.query(userSql, [user_id], (err, result) => {
    if (err || result.length === 0) return res.cc("用户不存在");

    const username = result[0].username;

    // ⚠️ 按你的数据库结构，只能存 user_name，没有 nickname/avatar
    const sql = `
      INSERT INTO chat_messages (user_id, user_name, sender, text, created_at)
      VALUES (?, ?, 'user', ?, NOW())
    `;

    db.query(sql, [user_id, username, text], (err2) => {
      if (err2) return res.cc(err2);
      res.send({ status: 0, message: "用户消息已保存" });
    });
  });
});


// 🟦 AI 回复（存入数据库）
router.post("/ai", auth, async (req, res) => {
  const user_id = req.user.userId;
  const { text } = req.body;

  const reply = await aiService.reply(user_id, text);

  const sql = `
    INSERT INTO chat_messages (user_id, user_name, sender, text, created_at)
    VALUES (?, ?, 'ai', ?, NOW())
  `;

  db.query(sql, [user_id, "智能客服", reply], (err) => {
    if (err) return res.cc(err);
    res.send({ status: 0, reply });
  });
});


// 🟦 管理员回复
router.post("/reply", auth, (req, res) => {
  const { text } = req.body;

  const sql = `
    INSERT INTO chat_messages (user_id, user_name, sender, text, created_at)
    VALUES (0, '管理员', 'admin', ?, NOW())
  `;

  db.query(sql, [text], (err) => {
    if (err) return res.cc(err);
    res.send({ status: 0, message: "管理员已回复" });
  });
});


// 🟦 获取所有消息（管理员）
router.get("/all", auth, (req, res) => {
  const sql = `SELECT * FROM chat_messages ORDER BY id ASC`;

  db.query(sql, (err, results) => {
    if (err) return res.cc(err);
    res.send({ status: 0, data: results });
  });
});


// 🟦 当前用户的聊天记录
router.get("/history", auth, (req, res) => {
  const user_id = req.user.userId;

  const sql = `
    SELECT id, sender, text, user_name, created_at
    FROM chat_messages
    WHERE user_id = ?
    ORDER BY id ASC
  `;

  db.query(sql, [user_id], (err, results) => {
    if (err) return res.cc(err);
    res.send({ status: 0, data: results });
  });
});

module.exports = router;
