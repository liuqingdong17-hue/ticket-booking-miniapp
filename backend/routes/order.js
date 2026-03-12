const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middlewares/auth');

function generateOrderNumber() {
  const now = Date.now();
  const rand = Math.floor(Math.random() * 90000) + 10000;
  return `ORD${now}${rand}`;
}

// 创建订单接口（支持可选座 seat_list + 不可选座 ticket_list）
router.post('/create', auth, (req, res) => {
  const user_id = req.user?.userId || req.user?.id;
  if (!user_id) return res.cc('未登录或 token 无效', 1);

  const {
    performance_id,
    schedule_id,
    coupon_id,
    user_coupon_id,
    viewers,
    seat_list = [],
    ticket_list = []
  } = req.body;

  if (!Array.isArray(viewers) || viewers.length === 0)
    return res.cc('观演人不能为空', 1);

  if (seat_list.length === 0 && ticket_list.length === 0)
    return res.cc('订单内容不能为空', 1);

  // 计算座位总价
  const seat_total = seat_list.reduce((s, t) => s + parseFloat(t.price || 0), 0);

  // 计算票档总价
  const ticket_total = ticket_list.reduce((s, t) => {
    return s + (parseFloat(t.price || 0) * (t.count || 1));
  }, 0);

  const total_price = seat_total + ticket_total;

  let discount_price = 0;
  let used_coupon_id = coupon_id || null;
  let used_user_coupon_id = user_coupon_id || null;

  // ----------------------
  //   优惠券处理（不变）
  // ----------------------
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
      if (err) return res.cc('优惠券查询失败');
      if (rows.length === 0) return next();

      const c = rows[0];
      used_coupon_id = c.coupon_id;
      used_user_coupon_id = c.id;

      if (total_price < c.min_amount) return next();

      if (c.discount_type === 1) {
        discount_price = c.discount_value;
      } else if (c.discount_type === 2) {
        discount_price = +(total_price * (1 - c.discount_value)).toFixed(2);
      }

      next();
    });
  };

  // ----------------------
  //    开始事务
  // ----------------------
  applyCoupon(() => {
    const pay_price = Math.max(total_price - discount_price, 0);

    db.getConnection((err, conn) => {
      if (err) return res.cc('数据库连接失败');

      conn.beginTransaction(async (txErr) => {
        if (txErr) {
          conn.release();
          return res.cc('事务启动失败');
        }

        try {
          const order_number = generateOrderNumber();

          // 插入订单主表
          const [orderResult] = await conn.promise().query(
            `INSERT INTO orders 
              (order_number, user_id, performance_id, schedule_id,
               total_price, discount_price, pay_price,
               coupon_id, user_coupon_id, status, created_at, expire_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'unpaid', NOW(), DATE_ADD(NOW(), INTERVAL 5 MINUTE))`,
            [
              order_number, user_id, performance_id, schedule_id,
              total_price, discount_price, pay_price,
              used_coupon_id, used_user_coupon_id
            ]
          );

          const order_id = orderResult.insertId;

          // ----------------------
          //  1) seat_list：可选座
          //  这里 order_items.seat_id 存的是 schedule_seats.id ✅
          // ----------------------
          for (const seat of seat_list) {
            // 兼容字段：你可以前端传 seat_id = schedule_seats.id
            const scheduleSeatId = seat.schedule_seat_id || seat.seat_id || seat.id;
            const price = parseFloat(seat.price) || 0;

            if (!scheduleSeatId) throw new Error('缺少场次座位ID');

            // ✅ 先锁定座位：按 schedule_seats.id 锁
            const [lock] = await conn.promise().query(
              `UPDATE schedule_seats 
               SET status = 'locked'
               WHERE id = ? AND schedule_id = ? AND status = 'available'`,
              [scheduleSeatId, schedule_id]
            );

            if (lock.affectedRows === 0) throw new Error('座位已被占用');

            // ✅ 再写订单明细：seat_id = schedule_seats.id（外键一致）
            await conn.promise().query(
              `INSERT INTO order_items (order_id, seat_id, price)
               VALUES (?, ?, ?)`,
              [order_id, scheduleSeatId, price]
            );
          }

          // ----------------------
          //  2) ticket_list：不可选座（按 count 拆分）
          //  ⚠️ 你原来这里写了两遍 for，会重复扣库存/重复插明细
          // ----------------------
          for (const t of ticket_list) {
            const { ticket_type_id, count, price } = t;

            const [rows] = await conn.promise().query(
              `SELECT stock, sold FROM ticket_types 
               WHERE id = ? AND schedule_id = ? FOR UPDATE`,
              [ticket_type_id, schedule_id]
            );

            if (!rows.length) throw new Error('票档不存在');

            const { stock, sold } = rows[0];

            if (sold + count > stock) {
              throw new Error('票档库存不足');
            }

            // 更新库存（sold += count）
            await conn.promise().query(
              `UPDATE ticket_types SET sold = sold + ? WHERE id = ?`,
              [count, ticket_type_id]
            );

            // 将 count 拆成多条明细
            for (let i = 0; i < count; i++) {
              await conn.promise().query(
                `INSERT INTO order_items (order_id, ticket_type_id, price)
                 VALUES (?, ?, ?)`,
                [order_id, ticket_type_id, price]
              );
            }
          }

          // ----------------------
          //   插入观演人信息
          // ----------------------
          for (const v of viewers) {
            await conn.promise().query(
              `INSERT INTO order_viewers (order_id, viewer_name, id_card, phone)
               VALUES (?, ?, ?, ?)`,
              [order_id, v.name, v.id_card, v.phone]
            );
          }

          // ----------------------
          //   标记优惠券为 used
          // ----------------------
          if (used_user_coupon_id) {
            await conn.promise().query(
              `UPDATE user_coupons 
               SET status = 1, used_at = NOW()
               WHERE id = ? AND user_id = ?`,
              [used_user_coupon_id, user_id]
            );
          }

          await conn.promise().commit();
          conn.release();

          res.send({
            status: 0,
            message: '订单创建成功',
            data: { order_id, order_number }
          });

        } catch (err) {
          await conn.promise().rollback();
          conn.release();
          res.cc(err.message || '订单创建失败');
        }
      });
    });
  });
});


