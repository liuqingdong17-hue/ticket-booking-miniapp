const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middlewares/auth');

function generateOrderNumber() {
  const now = Date.now();
  const rand = Math.floor(Math.random() * 90000) + 10000;
  return `ORD${now}${rand}`;
}

// 创建订单接口（正确处理 user_coupon_id 与 coupon_id）
router.post('/create', auth, (req, res) => {
  const user_id = req.user?.userId || req.user?.id;
  if (!user_id) return res.cc('未登录或 token 无效', 1);

  const { performance_id, schedule_id, coupon_id, user_coupon_id, viewers, seat_list } = req.body;

  if (!Array.isArray(seat_list) || seat_list.length === 0)
    return res.cc('座位信息不能为空', 1);
  if (!Array.isArray(viewers) || viewers.length === 0)
    return res.cc('观演人信息不能为空', 1);

  const total_price = seat_list.reduce((s, it) => s + (parseFloat(it.price) || 0), 0);
  let discount_price = 0;
  let used_coupon_id = coupon_id || null;
  let used_user_coupon_id = user_coupon_id || null;

  //✅ 优惠券
  const applyCoupon = (next) => {
    if (!used_user_coupon_id && !used_coupon_id) return next();

    let sql = `
      SELECT uc.*, c.discount_type, c.discount_value, c.min_amount
      FROM user_coupons uc
      JOIN coupons c ON uc.coupon_id = c.id
      WHERE uc.user_id = ? 
        AND uc.status = 0
        AND (uc.valid_start IS NULL OR uc.valid_start <= NOW())
        AND (uc.valid_end IS NULL OR uc.valid_end >= NOW())
    `;
    const params = [user_id];

    if (used_user_coupon_id) {
      sql += ' AND uc.id = ? LIMIT 1';
      params.push(used_user_coupon_id);
    } else if (used_coupon_id) {
      sql += ' AND uc.coupon_id = ? LIMIT 1';
      params.push(used_coupon_id);
    }

    db.query(sql, params, (err, rows) => {
      if (err) return res.cc('优惠券查询失败', 1);
      if (!rows || rows.length === 0) return next();

      const c = rows[0];
      used_coupon_id = c.coupon_id;
      used_user_coupon_id = c.id;

      // 检查最低消费限制
      if (total_price < (parseFloat(c.min_amount) || 0)) return next();

      // 满减券
      if (c.discount_type === 1) {
        discount_price = parseFloat(c.discount_value) || 0;
      }
      // 折扣券（discount_value = 0.7 表示七折）
      else if (c.discount_type === 2) {
        const rate = parseFloat(c.discount_value) || 1;
        discount_price = Math.round((total_price * (1 - rate)) * 100) / 100;
      }

      next();
    });
  };

  // 开始执行订单创建逻辑
  applyCoupon(() => {
    const pay_price = Math.max(total_price - discount_price, 0);

    db.getConnection((err, conn) => {
      if (err) return res.cc('数据库连接失败', 1);

      conn.beginTransaction(async (txErr) => {
        if (txErr) {
          conn.release();
          return res.cc('事务启动失败', 1);
        }

        try {
          const order_number = generateOrderNumber();

          // ✅ 插入订单主表
          const [orderResult] = await new Promise((resolve, reject) => {
            conn.query(
              `INSERT INTO orders 
               (order_number, user_id, performance_id, schedule_id, total_price, discount_price, pay_price, coupon_id, user_coupon_id, status, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'unpaid', NOW())`,
              [
                order_number,
                user_id,
                performance_id,
                schedule_id,
                total_price,
                discount_price,
                pay_price,
                used_coupon_id,
                used_user_coupon_id
              ],
              (qErr, r) => qErr ? reject(qErr) : resolve([r])
            );
          });

          const order_id = orderResult.insertId;

          // ✅ 插入座位明细 + 锁定座位
          for (const seat of seat_list) {
            const seatId = seat.seat_id || seat.id;
            const price = parseFloat(seat.price) || 0;

            // 插入订单座位记录
            await new Promise((resolve, reject) => {
              conn.query(
                `INSERT INTO order_items (order_id, seat_id, price) VALUES (?, ?, ?)`,
                [order_id, seatId, price],
                (qErr) => qErr ? reject(qErr) : resolve()
              );
            });

            // 锁定座位
            await new Promise((resolve, reject) => {
              conn.query(
                `UPDATE schedule_seats 
                 SET status = 'locked' 
                 WHERE seat_id = ? AND schedule_id = ? AND status = 'available'`,
                [seatId, schedule_id],
                (qErr, r) => (qErr || r.affectedRows === 0)
                  ? reject(qErr || new Error('座位已被占用'))
                  : resolve()
              );
            });
          }

          // ✅ 插入观演人信息
          for (const v of viewers) {
            await new Promise((resolve, reject) => {
              conn.query(
                `INSERT INTO order_viewers (order_id, viewer_name, id_card, phone)
                 VALUES (?, ?, ?, ?)`,
                [order_id, v.name, v.id_card, v.phone],
                (qErr) => qErr ? reject(qErr) : resolve()
              );
            });
          }

          // ✅ 更新优惠券状态为 used
          if (used_user_coupon_id) {
            await new Promise((resolve, reject) => {
              conn.query(
                `UPDATE user_coupons 
                SET status = 1, used_at = NOW()
                WHERE id = ? AND user_id = ? AND status = 0`,
                [used_user_coupon_id, user_id],
                (qErr) => qErr ? reject(qErr) : resolve()
              );
            });
          }

          // ✅ 查询配送方式
          const deliverySql = `
            SELECT electronic_ticket, ticket_exchangeable 
            FROM performance_services 
            WHERE performance_id = ? 
            LIMIT 1
          `;
          db.query(deliverySql, [performance_id], (err2, rows) => {
            let delivery = '纸质票';
            if (!err2 && rows.length > 0) {
              const s = rows[0];
              if (s.electronic_ticket) delivery = '电子票';
              else if (s.ticket_exchangeable) delivery = '自助机取票';
            }

            conn.commit((cErr) => {
              if (cErr) {
                conn.rollback(() => conn.release());
                return res.cc('提交事务失败', 1);
              }

              conn.release();
              res.send({
                status: 0,
                message: '订单创建成功',
                data: {
                  order_id,
                  order_number,
                  performance_id,
                  schedule_id,
                  total_price,
                  discount_price,
                  pay_price,
                  coupon_id: used_coupon_id,
                  user_coupon_id: used_user_coupon_id,
                  viewers,
                  delivery
                }
              });
            });
          });
        } catch (ex) {
          conn.rollback(() => conn.release());
          res.cc(ex.message || '订单创建失败', 1);
        }
      });
    });
  });
});


