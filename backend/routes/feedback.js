const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middlewares/auth');
const upload = require('../middlewares/upload');

// 上传图片
router.post('/upload', upload.array('images', 5), (req, res) => {
  const files = req.files.map(f => '/public/uploads/feedback/' + f.filename);
  res.send({
    status: 0,
    message: '上传成功',
    data: files
  });
});

// 提交意见反馈
router.post('/submit', auth, (req, res) => {
  const user_id = req.user.userId;
  const { type, content, phone, images } = req.body;

  const sql = `
    INSERT INTO feedbacks (user_id, type, content, phone, images)
    VALUES (?, ?, ?, ?, ?)
  `;

  db.query(sql, [
    user_id,
    type,
    content,
    phone,
    JSON.stringify(images || [])
  ], (err) => {
    if (err) return res.cc(err);

    res.send({
      status: 0,
      message: '反馈提交成功'
    });
  });
});

module.exports = router;