// 支付订单（支持 seat + ticket）
router.post('/pay', auth, (req, res) => {
  const { order_id, pay_method = 'wechat' } = req.body;
  if (!order_id) return res.cc('缺少订单ID');

  db.getConnection((err, conn) => {
    if (err) return res.cc(err);

    conn.beginTransaction(async (err) => {
      if (err) {
        conn.release();
        return res.cc('事务启动失败');
      }

      try {
        // 1. 读取订单
        const [orderRows] = await conn.promise().query(
          `SELECT schedule_id, status FROM orders WHERE id = ? FOR UPDATE`,
          [order_id]
        );

        if (!orderRows.length) throw new Error('订单不存在');
        if (orderRows[0].status !== 'unpaid') throw new Error('订单已支付或取消');

        const schedule_id = orderRows[0].schedule_id;

        // 2. 查询订单所有 seat/ticket
        const [items] = await conn.promise().query(
          `SELECT seat_id, ticket_type_id FROM order_items WHERE order_id = ?`,
          [order_id]
        );

        // 3. seat_id（这里存的是 schedule_seats.id）→ sold
        const scheduleSeatIds = items.filter(i => i.seat_id).map(i => i.seat_id);

        if (scheduleSeatIds.length > 0) {
          // ✅ 按 schedule_seats.id 更新
          await conn.promise().query(
            `UPDATE schedule_seats 
             SET status = 'sold'
             WHERE schedule_id = ? AND id IN (?)`,
            [schedule_id, scheduleSeatIds]
          );
        }

        // 4. ticket_type_id 不需要处理（已在创建订单时 sold++）

        // 5. 更新订单状态为已支付
        await conn.promise().query(
          `UPDATE orders 
           SET status = 'paid',
               pay_method = ?,
               paid_at = NOW()
           WHERE id = ?`,
          [pay_method, order_id]
        );

        await conn.promise().commit();
        conn.release();

        res.send({ status: 0, message: '支付成功' });

      } catch (err) {
        await conn.promise().rollback();
        conn.release();
        res.cc(err.message || '支付失败');
      }
    });
  });
});


