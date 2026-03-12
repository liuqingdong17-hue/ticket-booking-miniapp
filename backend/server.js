//server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const db = require('./db'); // 引入数据库配置
require('./tasks/couponCleaner');
const { startAutoCancelJob } = require('./tasks/autoCancelOrders');


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

//选票
const ticketsRouter = require('./routes/tickets')
app.use('/api/tickets', ticketsRouter)

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

// 在线客服（人工）
const chatRouter = require('./routes/chat');
app.use('/api/chat', chatRouter);

//在线客服（人工）
app.use('/api/chat', require('./routes/chatHuman'));

//评论
const reviewRouter = require('./routes/review');
app.use('/api/review', reviewRouter);

//二维码核销
const orderVerifyRouter = require("./routes/orderVerify");
app.use("/api/order", orderVerifyRouter);



// ✳️ 管理员登录
app.use('/api/admin', require('./routes/adminAuth'));

// ================== 管理端 ==================

//管理员演出管理
app.use('/admin/performances', require('./routes/admin/performance'))

// 管理员艺人管理
app.use('/admin/artists', require('./routes/admin/artists'));

// 管理员场次管理
app.use('/admin/schedules', require('./routes/admin/schedules'));

// 场馆、区域、座位管理
app.use('/admin/venues', require('./routes/admin/venues'));
app.use('/admin/areas', require('./routes/admin/areas'));
app.use('/admin/seats', require('./routes/admin/seats'));

// 管理员订单管理
app.use('/admin/orders', require('./routes/admin/orders'));

//管理员用户管理
app.use("/admin/users", require("./routes/admin/users"));

app.use('/admin/chat', require('./routes/admin/chat'));

// 管理端 - 活动、优惠券、banner 管理
app.use('/admin/activities', require('./routes/admin/activities'))
app.use('/admin/coupons', require('./routes/admin/coupons'))
app.use('/admin/banners', require('./routes/admin/banners'))

//app.use('/admin/upload', require('./routes/admin/upload'));

app.use("/admin/dashboard", require("./routes/admin/dashboard"))


startAutoCancelJob();

// ================== 启动服务 ==================
app.listen(3000, () => {
  console.log('🚀 Server running at http://localhost:3000');
});
