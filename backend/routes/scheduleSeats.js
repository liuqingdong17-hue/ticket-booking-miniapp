const express = require('express')
const router = express.Router()
const db = require('../db')

// 获取某场次的所有区域和座位信息
router.get('/schedules/:schedule_id/seats', (req, res) => {
  const { schedule_id } = req.params

  // 查询所有区域
  const areaSql = `
    SELECT id AS area_id, name AS area_name, position_x, position_y, width, height
    FROM venue_areas
    WHERE venue_id IN (
      SELECT venue_id FROM performance_schedules WHERE id = ?
    )
  `

  db.query(areaSql, [schedule_id], (err, areas) => {
    if (err) return res.cc(err)

    if (areas.length === 0) {
      return res.send({ status: 0, message: '暂无区域数据', data: [] })
    }

    // 查询座位 + 状态 + 价格
    const seatSql = `
      SELECT s.id, s.area_id, s.row_no, s.seat_no, s.position_x, s.position_y,
             ss.price, ss.status
      FROM seats s
      JOIN schedule_seats ss ON s.id = ss.seat_id
      WHERE ss.schedule_id = ?
      ORDER BY s.area_id, s.row_no, s.seat_no
    `

    db.query(seatSql, [schedule_id], (err2, seats) => {
      if (err2) return res.cc(err2)

      // 将座位分配到对应区域
      const result = areas.map(area => ({
        ...area,
        seats: seats
          .filter(seat => seat.area_id === area.area_id)
          .map(seat => ({
            id: seat.id,
            row_no: seat.row_no,
            seat_no: seat.seat_no,
            x: seat.position_x,
            y: seat.position_y,
            price: seat.price,
            status: seat.status
          }))
      }))

      res.send({
        status: 0,
        message: '获取座位数据成功',
        data: result
      })
    })
  })
})

module.exports = router
