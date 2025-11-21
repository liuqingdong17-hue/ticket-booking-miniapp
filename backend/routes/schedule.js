// // routes/schedule.js
// const express = require('express');
// const router = express.Router();
// const db = require('../db');

// // 获取某个演出的全部场次
// router.get('/:performanceId', (req, res) => {
//   const { performanceId } = req.params;

//   const sql = `
//     SELECT 
//       id, 
//       performance_id, 
//       DATE_FORMAT(schedule_time, '%Y-%m-%d %H:%i') AS schedule_time,
//       duration 
//     FROM performance_schedules
//     WHERE performance_id = ?
//     ORDER BY schedule_time ASC
//   `;

//   db.query(sql, [performanceId], (err, results) => {
//     if (err) return res.cc(err);
//     res.send({
//       status: 0,
//       message: '获取演出场次成功',
//       data: results
//     });
//   });
// });

// module.exports = router;
