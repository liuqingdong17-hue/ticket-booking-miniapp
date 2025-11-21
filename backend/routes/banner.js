const express = require('express')
const router = express.Router()
const db = require('../db')

// 获取所有上架的轮播图
router.get('/banners', (req, res) => {
  const sql = 'SELECT * FROM banners WHERE status = 1 ORDER BY sort_order DESC, created_at DESC'
  db.query(sql, (err, results) => {
    if (err) return res.cc(err)
    res.send({
      status: 0,
      message: '获取轮播图成功',
      data: results
    })
  })
})

module.exports = router
