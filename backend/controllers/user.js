const db = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const auth = require('../middlewares/auth');
const userHandler = require('../controllers/user');


require('dotenv').config();

const verificationCodes = {};

exports.register = (req, res) => {
  const { username, phone, password } = req.body;
  if (!username || !phone || !password) {
    return res.cc('请填写用户名、手机号和密码', 1);
  }
  if (!/^1[3-9]\d{9}$/.test(phone)) {
    return res.cc('手机号必须是11位数字，且以1开头', 1);
  }
  if (password.length < 6 || password.length > 13) {
    return res.cc('密码长度必须为6-13位', 1);
  }

  db.query('SELECT * FROM users WHERE phone = ?', [phone], (err, result) => {
    if (err) return res.cc('数据库错误，请稍后重试', 1);
    if (result.length) {
      return res.cc('该手机号已注册，请直接登录', 1);
    }

    bcrypt.hash(password, 10, (err, hashedPassword) => {
      if (err) return res.cc('密码加密失败，请稍后重试', 1);

      db.query(
        'INSERT INTO users (username, phone, password, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())',
        [username, phone, hashedPassword],
        (insertErr, insertRes) => {
          if (insertErr) return res.cc('注册失败，请稍后重试', 1);
          const userId = insertRes.insertId;
          const token = jwt.sign({ userId, phone }, process.env.JWT_SECRET, { expiresIn: '7d' });
          res.send({ status: 0, message: '注册成功', data: { token, userId } });
        }
      );
    });
  });
};

exports.login = (req, res) => {
  const { phone, password } = req.body;
  if (!phone || !password) {
    return res.cc('请输入手机号和密码', 1);
  }
  if (!/^1[3-9]\d{9}$/.test(phone)) {
    return res.cc('手机号必须是11位数字，且以1开头', 1);
  }
  if (password.length < 6 || password.length > 13) {
    return res.cc('密码长度必须为6-13位', 1);
  }

  db.query('SELECT * FROM users WHERE phone = ?', [phone], (err, result) => {
    if (err) return res.cc('数据库错误，请稍后重试', 1);
    if (!result.length) {
      return res.cc('用户不存在，请先注册', 1);
    }

    const user = result[0];
    bcrypt.compare(password, user.password, (err, isMatch) => {
      if (err) return res.cc('密码验证失败，请稍后重试', 1);
      if (!isMatch) {
        return res.cc('密码错误，请重试', 1);
      }

      const token = jwt.sign({ userId: user.id, phone }, process.env.JWT_SECRET, { expiresIn: '7d' });
      res.send({ status: 0, message: '登录成功', data: { token, userId: user.id } });
    });
  });
};

exports.forgotPassword = (req, res) => {
  const { phone } = req.body;
  if (!phone) {
    return res.cc('请输入手机号', 1);
  }
  if (!/^1[3-9]\d{9}$/.test(phone)) {
    return res.cc('手机号必须是11位数字，且以1开头', 1);
  }

  db.query('SELECT * FROM users WHERE phone = ?', [phone], (err, result) => {
    if (err) return res.cc('数据库错误，请稍后重试', 1);
    if (!result.length) {
      return res.cc('用户不存在，请先注册', 1);
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expire = Date.now() + 5 * 60 * 1000;
    verificationCodes[phone] = { code, expire };
    console.log(`验证码: ${code} (手机号: ${phone})`);
    res.send({ status: 0, message: '验证码已发送（请查看控制台）' });
  });
};

exports.resetPassword = (req, res) => {
  const { phone, code, newPassword } = req.body;
  if (!phone || !code || !newPassword) {
    return res.cc('请输入手机号、验证码和新密码', 1);
  }
  if (!/^1[3-9]\d{9}$/.test(phone)) {
    return res.cc('手机号必须是11位数字，且以1开头', 1);
  }
  if (newPassword.length < 6 || newPassword.length > 13) {
    return res.cc('新密码长度必须为6-13位', 1);
  }

  const stored = verificationCodes[phone];
  if (!stored || stored.code !== code || Date.now() > stored.expire) {
    return res.cc('验证码无效或已过期', 1);
  }

  bcrypt.hash(newPassword, 10, (err, hashedPassword) => {
    if (err) return res.cc('密码加密失败，请稍后重试', 1);

    db.query(
      'UPDATE users SET password = ?, updated_at = NOW() WHERE phone = ?',
      [hashedPassword, phone],
      (err) => {
        if (err) return res.cc('重置密码失败，请稍后重试', 1);
        delete verificationCodes[phone];
        res.send({ status: 0, message: '密码重置成功，请使用新密码登录' });
      }
    );
  });
};

// ✅ 获取当前登录用户信息
exports.getUserInfo = (req, res) => {
  const user_id = req.user?.userId || req.user?.id;
  if (!user_id) return res.cc('未登录或 token 无效', 1);

  const sql = `SELECT id, username, phone FROM users WHERE id = ?`;
  db.query(sql, [user_id], (err, results) => {
    console.log('getUserInfo query:', { user_id, results });  // 加日志
    if (err) return res.cc(err.message, 1);
    if (results.length === 0) return res.cc('用户不存在', 1);

    const user = results[0];
    res.send({
      status: 0,
      message: '获取用户信息成功',
      data: user  // 确保 phone 字段返回
    });
  });
};

// ✅ 获取用户统计信息
exports.getUserStats = (req, res) => {
  const user_id = req.user?.userId || req.user?.id;
  if (!user_id) return res.cc('未登录或 token 无效', 1);

  const sql = `
    SELECT
      (SELECT COUNT(*) FROM user_favorites WHERE user_id = ?) AS want_count,
      (SELECT COUNT(*) FROM user_artist_follows WHERE user_id = ?) AS follow_count,
      (SELECT COUNT(*) FROM user_coupons WHERE user_id = ?) AS coupon_count
  `;

  db.query(sql, [user_id, user_id, user_id], (err, results) => {
    if (err) return res.cc(err.message, 1);
    res.send({
      status: 0,
      message: '获取用户统计成功',
      data: results[0]
    });
  });
};

