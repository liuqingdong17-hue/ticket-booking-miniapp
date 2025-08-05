const express = require('express');
const router = express.Router();
const db = require('../db');

// 创建订单
router.post('/', async (req, res) => {
  const { user_id, performance_id, ticket_type_id, quantity } = req.body;
  // 查询票档
  const [tickets] = await db.query(
    `SELECT price, stock FROM ticket_types WHERE id = ?`,
    [ticket_type_id]
  );
  if (tickets.length === 0) {
    return res.status(400).json({ message: '票档不存在' });
  }
  const ticket = tickets[0];
  if (ticket.stock < quantity) {
    return res.status(400).json({ message: '库存不足' });
  }
  const total_price = ticket.price * quantity;

  // 创建订单
  await db.query(
    `INSERT INTO orders (user_id, performance_id, ticket_type_id, quantity, total_price, order_status)
     VALUES (?, ?, ?, ?, ?, 0)`,
    [user_id, performance_id, ticket_type_id, quantity, total_price]
  );

  // 减库存
  await db.query(
    `UPDATE ticket_types SET stock = stock - ? WHERE id = ?`,
    [quantity, ticket_type_id]
  );

  res.json({ message: '订单创建成功' });
});

// 获取用户订单
router.get('/user/:user_id', async (req, res) => {
  const [rows] = await db.query(
    `SELECT o.*, p.title, p.cover_image, t.name AS ticket_name
     FROM orders o
     JOIN performances p ON o.performance_id = p.id
     JOIN ticket_types t ON o.ticket_type_id = t.id
     WHERE o.user_id = ?
     ORDER BY o.created_at DESC`,
    [req.params.user_id]
  );
  res.json(rows);
});

module.exports = router;
