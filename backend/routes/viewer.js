const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middlewares/auth');

// 获取当前用户的观演人列表
router.get('/list', auth, (req, res) => {
  const user_id = req.user?.userId || req.user?.id;
  if (!user_id) return res.cc('未登录或 token 无效', 1);

  const sql = `SELECT id, name, id_card FROM user_viewers WHERE user_id = ?`;
  db.query(sql, [user_id], (err, results) => {
    if (err) return res.cc(err);
    res.send({
      status: 0,
      message: '获取观演人列表成功',
      data: results
    });
  });
});

// 新增观演人
router.post('/add', auth, (req, res) => {
  const user_id = req.user?.userId || req.user?.id;
  const { name, id_card } = req.body;
  if (!name || !id_card) return res.cc('姓名和身份证号不能为空', 1);

  const sql = `INSERT INTO user_viewers (user_id, name, id_card) VALUES (?, ?, ?)`;
  db.query(sql, [user_id, name, id_card], (err, result) => {
    if (err) return res.cc(err);
    res.send({
      status: 0,
      message: '添加观演人成功',
      data: { id: result.insertId, name, id_card }
    });
  });
});

// 删除观演人
router.post('/delete', auth, (req, res) => {
  const user_id = req.user?.userId || req.user?.id;
  const { id } = req.body;
  if (!id) return res.cc('缺少观演人ID', 1);

  const sql = `DELETE FROM user_viewers WHERE id = ? AND user_id = ?`;
  db.query(sql, [id, user_id], (err, result) => {
    if (err) return res.cc(err);
    if (result.affectedRows === 0) return res.cc('观演人不存在或无权限', 1);
    res.cc('删除成功', 0);
  });
});

module.exports = router;
