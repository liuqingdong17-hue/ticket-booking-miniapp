const cron = require('node-cron');
const db = require('../db');

// 每天凌晨 1 点执行一次
cron.schedule('0 1 * * *', async () => {
  console.log('[任务开始] 检查并更新过期优惠券...');

  try {
    const now = new Date();
    const sql = `
      UPDATE user_coupons
      SET status = 2
      WHERE status = 0 AND valid_end < ?
    `;
    const [result] = await db.query(sql, [now]);
    console.log(`[任务完成] 已更新 ${result.affectedRows} 条过期优惠券`);
  } catch (err) {
    console.error('更新过期优惠券失败:', err);
  }
});
