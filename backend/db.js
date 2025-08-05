const mysql = require('mysql2');
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'xkg123xkg123A',
  database: 'ticketing',
  connectionLimit: 10
});
module.exports = pool.promise();
