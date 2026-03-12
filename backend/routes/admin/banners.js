// routes/admin/banners.js
const express = require('express')
const router = express.Router()
const db = require('../../db')
const adminAuth = require('../adminAuth')
const multer = require('multer')

const upload = multer({ dest: 'public/uploads/' })

router.post('/upload', adminAuth, upload.single('file'), (req, res) => {
  const url = `http://localhost:3000/public/uploads/${req.file.filename}`
  res.send({ status: 0, url })
})


// 列表
router.get('/list', adminAuth, (req, res) => {
  const sql = `
    SELECT id, image_url, link_type, link_value,
           sort_order, status, created_at
    FROM banners
    ORDER BY sort_order DESC, id DESC
  `
  db.query(sql, (err, rows) => {
    if (err) return res.cc(err)
    res.send({
      status: 0,
      message: '获取 Banner 列表成功',
      data: rows
    })
  })
})

// 新增
router.post('/create', adminAuth, (req, res) => {
  const {
    image_url,
    link_type,
    link_value,
    sort_order = 0,
    status = 1
  } = req.body

  const sql = `
    INSERT INTO banners
      (image_url, link_type, link_value, sort_order, status)
    VALUES (?,?,?,?,?)
  `
  db.query(
    sql,
    [image_url, link_type, link_value, sort_order, status],
    (err, result) => {
      if (err) return res.cc(err)
      res.send({
        status: 0,
        message: '新增 Banner 成功',
        data: { id: result.insertId }
      })
    }
  )
})

// 更新
router.post('/update/:id', adminAuth, (req, res) => {
  const id = req.params.id
  const {
    image_url,
    link_type,
    link_value,
    sort_order = 0,
    status = 1
  } = req.body

  const sql = `
    UPDATE banners
    SET image_url = ?, link_type = ?, link_value = ?,
        sort_order = ?, status = ?
    WHERE id = ?
  `
  db.query(
    sql,
    [image_url, link_type, link_value, sort_order, status, id],
    (err) => {
      if (err) return res.cc(err)
      res.send({ status: 0, message: '更新 Banner 成功' })
    }
  )
})

// 删除
router.post('/delete/:id', adminAuth, (req, res) => {
  const id = req.params.id
  const sql = 'DELETE FROM banners WHERE id = ?'
  db.query(sql, [id], (err) => {
    if (err) return res.cc(err)
    res.send({ status: 0, message: '删除 Banner 成功' })
  })
})

module.exports = router
