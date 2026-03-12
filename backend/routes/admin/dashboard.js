const express = require("express");
const router = express.Router();
const db = require("../../db");
const adminAuth = require("../adminAuth");

// ===============================
//   仪表盘整体数据接口
//   GET /admin/dashboard/data
// ===============================
router.get("/data", adminAuth, async (req, res) => {

  try {
    // ===== 1. 今日新增用户 =====
    const sqlNewUsers = `
      SELECT COUNT(*) AS count
      FROM users
      WHERE DATE(created_at) = CURDATE()
    `;

    // ===== 2. 今日订单数 =====
    const sqlNewOrders = `
      SELECT COUNT(*) AS count
      FROM orders
      WHERE DATE(created_at) = CURDATE()
    `;

    // ===== 3. 今日销售额 =====
    const sqlTodayAmount = `
      SELECT COALESCE(SUM(pay_price),0) AS amount
      FROM orders
      WHERE DATE(created_at) = CURDATE()
    `;

    // ===== 4. 上架演出数 =====
    const sqlOnlinePerformances = `
      SELECT COUNT(*) AS count
      FROM performances
      WHERE status = 1
    `;

    // ===== 5. 热门演出 TOP5 =====
    const sqlHotPerformances = `
      SELECT id, name, city, popularity
      FROM performances
      WHERE status = 1
      ORDER BY popularity DESC
      LIMIT 5
    `;

    // ===== 6. 最新反馈 5 条 =====
    const sqlLatestFeedback = `
      SELECT f.id, u.username, f.content, 
             DATE_FORMAT(f.created_at, '%Y-%m-%d %H:%i') AS created_at
      FROM feedbacks f
      LEFT JOIN users u ON f.user_id = u.id
      ORDER BY f.id DESC
      LIMIT 5
    `;

    // ===== 7. 最近 7 天订单数趋势 =====
    const sqlOrderTrend = `
      SELECT 
        DATE(created_at) AS day,
        COUNT(*) AS count
      FROM orders
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
      GROUP BY DATE(created_at)
      ORDER BY day ASC
    `;

    // ===== 8. 最近 7 天销售额趋势（新增！）=====
    const sqlAmountTrend = `
      SELECT 
        DATE(created_at) AS day,
        SUM(pay_price) AS amount
      FROM orders
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
      GROUP BY DATE(created_at)
      ORDER BY day ASC
    `;

    // 多个查询一起执行
    const [
      newUsers,
      newOrders,
      todayAmount,
      onlineShow,
      hotList,
      feedbackList,
      trend,
      amountTrend  // ← 新增
    ] = await Promise.all([
      query(sqlNewUsers),
      query(sqlNewOrders),
      query(sqlTodayAmount),
      query(sqlOnlinePerformances),
      query(sqlHotPerformances),
      query(sqlLatestFeedback),
      query(sqlOrderTrend),
      query(sqlAmountTrend)  // ← 新增
    ]);

    // ===== 补齐最近 7 天日期（订单数量）=====
    let days = [];
    let counts = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);

      const dateStr = `${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}`;
      days.push(dateStr);

      const found = trend.find(t => formatDate(t.day) === dateStr);
      counts.push(found ? found.count : 0);
    }

    // ===== ⭐ 新增：补齐销售额数据 =====
    let amountCounts = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = `${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}`;

      const foundAmount = amountTrend.find(t => formatDate(t.day) === dateStr);
      amountCounts.push(foundAmount ? Number(foundAmount.amount || 0) : 0);
    }

    res.send({
      status: 0,
      message: "仪表盘数据获取成功",
      stats: {
        new_users: newUsers[0].count,
        new_orders: newOrders[0].count,
        today_amount: todayAmount[0].amount,
        online_performances: onlineShow[0].count
      },
      chart: {
        days,
        counts,
        amountCounts   // ⭐ 小程序可直接使用
      },
      hot: hotList,
      feedbacks: feedbackList
    });

  } catch (err) {
    console.error(err);
    res.cc(err);
  }

});

// ===============================
// 工具函数：DB Promise 封装
// ===============================
function query(sql, params) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

// 格式化日期（MM-DD）
function formatDate(dateObj) {
  const date = new Date(dateObj);
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const d = date.getDate().toString().padStart(2, "0");
  return `${m}-${d}`;
}

module.exports = router;
