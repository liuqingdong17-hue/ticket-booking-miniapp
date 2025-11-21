require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const db = require('./db'); // 引入数据库配置
require('./tasks/couponCleaner');


// ================== 中间件 ==================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// 静态资源目录：如 http://localhost:3000/public/image.jpg
app.use('/public', cors(), express.static('public'));

// 自定义返回错误中间件（挂载 res.cc 快捷方法）
app.use((req, res, next) => {
  res.cc = function (err, status = 1) {
    res.send({
      status,
      message: err instanceof Error ? err.message : err
    });
  };
  next();
});

// ================== 数据库连接测试 ==================
db.query('SELECT 1', (err) => {
  if (err) {
    console.error('❌ 数据库连接失败:', err);
  } else {
    console.log('✅ 数据库连接成功');
  }
});

// ================== 路由挂载 ==================
// 引入 auth 路由
const authRouter = require('./routes/auth')
app.use('/api', authRouter)

// banner
app.use('/api', require('./routes/banner'));

// 演出推荐/筛选
app.use('/api/performances', require('./routes/performances'));

// 演出详情
app.use('/api/performance-details', require('./routes/performanceDetails'));

// 艺人相关 (获取、关注、取关)
app.use('/api/artists', require('./routes/artists'));

// 用户模块
app.use('/api/user', require('./routes/user'));

//演出收藏
const userFavoritesRouter = require('./routes/userFavorites');
app.use('/api/userFavorites', userFavoritesRouter);

//想看
const favoritesRouter = require('./routes/favorites');
app.use('/api/favorites', favoritesRouter);

//搜索
const searchRouter = require('./routes/search');
app.use('/api/search', searchRouter);

// 活动 优惠券模块
const couponRouter = require('./routes/coupon');
app.use('/api/coupons', couponRouter);

// 活动模块
const activitiesRouter = require('./routes/activities');
app.use('/api/activities', activitiesRouter);

//选座
const scheduleSeatsRouter = require('./routes/scheduleSeats')
app.use('/api', scheduleSeatsRouter)

//订单
const orderRouter = require('./routes/order');
app.use('/api/order', orderRouter);


//日期 点击购买 后选择的
const scheduleRouter = require('./routes/schedules')
app.use('/api/schedules', scheduleRouter)

//观影人 实名
const viewerRouter = require('./routes/viewer');
app.use('/api/viewer', viewerRouter);

//意见反馈 图片上传
const feedbackRouter = require('./routes/feedback');
app.use('/api/feedback', feedbackRouter);


// ================== 启动服务 ==================
app.listen(3000, () => {
  console.log('🚀 Server running at http://localhost:3000');
});
