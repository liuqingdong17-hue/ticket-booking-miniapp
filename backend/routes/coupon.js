// routes/coupon.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middlewares/auth');

/**
 * 1️⃣ 获取所有进行中的活动列表
 */
router.get('/activities', (req, res) => {
  const sql = `
    SELECT id, title, cover_image, description, start_time, end_time
    FROM activities
    WHERE status = 1 AND NOW() BETWEEN start_time AND end_time
    ORDER BY created_at DESC
  `;
  db.query(sql, (err, results) => {
    if (err) return res.cc(err);
    res.send({
      status: 0,
      message: '获取成功',
      data: results
    });
  });
});

/**
 * 2️⃣ 获取某个活动详情及其可领取的优惠券
 * ✅ 登录后会自动标记 user_has_received 字段
 */
router.get('/activities/:id', auth, (req, res) => {
  const { id } = req.params;
  const userId = req.user.userId;

  const sqlActivity = `
    SELECT id, title, cover_image, detail_content, start_time, end_time, status
    FROM activities WHERE id = ?
  `;

  const sqlCoupons = `
    SELECT 
      c.id, c.title, c.discount_type, c.discount_value, c.min_amount,
      c.start_time, c.end_time, c.stock,
      IF(uc.id IS NULL, 0, 1) AS user_has_received
    FROM coupons c
    JOIN activity_coupons ac ON ac.coupon_id = c.id
    LEFT JOIN user_coupons uc 
      ON uc.coupon_id = c.id AND uc.user_id = ?
    WHERE ac.activity_id = ? AND c.status = 1
  `;

  db.query(sqlActivity, [id], (err, activityResult) => {
    if (err) return res.cc(err);
    if (activityResult.length === 0) return res.cc('活动不存在', 1);

    db.query(sqlCoupons, [userId, id], (err2, couponResults) => {
      if (err2) return res.cc(err2);
      res.send({
        status: 0,
        message: '获取成功',
        data: {
          activity: activityResult[0],
          coupons: couponResults
        }
      });
    });
  });
});

/**
 * 3️⃣ 用户领取优惠券
 */
router.post('/receive/:couponId', auth, (req, res) => {
  const userId = req.user.userId;
  const { couponId } = req.params;

  // 1. 检查优惠券是否存在且有效
  const sqlCoupon = `
    SELECT * FROM coupons
    WHERE id = ? AND status = 1 AND stock > 0
      AND NOW() BETWEEN start_time AND end_time
  `;
  db.query(sqlCoupon, [couponId], (err, couponResult) => {
    if (err) return res.cc(err);
    if (couponResult.length === 0) return res.cc('优惠券无效或已抢光', 1);

    const coupon = couponResult[0];

    // 2. 检查是否已领取
    const sqlCheck = `SELECT * FROM user_coupons WHERE user_id = ? AND coupon_id = ?`;
    db.query(sqlCheck, [userId, couponId], (err2, checkResult) => {
      if (err2) return res.cc(err2);
      if (checkResult.length > 0) {
        return res.send({
          status: 1,
          message: '您已领取过该优惠券',
          code: 'ALREADY_RECEIVED',
          user_has_received: 1
        });
      }

      // 3. 插入用户优惠券
      const insertSql = `
        INSERT INTO user_coupons (user_id, coupon_id, received_at, status, valid_start, valid_end)
        VALUES (?, ?, NOW(), 0, ?, ?)
      `;
      db.query(insertSql, [userId, couponId, coupon.start_time, coupon.end_time], (err3) => {
        if (err3) return res.cc(err3);

        // 4. 扣减库存
        const updateSql = `UPDATE coupons SET stock = stock - 1 WHERE id = ?`;
        db.query(updateSql, [couponId]);

        res.send({
          status: 0,
          message: '领取成功',
          code: 'SUCCESS',
          user_has_received: 1,
          valid_start: coupon.start_time,
          valid_end: coupon.end_time
        });
      });
    });
  });
});

/**
 * 4️⃣ 获取用户已领取的优惠券列表
 */
router.get('/user/coupons', auth, (req, res) => {
  const userId = req.user.userId;
  const sql = `
    SELECT uc.id, c.title, c.discount_type, c.discount_value, 
           uc.status, uc.received_at, uc.valid_start, uc.valid_end
    FROM user_coupons uc
    JOIN coupons c ON uc.coupon_id = c.id
    WHERE uc.user_id = ?
    ORDER BY uc.received_at DESC
  `;
  db.query(sql, [userId], (err, results) => {
    if (err) return res.cc(err);
    res.send({
      status: 0,
      message: '获取成功',
      data: results
    });
  });
});

/**
 * 5️⃣ 清理已过期优惠券
 */
router.post('/user/coupons/expire', auth, (req, res) => {
  const userId = req.user.userId;
  const now = new Date();
  const sql = `
    UPDATE user_coupons 
    SET status = 2 
    WHERE user_id = ? AND status = 0 AND valid_end < ?
  `;
  db.query(sql, [userId, now], (err, result) => {
    if (err) return res.cc(err);
    res.send({
      status: 0,
      message: `清理成功，共更新 ${result.affectedRows} 条过期优惠券`
    });
  });
});

// ✅ 新增：获取用户可用优惠券列表
router.get('/list', auth, (req, res) => {
  const user_id = req.user?.userId || req.user?.id;

  const sql = `
    SELECT 
      uc.id AS user_coupon_id,
      c.id AS coupon_id,
      c.title,
      c.discount_type,
      c.discount_value,
      c.min_amount,
      uc.status,
      uc.valid_start,
      uc.valid_end
    FROM user_coupons uc
    JOIN coupons c ON uc.coupon_id = c.id
    WHERE uc.user_id = ?
      AND uc.status = 0
      AND (uc.valid_start IS NULL OR uc.valid_start <= NOW())
      AND (uc.valid_end IS NULL OR uc.valid_end >= NOW())
    ORDER BY uc.valid_end ASC
  `;

  db.query(sql, [user_id], (err, results) => {
    if (err) return res.cc(err);
    res.send({
      status: 0,
      message: '获取可用优惠券成功',
      data: results
    });
  });
});

// ✅ 获取用户全部优惠券（未使用 + 已使用 + 已过期）
router.get('/my', auth, (req, res) => {
  const user_id = req.user?.userId || req.user?.id;

  const sql = `
    SELECT 
      uc.id AS user_coupon_id,
      c.id AS coupon_id,
      c.title,
      c.discount_type,
      c.discount_value,
      c.min_amount,
      uc.status,              -- 0未使用 1已使用 2已过期
      uc.valid_start,
      uc.valid_end,
      uc.received_at,
      uc.used_at
    FROM user_coupons uc
    JOIN coupons c ON uc.coupon_id = c.id
    WHERE uc.user_id = ?
    ORDER BY 
      CASE 
        WHEN uc.status = 0 THEN 0      -- 未使用排最前
        WHEN uc.status = 1 THEN 1      -- 已使用
        ELSE 2                         -- 已过期排最后
      END,
      uc.valid_end ASC
  `;

  db.query(sql, [user_id], (err, results) => {
    if (err) return res.cc(err);

    res.send({
      status: 0,
      message: '获取优惠券成功',
      data: results
    });
  });
});


module.exports = router;
