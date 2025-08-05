const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const SECRET = 'ticketing_secret';

// 管理员登录
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const [admins] = await db.query(
    `SELECT * FROM admins WHERE username = ?`,
    [username]
  );
  if (admins.length === 0) {
    return res.status(400).json({ message: '用户不存在' });
  }
  const admin = admins[0];
  const isMatch = await bcrypt.compare(password, admin.password);
  if (!isMatch) {
    return res.status(400).json({ message: '密码错误' });
  }
  const token = jwt.sign({ id: admin.id, role: admin.role }, SECRET, { expiresIn: '2h' });
  res.json({ token });
});

module.exports = router;
