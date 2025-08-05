const express = require('express');
const router = express.Router();
const db = require('../db');

// 获取演出列表
router.get('/', async (req, res) => {
  const [rows] = await db.query(`
    SELECT p.*, c.name AS category_name, v.name AS venue_name
    FROM performances p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN venues v ON p.venue_id = v.id
    ORDER BY p.start_time ASC
  `);
  res.json(rows);
});

// 获取演出详情
router.get('/:id', async (req, res) => {
  const [performances] = await db.query(
    `SELECT * FROM performances WHERE id = ?`,
    [req.params.id]
  );
  const [tickets] = await db.query(
    `SELECT * FROM ticket_types WHERE performance_id = ?`,
    [req.params.id]
  );
  res.json({
    performance: performances[0],
    ticketTypes: tickets
  });
});

// 获取票档接口
router.get('/:id/tickets', async (req, res) => {
  const performanceId = req.params.id;

  // 查询该演出的所有票档信息
  const [ticketTypes] = await db.query(
    `SELECT * FROM ticket_types WHERE performance_id = ?`,
    [performanceId]
  );

  if (ticketTypes.length === 0) {
    return res.status(404).json({ message: "没有票档数据" });
  }

  // 返回票档数据
  res.json(ticketTypes);
});

module.exports = router;
