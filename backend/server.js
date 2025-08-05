const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

const db = mysql.createConnection({
  host: 'localhost',
  user: 'your_username',    // 替换为您的MySQL用户名
  password: 'your_password', // 替换为您的MySQL密码
  database: 'ticket_system'  // 替换为您的数据库名
});

db.connect((err) => {
  if (err) throw err;
  console.log('Connected to MySQL');
  db.query('CREATE TABLE IF NOT EXISTS performances (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255), date VARCHAR(255), venue VARCHAR(255))');
  db.query('CREATE TABLE IF NOT EXISTS orders (id INT AUTO_INCREMENT PRIMARY KEY, performance_id INT, seat VARCHAR(255), name VARCHAR(255), phone VARCHAR(255), status VARCHAR(255))');
});

app.get('/api/performances', (req, res) => {
  db.query('SELECT * FROM performances', (err, results) => {
    if (err) throw err;
    res.json(results);
  });
});

app.get('/api/performances/:id', (req, res) => {
  db.query('SELECT * FROM performances WHERE id = ?', [req.params.id], (err, results) => {
    if (err) throw err;
    res.json(results[0]);
  });
});

app.post('/api/orders', (req, res) => {
  const { performanceId, seat, name, phone } = req.body;
  db.query('INSERT INTO orders (performance_id, seat, name, phone, status) VALUES (?, ?, ?, ?, ?)', [performanceId, seat, name, phone, 'pending'], (err) => {
    if (err) throw err;
    res.json({ message: 'Order created', orderId: db.insertId });
  });
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});