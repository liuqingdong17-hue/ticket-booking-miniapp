// routes/admin/activities.js
const express = require('express')
const router = express.Router()
const db = require('../../db')
const adminAuth = require('../adminAuth')
const multer = require('multer')


/* =========================================================
   ⭐ 活动封面上传
   POST /admin/activities/upload
========================================================= */
const upload = multer({
  dest: 'public/uploads/'
})
router.post(
  '/upload',
  adminAuth,
  upload.single('file'),
  (req, res) => {
    if (!req.file) return res.cc('未上传文件')

    const url = `http://localhost:3000/public/uploads/${req.file.filename}`

    res.send({
      status: 0,
      url
    })
  }
)


// 获取活动列表
router.get('/list', adminAuth, (req, res) => {
  const sql = `
    SELECT id, title, cover_image, description,
           start_time, end_time, status, detail_content, created_at
    FROM activities
    ORDER BY id DESC
  `
  db.query(sql, (err, rows) => {
    if (err) return res.cc(err)
    res.send({
      status: 0,
      message: '获取活动列表成功',
      data: rows
    })
  })
})

// 新增活动
router.post('/create', adminAuth, (req, res) => {
  const {
    title,
    cover_image,
    description,
    start_time,
    end_time,
    status = 1,
    detail_content = ''
  } = req.body

  const sql = `
    INSERT INTO activities
      (title, cover_image, description, start_time, end_time, status, detail_content)
    VALUES (?,?,?,?,?,?,?)
  `
  db.query(
    sql,
    [title, cover_image, description, start_time, end_time, status, detail_content],
    (err, result) => {
      if (err) return res.cc(err)
      res.send({
        status: 0,
        message: '新增活动成功',
        data: { id: result.insertId }
      })
    }
  )
})

// 更新活动
router.post('/update/:id', adminAuth, (req, res) => {
  const id = req.params.id
  const {
    title,
    cover_image,
    description,
    start_time,
    end_time,
    status = 1,
    detail_content = ''
  } = req.body

  const sql = `
    UPDATE activities
    SET title = ?, cover_image = ?, description = ?,
        start_time = ?, end_time = ?, status = ?, detail_content = ?
    WHERE id = ?
  `
  db.query(
    sql,
    [title, cover_image, description, start_time, end_time, status, detail_content, id],
    (err) => {
      if (err) return res.cc(err)
      res.send({ status: 0, message: '更新活动成功' })
    }
  )
})

// 删除活动
router.post('/delete/:id', adminAuth, (req, res) => {
  const id = req.params.id

  const sql = 'DELETE FROM activities WHERE id = ?'
  db.query(sql, [id], (err) => {
    if (err) return res.cc(err)

    // 顺手清掉活动和优惠券关联
    const delLink = 'DELETE FROM activity_coupons WHERE activity_id = ?'
    db.query(delLink, [id], () => {})

    res.send({ status: 0, message: '删除活动成功' })
  })
})

// 获取“活动已绑定的优惠券 ID 列表”
router.get('/:id/coupons', adminAuth, (req, res) => {
  const activityId = req.params.id
  const sql = `
    SELECT coupon_id
    FROM activity_coupons
    WHERE activity_id = ?
  `
  db.query(sql, [activityId], (err, rows) => {
    if (err) return res.cc(err)
    const ids = rows.map(r => r.coupon_id)
    res.send({
      status: 0,
      data: ids
    })
  })
})

// 保存活动绑定的优惠券
router.post('/:id/coupons/save', adminAuth, (req, res) => {
  const activityId = req.params.id
  const { coupon_ids = [] } = req.body

  // 先删旧的
  const delSql = 'DELETE FROM activity_coupons WHERE activity_id = ?'
  db.query(delSql, [activityId], (err) => {
    if (err) return res.cc(err)

    if (!coupon_ids.length) {
      return res.send({ status: 0, message: '已清空活动优惠券' })
    }

    // 再插新的
    const placeholders = coupon_ids.map(() => '(?, ?)').join(',')
    const params = []
    coupon_ids.forEach(id => {
      params.push(activityId, id)
    })

    const insertSql = `
      INSERT INTO activity_coupons (activity_id, coupon_id)
      VALUES ${placeholders}
    `
    db.query(insertSql, params, (err2) => {
      if (err2) return res.cc(err2)
      res.send({ status: 0, message: '保存活动优惠券成功' })
    })
  })
})

module.exports = router
