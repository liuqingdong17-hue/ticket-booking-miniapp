const express = require('express');
const router = express.Router();
const db = require('../db');

// 获取某场次的票档
router.get('/:schedule_id', (req, res) => {
  const { schedule_id } = req.params;

  const sql = `
    SELECT id, name, price, stock
    FROM ticket_types
    WHERE schedule_id = ?
    ORDER BY price ASC
  `;

  db.query(sql, [schedule_id], (err, results) => {
    if (err) return res.cc('数据库错误');
    
    res.send({
      status: 0,
      message: "获取票档成功",
      data: results
    });
  });
});

module.exports = router;
