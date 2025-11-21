const express = require('express')
const router = express.Router()
const db = require('../db')

// 获取某个演出的所有场次
router.get('/:performance_id', (req, res) => {
  const { performance_id } = req.params
  if (!performance_id || isNaN(performance_id)) {
    return res.cc('演出ID无效', 1)
  }

  const sql = `
    SELECT 
      s.id,
      DATE_FORMAT(s.schedule_time, '%Y-%m-%d') AS date,
      DATE_FORMAT(s.schedule_time, '%H:%i') AS time,
      v.name AS venue_name
    FROM performance_schedules s
    JOIN performances p ON s.performance_id = p.id
    JOIN venues v ON p.venue_id = v.id
    WHERE s.performance_id = ?
    ORDER BY s.schedule_time ASC
  `

  db.query(sql, [performance_id], (err, results) => {
    if (err) {
      console.error('数据库错误:', err)
      return res.cc('数据库查询失败', 1)
    }

    if (results.length === 0) {
      return res.cc('暂无场次信息', 1)
    }

    res.send({
      status: 0,
      message: '获取场次成功',
      data: results
    })
  })
})

// 获取单个场次详情
router.get('/detail/:schedule_id', (req, res) => {
  const { schedule_id } = req.params
  if (!schedule_id || isNaN(schedule_id)) {
    return res.cc('场次ID无效', 1)
  }

  const sql = `
    SELECT 
      s.id,
      DATE_FORMAT(s.schedule_time, '%Y-%m-%d') AS date,
      DATE_FORMAT(s.schedule_time, '%H:%i') AS time,
      s.duration,
      v.name AS venue_name,
      v.address AS venue_address,
      t.price AS price
    FROM performance_schedules s
    JOIN performances p ON s.performance_id = p.id
    JOIN venues v ON p.venue_id = v.id
    LEFT JOIN ticket_types t ON t.schedule_id = s.id
    WHERE s.id = ?
    LIMIT 1
  `

  db.query(sql, [schedule_id], (err, results) => {
    if (err) {
      console.error('数据库错误:', err)
      return res.cc('数据库查询失败', 1)
    }

    if (results.length === 0) {
      return res.cc('场次不存在', 1)
    }

    const data = results[0]
    res.send({
      status: 0,
      message: '获取场次详情成功',
      data
    })
  })
})

module.exports = router
