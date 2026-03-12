// backend/scripts/hash_admin_password.js  管理员账号
const db = require('../db');
const bcrypt = require('bcryptjs');

const username = 'admin1';
const plain = '123456';

const hash = bcrypt.hashSync(plain, 10);

db.query(
  'UPDATE admins SET password=? WHERE username=?',
  [hash, username],
  (err, res) => {
    if (err) {
      console.error('更新失败：', err);
      process.exit(1);
    }
    console.log('更新成功：', res);
    process.exit(0);
  }
);