// 获取订单详情（支持 seat + ticket）
router.get('/detail/:id', auth, (req, res) => {
  const order_id = req.params.id;

  // ----------- ① 查询订单基本信息 -----------
  const orderSql = `
    SELECT 
      o.id AS order_id,
      o.order_number,
      o.status,
      o.total_price,
      o.discount_price,
      o.pay_price,
      o.created_at,
      o.paid_at,
      o.expire_at, 

      p.name AS performance_name,
      p.cover_url AS performance_cover,

      ps.schedule_time,
      v.name AS venue_name,
      srv.refundable,
      o.refund_status,
      o.refund_apply_reason,
      o.refund_reject_reason

    FROM orders o
    JOIN performances p ON o.performance_id = p.id
    JOIN performance_schedules ps ON o.schedule_id = ps.id
    JOIN venues v ON p.venue_id = v.id
    LEFT JOIN performance_services srv ON srv.performance_id = p.id
    WHERE o.id = ?
  `;

  db.query(orderSql, [order_id], (err, orders) => {
    if (err) return res.cc(err);
    if (!orders.length) return res.cc("订单不存在");

    const order = orders[0];

    // ----------- ② 查询可选座 seat_list -----------
    // ✅ oi.seat_id = schedule_seats.id，所以要先 join schedule_seats 再 join seats
    const seatSql = `
      SELECT 
        a.name AS area_name,
        s.row_no,
        s.seat_no,
        oi.price
      FROM order_items oi
      JOIN schedule_seats ss ON oi.seat_id = ss.id
      JOIN seats s ON ss.seat_id = s.id
      JOIN venue_areas a ON s.area_id = a.id
      WHERE oi.order_id = ? AND oi.seat_id IS NOT NULL
    `;

    // ----------- ③ 查询票档 ticket_list（按票档分组统计 count） -----------
    const ticketSql = `
      SELECT 
        t.name AS ticket_name,
        t.price AS ticket_price,
        COUNT(*) AS ticket_count
      FROM order_items oi
      JOIN ticket_types t ON oi.ticket_type_id = t.id
      WHERE oi.order_id = ? AND oi.ticket_type_id IS NOT NULL
      GROUP BY oi.ticket_type_id
    `;

    db.query(seatSql, [order_id], (err, seatRows) => {
      if (err) return res.cc(err);

      db.query(ticketSql, [order_id], (err, ticketRows) => {
        if (err) return res.cc(err);

        const seat_info = seatRows.length
          ? seatRows.map(r => `${r.area_name}-${r.row_no}排${r.seat_no}座`).join('、')
          : null;

        const seat_list = seatRows.map(r => ({
          area_name: r.area_name,
          row_no: r.row_no,
          seat_no: r.seat_no,
          price: r.price
        }));

        const ticket_info = ticketRows.map(t => ({
          name: t.ticket_name,
          count: t.ticket_count
        }));

        const ticket_list = ticketRows.map(t => ({
          ticket_name: t.ticket_name,
          price: t.ticket_price,
          count: t.ticket_count
        }));

        res.send({
          status: 0,
          message: "获取成功",
          data: {
            ...order,
            seat_info,
            seat_list,
            ticket_info,
            ticket_list
          }
        });
      });
    });
  });
});

// 用户申请退款
router.post('/apply-refund', auth, (req, res) => {
  const user_id = req.user.userId;
  const { order_id, reason } = req.body;

  const sql = `
    SELECT id, user_id, status, refund_status, 
           (SELECT schedule_time FROM performance_schedules WHERE id = schedule_id) AS schedule_time
    FROM orders
    WHERE id = ?
  `;

  db.query(sql, [order_id], (err, rows) => {
    if (err) return res.cc(err);
    if (rows.length === 0) return res.cc("订单不存在");

    const order = rows[0];

    if (order.user_id !== user_id)
      return res.cc("不能申请别人的订单");

    if (order.status !== "paid")
      return res.cc("未支付订单不能申请退款");

    if (order.refund_status !== "none")
      return res.cc("该订单已申请退款");

    // ⭐ 关键：演出开始后禁止退款
    if (new Date(order.schedule_time) < new Date())
      return res.cc("演出开始后无法申请退款");

    const updateSql = `
      UPDATE orders
      SET refund_status = 'pending',
          refund_apply_reason = ?,
          refund_applied_at = NOW()
      WHERE id = ?
    `;

    db.query(updateSql, [reason || '用户未填写原因', order_id], (err2) => {
      if (err2) return res.cc(err2);

      res.send({
        status: 0,
        message: "退款申请已提交，等待管理员处理"
      });
    });
  });
});


