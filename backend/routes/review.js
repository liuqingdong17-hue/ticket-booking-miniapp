const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middlewares/auth');

router.post('/add', auth, (req, res) => {
  const user_id = req.user.userId;
  const { order_id, performance_id, rating, content } = req.body;

  if (!order_id || !performance_id || !rating)
    return res.cc("缺少必要参数");

  const sqlCheck = `
    SELECT id FROM orders 
    WHERE id = ? AND user_id = ? AND status = 'paid'
  `;
  db.query(sqlCheck, [order_id, user_id], (err, rows) => {
    if (err) return res.cc(err);
    if (rows.length === 0) return res.cc("订单不存在或无权限");

    const sqlInsert = `
      INSERT INTO performance_reviews 
      (order_id, user_id, performance_id, rating, content)
      VALUES (?, ?, ?, ?, ?)
    `;
    db.query(sqlInsert, [
      order_id, user_id, performance_id, rating, content || ""
    ], (err2) => {
      if (err2) return res.cc("你已经评论过此订单");

      res.send({
        status: 0,
        message: "评价成功"
      });
    });
  });
});

router.get('/list/:id', (req, res) => {
  const performance_id = req.params.id;

  const sql = `
    SELECT r.rating, r.content, r.created_at, u.username
    FROM performance_reviews r
    JOIN users u ON r.user_id = u.id
    WHERE r.performance_id = ?
    ORDER BY r.id DESC
  `;

  db.query(sql, [performance_id], (err, rows) => {
    if (err) return res.cc(err);

    res.send({
      status: 0,
      data: rows
    });
  });
});

module.exports = router;