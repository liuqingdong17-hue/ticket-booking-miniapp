// routes/admin/coupons.js
const express = require('express')
const router = express.Router()
const db = require('../../db')
const adminAuth = require('../adminAuth')

// 列表
router.get('/list', adminAuth, (req, res) => {
  const sql = `
    SELECT id, title, discount_type, discount_value,
           min_amount, start_time, end_time, status, stock, created_at
    FROM coupons
    ORDER BY id DESC
  `
  db.query(sql, (err, rows) => {
    if (err) return res.cc(err)
    res.send({
      status: 0,
      message: '获取优惠券列表成功',
      data: rows
    })
  })
})

// 新增
router.post('/create', adminAuth, (req, res) => {
  const {
    title,
    discount_type,
    discount_value,
    min_amount = 0,
    start_time,
    end_time,
    stock = 0,
    status = 1
  } = req.body

  const sql = `
    INSERT INTO coupons
      (title, discount_type, discount_value, min_amount,
       start_time, end_time, stock, status)
    VALUES (?,?,?,?,?,?,?,?)
  `
  db.query(
    sql,
    [title, discount_type, discount_value, min_amount,
      start_time, end_time, stock, status],
    (err, result) => {
      if (err) return res.cc(err)
      res.send({
        status: 0,
        message: '新增优惠券成功',
        data: { id: result.insertId }
      })
    }
  )
})

// 更新
router.post('/update/:id', adminAuth, (req, res) => {
  const id = req.params.id
  const {
    title,
    discount_type,
    discount_value,
    min_amount = 0,
    start_time,
    end_time,
    stock = 0,
    status = 1
  } = req.body

  const sql = `
    UPDATE coupons
    SET title = ?, discount_type = ?, discount_value = ?,
        min_amount = ?, start_time = ?, end_time = ?,
        stock = ?, status = ?
    WHERE id = ?
  `
  db.query(
    sql,
    [title, discount_type, discount_value,
      min_amount, start_time, end_time, stock, status, id],
    (err) => {
      if (err) return res.cc(err)
      res.send({ status: 0, message: '更新优惠券成功' })
    }
  )
})

// 删除
router.post('/delete/:id', adminAuth, (req, res) => {
  const id = req.params.id

  const sql = 'DELETE FROM coupons WHERE id = ?'
  db.query(sql, [id], (err) => {
    if (err) return res.cc(err)

    // 删掉和活动的关联
    const delLink = 'DELETE FROM activity_coupons WHERE coupon_id = ?'
    db.query(delLink, [id], () => {})

    res.send({ status: 0, message: '删除优惠券成功' })
  })
})

module.exports = router