// 支付订单（模拟支付 + 更新座位状态）
router.post('/pay', auth, (req, res) => {
  const { order_id } = req.body;
  if (!order_id) return res.cc('缺少订单ID');

  db.getConnection((err, conn) => {
    if (err) return res.cc(err);

    conn.beginTransaction(async (err) => {
      if (err) {
        conn.release();
        return res.cc('事务启动失败');
      }

      try {
        // ✅ 1. 检查订单状态
        const [order] = await conn.promise().query(
          'SELECT id, schedule_id, status FROM orders WHERE id = ? FOR UPDATE',
          [order_id]
        );

        if (!order.length) throw new Error('订单不存在');
        if (order[0].status !== 'unpaid') throw new Error('订单已支付或取消');

        const schedule_id = order[0].schedule_id;

        // ✅ 2. 更新订单状态为已支付
        await conn.promise().query(
          `UPDATE orders 
           SET status = 'paid', paid_at = NOW() 
           WHERE id = ? AND status = 'unpaid'`,
          [order_id]
        );

        // ✅ 3. 查询订单包含的所有座位
        const [orderSeats] = await conn.promise().query(
          `SELECT seat_id FROM order_items WHERE order_id = ?`,
          [order_id]
        );

        if (!orderSeats.length) throw new Error('订单中没有座位数据');

        const seatIds = orderSeats.map(s => s.seat_id);

        // ✅ 4. 将这些座位状态从 locked 改为 sold
        await conn.promise().query(
          `UPDATE schedule_seats 
           SET status = 'sold'
           WHERE schedule_id = ? AND seat_id IN (?)`,
          [schedule_id, seatIds]
        );

        // ✅ 5. 提交事务
        await conn.promise().commit();
        conn.release();

        res.send({
          status: 0,
          message: '支付成功，座位已售出'
        });

      } catch (err) {
        await conn.promise().rollback();
        conn.release();
        res.cc(err.message || '支付失败');
      }
    });
  });
});


// 取消订单
router.post('/cancel', auth, (req, res) => {
  const { order_id } = req.body;
  if (!order_id) return res.cc('缺少订单ID');

  db.getConnection((err, conn) => {
    if (err) return res.cc(err);
    conn.beginTransaction(async (err) => {
      if (err) {
        conn.release();
        return res.cc(err);
      }

      try {
        // 查询订单状态
        const [order] = await conn.promise().query(
          'SELECT id, status FROM orders WHERE id = ? FOR UPDATE',
          [order_id]
        );

        if (!order.length) throw new Error('订单不存在');
        if (order[0].status !== 'unpaid') throw new Error('只能取消未支付订单');

        // 修改订单状态
        await conn.promise().query(
          'UPDATE orders SET status = "canceled", canceled_at = NOW() WHERE id = ?',
          [order_id]
        );

        // 查找订单关联的座位
        const [seats] = await conn.promise().query(
          'SELECT seat_id FROM order_tickets WHERE order_id = ?',
          [order_id]
        );

        // 释放座位
        for (const s of seats) {
          await conn.promise().query(
            'UPDATE schedule_seats SET status = "available" WHERE id = ?',
            [s.seat_id]
          );
        }

        await conn.promise().commit();
        conn.release();
        res.cc('订单已取消并释放座位', 0);
      } catch (err) {
        await conn.promise().rollback();
        conn.release();
        res.cc(err.message);
      }
    });
  });
});

