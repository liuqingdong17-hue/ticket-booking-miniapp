const express = require("express");
const router = express.Router();
const db = require("../../db");
const adminAuth = require("../../middlewares/adminAuth");

// ============================
// 获取反馈列表
// ============================
router.get("/list", adminAuth, (req, res) => {
  const sql = `
    SELECT f.id, f.type, f.content, f.phone, f.status, f.created_at,
           u.username
    FROM feedbacks f
    LEFT JOIN users u ON f.user_id = u.id
    ORDER BY f.id DESC
  `;

  db.query(sql, (err, rows) => {
    if (err) return res.cc(err);

    res.send({
      status: 0,
      data: rows
    });
  });
});

// ============================
// 查看反馈详情
// ============================
router.get("/detail/:id", adminAuth, (req, res) => {
  const id = req.params.id;

  const sql = `
    SELECT f.*, u.username
    FROM feedbacks f
    LEFT JOIN users u ON f.user_id = u.id
    WHERE f.id = ?
  `;

  db.query(sql, [id], (err, rows) => {
    if (err) return res.cc(err);
    if (!rows.length) return res.cc("反馈不存在");

    const detail = rows[0];
    detail.images = JSON.parse(detail.images || "[]");

    res.send({ status: 0, data: detail });
  });
});

// ============================
// 标记为 已处理
// ============================
router.post("/mark-done/:id", adminAuth, (req, res) => {
  const id = req.params.id;

  const sql = `
    UPDATE feedbacks
    SET status = 'done'
    WHERE id = ?
  `;

  db.query(sql, [id], (err) => {
    if (err) return res.cc(err);

    res.send({ status: 0, message: "已标记为已处理" });
  });
});

module.exports = router;
