const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json());

// 引入路由
const performancesRoutes = require('./routes/performances');
const ordersRoutes = require('./routes/orders');
const adminRoutes = require('./routes/admin');

app.use('/api/performances', performancesRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/admin', adminRoutes);
// 设置 public/images 为静态资源目录
app.use('/images', express.static(path.join(__dirname, 'public/images'),{setHeaders: (res) => console.log('Serving:', res.req.url)
}));

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