// 获取订单详情
router.get('/detail/:id', auth, (req, res) => {
  const order_id = req.params.id;

  const sql = `
  SELECT 
    o.id AS order_id,
    o.order_number,
    o.status,
    o.total_price,
    o.discount_price,
    o.pay_price,
    o.created_at,
    o.paid_at,
    p.name AS performance_name,
    p.cover_url AS performance_cover,
    ps.schedule_time,
    ps.duration,
    v.name AS venue_name,
    GROUP_CONCAT(
      CONCAT(a.name, '区-', s.row_no, '排', s.seat_no, '座')
      SEPARATOR '、'
    ) AS seat_info
  FROM orders o
  JOIN performances p ON o.performance_id = p.id
  JOIN performance_schedules ps ON o.schedule_id = ps.id
  JOIN venues v ON p.venue_id = v.id
  JOIN order_items oi ON o.id = oi.order_id
  JOIN schedule_seats ss ON oi.seat_id = ss.seat_id AND ss.schedule_id = ps.id
  JOIN seats s ON ss.seat_id = s.id
  JOIN venue_areas a ON s.area_id = a.id
  WHERE o.id = ?
  GROUP BY o.id;
`;




  db.query(sql, [order_id], (err, results) => {
    if (err) return res.cc(err);
    if (results.length === 0) return res.cc('订单不存在');
    res.send({
      status: 0,
      message: '获取订单详情成功',
      data: results[0],
    });
  });
});


// 查询用户订单列表
router.get('/list', auth, (req, res) => {
  const user_id = req.user.userId;

  const sql = `
    SELECT 
      o.id AS order_id,
      o.order_number,
      o.status,
      o.total_price,
      o.discount_price,
      o.pay_price,
      o.created_at,

      p.name AS performance_name,
      p.cover_url AS cover_url,

      ps.schedule_time,
      v.name AS venue_name,

      COUNT(oi.id) AS ticket_count
    FROM orders o
    JOIN performances p ON o.performance_id = p.id
    JOIN performance_schedules ps ON o.schedule_id = ps.id
    JOIN venues v ON p.venue_id = v.id
    LEFT JOIN order_items oi ON oi.order_id = o.id
    WHERE o.user_id = ?
    GROUP BY o.id
    ORDER BY o.created_at DESC
  `;

  db.query(sql, [user_id], (err, results) => {
    if (err) return res.cc(err);
    res.send({
      status: 0,
      message: '获取订单列表成功',
      data: results,
    });
  });
});

// 安全格式化日期：2026-01-12 06:52:00 -> 2026.01.12 06:52
function formatDate(date) {
  if (!date) return "";
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hour = String(d.getHours()).padStart(2, '0');
  const minute = String(d.getMinutes()).padStart(2, '0');
  return `${year}.${month}.${day} ${hour}:${minute}`;
}

// 统一票夹接口（未结束 + 已结束）
router.get('/allTickets', auth, (req, res) => {
  const user_id = req.user.userId;

  const sql = `
    SELECT 
      o.id AS order_id,
      o.status,
      o.paid_at,

      p.name AS performance_name,
      p.cover_url AS cover,
      p.city AS city,

      v.name AS venue_name,
      ps.schedule_time,

      COUNT(oi.id) AS ticket_count,

      GROUP_CONCAT(
        CONCAT(a.name, '区-', s.row_no, '排', s.seat_no, '座')
        SEPARATOR '、'
      ) AS seat_info

    FROM orders o
    JOIN performances p ON o.performance_id = p.id
    JOIN performance_schedules ps ON o.schedule_id = ps.id
    JOIN venues v ON p.venue_id = v.id
    JOIN order_items oi ON oi.order_id = o.id
    JOIN schedule_seats ss ON oi.seat_id = ss.seat_id AND ss.schedule_id = ps.id
    JOIN seats s ON ss.seat_id = s.id
    JOIN venue_areas a ON s.area_id = a.id

    WHERE 
      o.user_id = ?
      AND o.status = 'paid'

    GROUP BY o.id
    ORDER BY ps.schedule_time ASC;
  `;

  db.query(sql, [user_id], (err, results) => {
    if (err) return res.cc(err);

    const now = new Date();

    const formatted = results.map(item => {
      const eventTime = new Date(item.schedule_time);
      const ended = eventTime <= now;

      return {
        order_id: item.order_id,
        performance_name: item.performance_name,
        cover: item.cover,
        city: item.city || '',
        venue_name: item.venue_name,
        ticket_count: item.ticket_count,
        seat_info: item.seat_info,
        show_time: formatDate(item.schedule_time),
        ended,              // true / false
        can_comment: ended  // 历史票能评价
      };
    });

    res.send({
      status: 0,
      message: '获取票夹成功',
      data: formatted
    });
  });
});

module.exports = router;
