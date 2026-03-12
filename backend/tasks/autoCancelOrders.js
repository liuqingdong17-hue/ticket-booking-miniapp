// jobs/autoCancelOrders.js
const db = require('../db');

/**
 * 启动自动取消未支付订单的定时任务
 */
function startAutoCancelJob() {
  console.log('[JOB] 自动取消未支付订单任务已启动');

  // 每 30 秒执行一次
  setInterval(async () => {
    try {
      await scanAndCancel();
    } catch (e) {
      console.error('[JOB] 自动取消任务异常：', e.message);
    }
  }, 30 * 1000);
}

/**
 * 扫描并取消过期订单
 */
async function scanAndCancel() {
  db.getConnection(async (err, conn) => {
    if (err) return;

    try {
      const [orders] = await conn.promise().query(
        `SELECT id
         FROM orders
         WHERE status = 'unpaid'
           AND expire_at IS NOT NULL
           AND expire_at <= NOW()
         LIMIT 20`
      );

      conn.release();

      for (const o of orders) {
        await cancelOneOrder(o.id);
      }

    } catch (e) {
      conn.release();
    }
  });
}

/**
 * 自动取消单个订单（事务）
 */
function cancelOneOrder(orderId) {
  return new Promise((resolve) => {
    db.getConnection((err, conn) => {
      if (err) return resolve();

      conn.beginTransaction(async () => {
        try {
          // 1. 锁订单
          const [rows] = await conn.promise().query(
            `SELECT schedule_id, status, user_coupon_id
             FROM orders
             WHERE id = ? FOR UPDATE`,
            [orderId]
          );

          if (!rows.length || rows[0].status !== 'unpaid') {
            await conn.promise().rollback();
            conn.release();
            return resolve();
          }

          const { schedule_id, user_coupon_id } = rows[0];

          // 2. 查询订单项
          const [items] = await conn.promise().query(
            `SELECT seat_id, ticket_type_id
             FROM order_items
             WHERE order_id = ?`,
            [orderId]
          );

          // 3. 释放座位
          const seatIds = items.filter(i => i.seat_id).map(i => i.seat_id);
          if (seatIds.length) {
            await conn.promise().query(
              `UPDATE schedule_seats
               SET status = 'available'
               WHERE schedule_id = ?
                 AND seat_id IN (?)`,
              [schedule_id, seatIds]
            );
          }

          // 4. 回滚票档 sold
          const countMap = {};
          items.forEach(i => {
            if (i.ticket_type_id) {
              countMap[i.ticket_type_id] = (countMap[i.ticket_type_id] || 0) + 1;
            }
          });

          for (const tid in countMap) {
            await conn.promise().query(
              `UPDATE ticket_types
               SET sold = GREATEST(sold - ?, 0)
               WHERE id = ?`,
              [countMap[tid], tid]
            );
          }

          // 5. 恢复优惠券
          if (user_coupon_id) {
            await conn.promise().query(
              `UPDATE user_coupons
               SET status = 0, used_at = NULL
               WHERE id = ?`,
              [user_coupon_id]
            );
          }

          // 6. 更新订单状态
          await conn.promise().query(
            `UPDATE orders
             SET status = 'canceled'
             WHERE id = ?`,
            [orderId]
          );

          await conn.promise().commit();
          conn.release();
          resolve();

        } catch (e) {
          await conn.promise().rollback();
          conn.release();
          resolve();
        }
      });
    });
  });
}

module.exports = {
  startAutoCancelJob
};
