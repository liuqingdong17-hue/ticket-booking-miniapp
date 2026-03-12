// backend/routes/adminAuth.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// 管理员登录
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.cc('用户名或密码不能为空');
  }

  const sql = 'SELECT * FROM admins WHERE username = ? LIMIT 1';

  db.query(sql, [username], (err, results) => {
    if (err) return res.cc(err);
    if (results.length === 0) return res.cc('管理员不存在');

    const admin = results[0];

    // 假设 admins 表里存的是 bcrypt 加密后的密码
    const pwdOk = bcrypt.compareSync(password, admin.password);
    if (!pwdOk) {
      return res.cc('密码错误');
    }

    // 生成 admin token
    const tokenStr = jwt.sign(
      {
        adminId: admin.id,
        username: admin.username,
        role: 'admin'
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.send({
      status: 0,
      message: '管理员登录成功',
      data: {
        token: tokenStr,
        admin: {
          id: admin.id,
          username: admin.username
        }
      }
    });
  });
});

module.exports = router;
