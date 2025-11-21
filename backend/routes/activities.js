const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middlewares/auth');

// 获取活动详情及其优惠券
router.get('/:id', async (req, res) => {
  const activityId = req.params.id;

  try {
    // ✅ 查询活动详情
    const sqlActivity = 'SELECT * FROM activities WHERE id = ? AND status = 1';
    const [activityRows] = await db.promisePool.query(sqlActivity, [activityId]);

    if (!activityRows.length) {
      return res.cc('活动不存在或已下架', 1);
    }
    const activity = activityRows[0];

    // ✅ 查询该活动下所有优惠券
    const sqlCoupons = `
      SELECT c.*
      FROM coupons c
      JOIN activity_coupons ac ON ac.coupon_id = c.id
      WHERE ac.activity_id = ? AND c.status = 1
    `;
    const [couponRows] = await db.promisePool.query(sqlCoupons, [activityId]);

    // ✅ 正常返回
    res.send({
      status: 0,
      message: '获取成功',
      data: {
        activity,
        coupons: couponRows
      }
    });
  } catch (err) {
    console.error('获取活动详情出错:', err);
    res.cc(err.message || '服务器内部错误', 1);
  }
});

module.exports = router;