// 查询用户订单列表（适配 seat + ticket）
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

      -- 总票数（seat + ticket）
      COUNT(oi.id) AS ticket_count,

      -- 是否存在座位（可选座订单）
      SUM(CASE WHEN oi.seat_id IS NOT NULL THEN 1 ELSE 0 END) AS seat_count,

      -- 是否存在票档（不可选座订单）
      SUM(CASE WHEN oi.ticket_type_id IS NOT NULL THEN 1 ELSE 0 END) AS ticket_type_count,

      -- 获取一个票档名称（不可选座订单）
      GROUP_CONCAT(DISTINCT t.name) AS ticket_names,

      -- 票档单价（用于显示）
      MAX(t.price) AS ticket_price

    FROM orders o
    JOIN performances p ON o.performance_id = p.id
    JOIN performance_schedules ps ON o.schedule_id = ps.id
    JOIN venues v ON p.venue_id = v.id
    LEFT JOIN order_items oi ON oi.order_id = o.id
    LEFT JOIN ticket_types t ON oi.ticket_type_id = t.id

    WHERE o.user_id = ?
    GROUP BY o.id
    ORDER BY o.created_at DESC;
  `;

  db.query(sql, [user_id], (err, results) => {
    if (err) return res.cc(err);

    // 数据加工：给前端一个明确字段
    const data = results.map(item => {
      const isSeatOrder = item.seat_count > 0;
      const isTicketOrder = item.ticket_type_count > 0;

      let display_info = '';
      if (isSeatOrder) {
        display_info = `座位 × ${item.seat_count}`;
      } else if (isTicketOrder) {
        display_info = `${item.ticket_names} × ${item.ticket_type_count}`;
      }

      return {
        ...item,
        order_type: isSeatOrder ? 'seat' : 'ticket',
        display_info
      };
    });

    res.send({
      status: 0,
      message: '获取订单列表成功',
      data
    });
  });
});

// 取消订单（仅允许取消未支付 unpaid）
// 回滚：seat locked -> available；ticket sold -= count；coupon 恢复未使用；订单状态 -> canceled
router.post('/cancel', auth, (req, res) => {
  const user_id = req.user.userId;
  const { order_id } = req.body;
  if (!order_id) return res.cc('缺少订单ID');

  db.getConnection((err, conn) => {
    if (err) return res.cc(err);

    conn.beginTransaction(async (txErr) => {
      if (txErr) {
        conn.release();
        return res.cc('事务启动失败');
      }

      try {
        // 1) 锁订单，校验归属与状态
        const [orderRows] = await conn.promise().query(
          `SELECT id, user_id, schedule_id, status, user_coupon_id
           FROM orders
           WHERE id = ? FOR UPDATE`,
          [order_id]
        );

        if (!orderRows.length) throw new Error('订单不存在');

        const order = orderRows[0];
        if (order.user_id !== user_id) throw new Error('不能取消别人的订单');
        if (order.status !== 'unpaid') throw new Error('仅未支付订单可取消');

        const schedule_id = order.schedule_id;

        // 2) 读取订单明细（seat/ticket）
        const [items] = await conn.promise().query(
          `SELECT seat_id, ticket_type_id
           FROM order_items
           WHERE order_id = ?`,
          [order_id]
        );

        // 3) 回滚座位：locked -> available
        const seatIds = items.filter(i => i.seat_id).map(i => i.seat_id);
        if (seatIds.length > 0) {
          await conn.promise().query(
            `UPDATE schedule_seats
             SET status = 'available'
             WHERE schedule_id = ?
               AND id IN (?)
               AND status = 'locked'`,
            [schedule_id, seatIds]
          );
        }

        // 4) 回滚票档库存：sold -= count（按 ticket_type_id 分组）
        const ticketTypeIds = items.filter(i => i.ticket_type_id).map(i => i.ticket_type_id);
        if (ticketTypeIds.length > 0) {
          // 统计每个 ticket_type_id 的数量
          const countMap = {};
          for (const tid of ticketTypeIds) {
            countMap[tid] = (countMap[tid] || 0) + 1;
          }

          // 逐个扣减 sold
          for (const [tidStr, cnt] of Object.entries(countMap)) {
            const tid = Number(tidStr);
            await conn.promise().query(
              `UPDATE ticket_types
               SET sold = CASE
                 WHEN sold - ? < 0 THEN 0
                 ELSE sold - ?
               END
               WHERE id = ?`,
              [cnt, cnt, tid]
            );
          }
        }

        // 5) 恢复优惠券（你创建订单时把 user_coupons.status=1 used）
        if (order.user_coupon_id) {
          await conn.promise().query(
            `UPDATE user_coupons
             SET status = 0, used_at = NULL
             WHERE id = ? AND user_id = ?`,
            [order.user_coupon_id, user_id]
          );
        }

        // 6) 更新订单状态 canceled
        await conn.promise().query(
          `UPDATE orders
           SET status = 'canceled'
           WHERE id = ?`,
          [order_id]
        );

        await conn.promise().commit();
        conn.release();

        res.send({ status: 0, message: '订单已取消' });

      } catch (e) {
        await conn.promise().rollback();
        conn.release();
        res.cc(e.message || '取消订单失败');
      }
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

// 统一票夹接口（未结束 + 已结束 + 已退款）
router.get('/allTickets', auth, (req, res) => {
  const user_id = req.user.userId;

  const sql = `
    SELECT 
      o.id AS order_id,
      o.performance_id, 
      o.status,
      o.paid_at,
      o.refund_status,   -- ⭐ 新增：退款状态

      p.name AS performance_name,
      p.cover_url AS cover,
      p.city AS city,

      v.name AS venue_name,
      ps.schedule_time,

      COUNT(oi.id) AS ticket_count,

      -- ⭐ 自动识别 座位 / 票档
      GROUP_CONCAT(
        IF(
          oi.seat_id IS NOT NULL,
          CONCAT(a.name, '区-', s.row_no, '排', s.seat_no, '座'),
          CONCAT(t.name, '（票档）')
        ) SEPARATOR '、'
      ) AS seat_info

    FROM orders o
    JOIN performances p ON o.performance_id = p.id
    JOIN performance_schedules ps ON o.schedule_id = ps.id
    JOIN venues v ON p.venue_id = v.id
    JOIN order_items oi ON oi.order_id = o.id

    -- 可选座订单
    LEFT JOIN seats s ON oi.seat_id = s.id
    LEFT JOIN venue_areas a ON s.area_id = a.id

    -- 票档订单
    LEFT JOIN ticket_types t ON oi.ticket_type_id = t.id

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

      // ⭐ 历史票规则：
      // 1. 演出已结束 → 历史票
      // 2. 退款成功（approved）→ 历史票
      const ended =
        eventTime <= now ||
        item.refund_status === "approved";

      return {
        order_id: item.order_id,
        performance_id: item.performance_id,
        performance_name: item.performance_name,
        cover: item.cover,
        city: item.city || '',
        venue_name: item.venue_name,
        ticket_count: item.ticket_count,
        seat_info: item.seat_info,
        show_time: formatDate(item.schedule_time),

        // ⭐ 前端判断是否显示在 usableList 或 historyList
        ended,

        // ⭐ 返回退款状态给前端
        refund_status: item.refund_status,

        // ⭐ 如果是已结束但未退款 → 可评价
        can_comment: ended && item.refund_status !== "approved"
      };
    });

    res.send({
      status: 0,
      message: '获取票夹成功',
      data: formatted
    });
  });
});



//二维码绘制
const QRCode = require('qrcode');

// ✅ 生成二维码图片（base64 png）
router.get('/qrcode/:order_id', async (req, res) => {
  try {
    const orderId = String(req.params.order_id || '').trim();
    if (!orderId) return res.send({ status: 1, message: '缺少订单ID' });

    // ✅ 建议：内容越短越稳！用 “纯数字” 或 “短前缀+数字”
    // 最稳：纯数字
    const text = orderId;
    // 或者：const text = `OID:${orderId}`;  （管理员端解析时记得兼容）

    const dataUrl = await QRCode.toDataURL(text, {
      errorCorrectionLevel: 'M', // L/M/Q/H  (M最均衡)
      margin: 3,                // 静区：越大越容易识别
      width: 800,               // 输出像素（越大越清晰）
      color: { dark: '#000000', light: '#FFFFFF' }
    });

    res.send({
      status: 0,
      message: 'ok',
      data: { text, dataUrl }
    });
  } catch (e) {
    console.error('qrcode gen error:', e);
    res.send({ status: 1, message: '二维码生成失败' });
  }
});


module.exports = router;
