// db.js
const mysql = require('mysql2');

// 创建基础连接池（兼容旧版 callback 风格）
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'xkg123xkg123A',
  database: 'ticketing',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// ✅ 新增：Promise 风格连接池（支持 async/await）
pool.promisePool = pool.promise();

module.exports = pool;
