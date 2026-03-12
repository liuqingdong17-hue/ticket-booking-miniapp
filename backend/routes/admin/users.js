const express = require("express");
const router = express.Router();
const db = require("../../db");
const adminAuth = require("../adminAuth");

// ==========================
// 获取用户列表（带反馈数 + 未读消息数）
// ==========================
router.get("/list", adminAuth, (req, res) => {
  const sql = `
    SELECT
      u.id,
      u.username,
      u.phone,
      u.created_at,
      COALESCE(f.count, 0) AS feedback_count,
      COALESCE(c.unread, 0) AS unread_messages
    FROM users u
    LEFT JOIN (
      SELECT user_id, COUNT(*) AS count
      FROM feedbacks
      GROUP BY user_id
    ) f ON u.id = f.user_id
    LEFT JOIN (
      SELECT user_id, COUNT(*) AS unread
      FROM customer_service_messages
      WHERE sender = 'user' AND is_read = 0   -- ⭐ 只统计未读
      GROUP BY user_id
    ) c ON u.id = c.user_id
    ORDER BY u.id DESC;
  `;

  db.query(sql, (err, rows) => {
    if (err) return res.cc(err);

    res.send({
      status: 0,
      message: "获取用户列表成功",
      data: rows,
    });
  });
});

// 获取用户详情
router.get("/detail/:id", adminAuth, (req, res) => {
  const user_id = req.params.id;

  const sqlUser = `
    SELECT id, username, phone, created_at
    FROM users
    WHERE id = ?
  `;

  const sqlFeedbacks = `
    SELECT id, type, content, images, created_at
    FROM feedbacks
    WHERE user_id = ?
    ORDER BY id DESC
  `;

  const sqlMessages = `
    SELECT id, sender, message, created_at, is_read
    FROM customer_service_messages
    WHERE user_id = ?
    ORDER BY id ASC
  `;

  db.query(sqlUser, [user_id], (err, userRows) => {
    if (err) return res.cc(err);

    db.query(sqlFeedbacks, [user_id], (err2, feedbackRows) => {
      if (err2) return res.cc(err2);

      db.query(sqlMessages, [user_id], (err3, messageRows) => {
        if (err3) return res.cc(err3);

        res.send({
          status: 0,
          data: {
            user: userRows[0],
            feedbacks: feedbackRows.map(f => ({
              ...f,
              images: JSON.parse(f.images || "[]")
            })),
            messages: messageRows
          }
        });
      });
    });
  });
});

module.exports = router;
