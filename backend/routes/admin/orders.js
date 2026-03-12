// const express = require("express");
// const router = express.Router();
// const db = require("../../db");
// const adminAuth = require('../adminAuth');

// router.get('/list', adminAuth, (req, res) => {
//   let { page = 1, size = 10, refund_status, status, keyword } = req.query;

//   page = Number(page);
//   size = Number(size);

//   let where = `WHERE 1 = 1`;

//   if (refund_status && refund_status !== 'all') {
//     where += ` AND o.refund_status = '${refund_status}'`;
//   }

//   if (status && status !== 'all') {
//     where += ` AND o.status = '${status}'`;
//   }

//   if (keyword) {
//     where += ` AND (o.order_number LIKE '%${keyword}%' 
//                 OR p.name LIKE '%${keyword}%' 
//                 OR u.username LIKE '%${keyword}%')`;
//   }

//   const listSql = `
//     SELECT 
//       o.id AS order_id,
//       o.order_number,
//       o.status,
//       o.refund_status,
//       o.refund_apply_reason,
//       o.refund_reject_reason,
//       o.total_price,
//       o.pay_price,
//       o.created_at,
//       o.paid_at,
//       p.name AS performance_name,
//       u.username
//     FROM orders o
//     JOIN performances p ON o.performance_id = p.id
//     JOIN users u ON o.user_id = u.id
//     ${where}
//     ORDER BY o.created_at DESC
//     LIMIT ${(page - 1) * size}, ${size};
//   `;

//   const countSql = `
//     SELECT COUNT(*) AS total
//     FROM orders o
//     JOIN performances p ON o.performance_id = p.id
//     JOIN users u ON o.user_id = u.id
//     ${where};
//   `;

//   db.query(listSql, (err, rows) => {
//     if (err) return res.cc(err);

//     db.query(countSql, (err2, countRows) => {
//       if (err2) return res.cc(err2);

//       res.send({
//         status: 0,
//         message: '获取订单列表成功',
//         data: rows,
//         total: countRows[0].total
//       });
//     });
//   });
// });


// // 获取订单详情（包含 seat_list / ticket_list）
// router.get('/:id', adminAuth, (req, res) => {
//   const order_id = req.params.id;

//   // ① 查询订单基本信息
//   const orderSql = `
//     SELECT 
//       o.*,
//       p.name AS performance_name,
//       v.name AS venue_name,
//       ps.schedule_time,
//       u.username,
//       u.phone
//     FROM orders o
//     JOIN performances p ON o.performance_id = p.id
//     JOIN performance_schedules ps ON o.schedule_id = ps.id
//     JOIN venues v ON p.venue_id = v.id
//     JOIN users u ON o.user_id = u.id
//     WHERE o.id = ?
//   `;

//   db.query(orderSql, [order_id], (err, orderRows) => {
//     if (err) return res.cc(err);
//     if (!orderRows.length) return res.cc("订单不存在");

//     const order = orderRows[0];

//     // ② 查询可选座 seat_list
//     const seatSql = `
//       SELECT 
//         a.name AS area_name,
//         s.row_no,
//         s.seat_no,
//         oi.price
//       FROM order_items oi
//       JOIN seats s ON oi.seat_id = s.id
//       JOIN venue_areas a ON s.area_id = a.id
//       WHERE oi.order_id = ? AND oi.seat_id IS NOT NULL
//     `;

//     // ③ 查询不可选座 ticket_list（按票档）
//     const ticketSql = `
//       SELECT 
//         t.name AS ticket_name,
//         t.price AS price,
//         COUNT(*) AS count
//       FROM order_items oi
//       JOIN ticket_types t ON oi.ticket_type_id = t.id
//       WHERE oi.order_id = ? AND oi.ticket_type_id IS NOT NULL
//       GROUP BY oi.ticket_type_id
//     `;

//     // ④ 查询观演人
//     const viewerSql = `
//       SELECT viewer_name, id_card
//       FROM order_viewers
//       WHERE order_id = ?
//     `;

//     db.query(seatSql, [order_id], (seatErr, seatList) => {
//       if (seatErr) return res.cc(seatErr);

//       db.query(ticketSql, [order_id], (ticketErr, ticketList) => {
//         if (ticketErr) return res.cc(ticketErr);

//         db.query(viewerSql, [order_id], (viewerErr, viewers) => {
//           if (viewerErr) return res.cc(viewerErr);

//           res.send({
//             status: 0,
//             message: '获取订单详情成功',
//             order: order,
//             seat_list: seatList,
//             ticket_list: ticketList,
//             viewers: viewers
//           });
//         });
//       });
//     });
//   });
// });

// // 同意退款（admin 操作）
// router.post('/:id/approve-refund',adminAuth, (req, res) => {
//   const order_id = req.params.id;

//   // ① 查订单基本信息
//   const orderSql = `
//     SELECT id, schedule_id, status, refund_status
//     FROM orders
//     WHERE id = ?
//   `;

//   db.query(orderSql, [order_id], (err, rows) => {
//     if (err) return res.cc(err);
//     if (!rows.length) return res.cc("订单不存在");

//     const order = rows[0];

//     if (order.refund_status !== 'pending') {
//       return res.cc("当前订单不处于审核中，不能退款");
//     }

//     // ② 查询订单项（可选座 + 票档）
//     const itemsSql = `
//       SELECT seat_id, ticket_type_id
//       FROM order_items
//       WHERE order_id = ?
//     `;

//     db.query(itemsSql, [order_id], (err2, items) => {
//       if (err2) return res.cc(err2);

//       let seatIds = items.filter(i => i.seat_id).map(i => i.seat_id);
//       let ticketTypes = items.filter(i => i.ticket_type_id).map(i => i.ticket_type_id);

//       /** ===============================  
//        * A. 释放可选座位  
//        * =============================== */
//       const freeSeats = new Promise((resolve, reject) => {
//         if (seatIds.length === 0) return resolve();

//         const sql = `
//           UPDATE schedule_seats
//           SET status = 'available'
//           WHERE schedule_id = ? AND seat_id IN (?)
//         `;
//         db.query(sql, [order.schedule_id, seatIds], err => {
//           if (err) reject(err);
//           else resolve();
//         });
//       });

//       /** ===============================  
//        * B. 释放票档库存（sold -= count）  
//        * =============================== */
//       const freeTicketTypes = new Promise((resolve, reject) => {
//         if (ticketTypes.length === 0) return resolve();

//         const sql = `
//           UPDATE ticket_types
//           SET sold = sold - 1
//           WHERE id IN (?)
//         `;
//         db.query(sql, [ticketTypes], err => {
//           if (err) reject(err);
//           else resolve();
//         });
//       });

//       /** ===============================  
//        * C. 更新订单状态为已退款  
//        * =============================== */
//       const updateOrder = new Promise((resolve, reject) => {
//         const sql = `
//           UPDATE orders
//           SET refund_status = 'approved',
//               refund_reject_reason = NULL,
//               refund_processed_at = NOW()
//           WHERE id = ?
//         `;
//         db.query(sql, [order_id], err => {
//           if (err) reject(err);
//           else resolve();
//         });
//       });

//       Promise.all([freeSeats, freeTicketTypes, updateOrder])
//         .then(() => {
//           res.send({
//             status: 0,
//             message: "退款已成功处理（座位/票档已释放）"
//           });
//         })
//         .catch(err => res.cc(err));
//     });
//   });
// });


// router.post('/:id/reject-refund', adminAuth,(req, res) => {
//   const order_id = req.params.id;
//   const { reason } = req.body;

//   if (!reason) return res.cc("拒绝原因不能为空");

//   const sql = `
//     UPDATE orders
//     SET refund_status = 'rejected',
//         refund_reject_reason = ?,
//         refund_processed_at = NOW()
//     WHERE id = ? AND refund_status = 'pending'
//   `;

//   db.query(sql, [reason, order_id], (err, result) => {
//     if (err) return res.cc(err);
//     if (result.affectedRows === 0) return res.cc("订单不在审核中，无法拒绝");

//     res.send({
//       status: 0,
//       message: "已拒绝退款"
//     });
//   });
// });

// module.exports = router;
const express = require("express");
const router = express.Router();
const db = require("../../db");
const adminAuth = require('../adminAuth');

router.get('/list', adminAuth, (req, res) => {
  let { page = 1, size = 10, refund_status, status, keyword } = req.query;

  page = Number(page);
  size = Number(size);

  let where = `WHERE 1 = 1`;

  if (refund_status && refund_status !== 'all') {
    where += ` AND o.refund_status = '${refund_status}'`;
  }

  if (status && status !== 'all') {
    where += ` AND o.status = '${status}'`;
  }

  if (keyword) {
    where += ` AND (o.order_number LIKE '%${keyword}%' 
                OR p.name LIKE '%${keyword}%' 
                OR u.username LIKE '%${keyword}%')`;
  }

  const listSql = `
    SELECT 
      o.id AS order_id,
      o.order_number,
      o.status,
      o.refund_status,
      o.refund_apply_reason,
      o.refund_reject_reason,
      o.total_price,
      o.pay_price,
      o.created_at,
      o.paid_at,
      p.name AS performance_name,
      u.username
    FROM orders o
    JOIN performances p ON o.performance_id = p.id
    JOIN users u ON o.user_id = u.id
    ${where}
    ORDER BY o.created_at DESC
    LIMIT ${(page - 1) * size}, ${size};
  `;

  const countSql = `
    SELECT COUNT(*) AS total
    FROM orders o
    JOIN performances p ON o.performance_id = p.id
    JOIN users u ON o.user_id = u.id
    ${where};
  `;

  db.query(listSql, (err, rows) => {
    if (err) return res.cc(err);

    db.query(countSql, (err2, countRows) => {
      if (err2) return res.cc(err2);

      res.send({
        status: 0,
        message: '获取订单列表成功',
        data: rows,
        total: countRows[0].total
      });
    });
  });
});


// 获取订单详情（包含 seat_list / ticket_list）
router.get('/:id', adminAuth, (req, res) => {
  const order_id = req.params.id;

  // ① 查询订单基本信息
  const orderSql = `
    SELECT 
      o.*,
      p.name AS performance_name,
      v.name AS venue_name,
      ps.schedule_time,
      u.username,
      u.phone
    FROM orders o
    JOIN performances p ON o.performance_id = p.id
    JOIN performance_schedules ps ON o.schedule_id = ps.id
    JOIN venues v ON p.venue_id = v.id
    JOIN users u ON o.user_id = u.id
    WHERE o.id = ?
  `;

  db.query(orderSql, [order_id], (err, orderRows) => {
    if (err) return res.cc(err);
    if (!orderRows.length) return res.cc("订单不存在");

    const order = orderRows[0];

    // ② 查询可选座 seat_list
    // ✅ FIX：oi.seat_id 存的是 schedule_seats.id，所以不能直接 JOIN seats
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

    // ③ 查询不可选座 ticket_list（按票档）
    const ticketSql = `
      SELECT 
        t.name AS ticket_name,
        t.price AS price,
        COUNT(*) AS count
      FROM order_items oi
      JOIN ticket_types t ON oi.ticket_type_id = t.id
      WHERE oi.order_id = ? AND oi.ticket_type_id IS NOT NULL
      GROUP BY oi.ticket_type_id
    `;

    // ④ 查询观演人
    const viewerSql = `
      SELECT viewer_name, id_card
      FROM order_viewers
      WHERE order_id = ?
    `;

    db.query(seatSql, [order_id], (seatErr, seatList) => {
      if (seatErr) return res.cc(seatErr);

      db.query(ticketSql, [order_id], (ticketErr, ticketList) => {
        if (ticketErr) return res.cc(ticketErr);

        db.query(viewerSql, [order_id], (viewerErr, viewers) => {
          if (viewerErr) return res.cc(viewerErr);

          res.send({
            status: 0,
            message: '获取订单详情成功',
            order: order,
            seat_list: seatList,
            ticket_list: ticketList,
            viewers: viewers
          });
        });
      });
    });
  });
});

// 同意退款（admin 操作）
router.post('/:id/approve-refund', adminAuth, (req, res) => {
  const order_id = req.params.id;

  // ① 查订单基本信息
  const orderSql = `
    SELECT id, schedule_id, status, refund_status
    FROM orders
    WHERE id = ?
  `;

  db.query(orderSql, [order_id], (err, rows) => {
    if (err) return res.cc(err);
    if (!rows.length) return res.cc("订单不存在");

    const order = rows[0];

    if (order.refund_status !== 'pending') {
      return res.cc("当前订单不处于审核中，不能退款");
    }

    // ② 查询订单项（可选座 + 票档）
    const itemsSql = `
      SELECT seat_id, ticket_type_id
      FROM order_items
      WHERE order_id = ?
    `;

    db.query(itemsSql, [order_id], (err2, items) => {
      if (err2) return res.cc(err2);

      // 注意：items.seat_id 这里是 schedule_seats.id
      let seatIds = items.filter(i => i.seat_id).map(i => i.seat_id);
      let ticketTypes = items.filter(i => i.ticket_type_id).map(i => i.ticket_type_id);

      /** ===============================
       * A. 释放可选座位
       * =============================== */
      const freeSeats = new Promise((resolve, reject) => {
        if (seatIds.length === 0) return resolve();

        // ✅ FIX：按 schedule_seats.id 释放，不是 seat_id
        const sql = `
          UPDATE schedule_seats
          SET status = 'available'
          WHERE schedule_id = ?
            AND id IN (?)
            AND status = 'sold'
        `;
        db.query(sql, [order.schedule_id, seatIds], err => {
          if (err) reject(err);
          else resolve();
        });
      });

      /** ===============================
       * B. 释放票档库存（sold -= count）
       * =============================== */
      const freeTicketTypes = new Promise((resolve, reject) => {
        if (ticketTypes.length === 0) return resolve();

        // ✅ FIX：按票档分组扣减（否则 IN(?) 只减一次）
        const countMap = {};
        for (const tid of ticketTypes) {
          countMap[tid] = (countMap[tid] || 0) + 1;
        }

        const tasks = Object.entries(countMap).map(([tidStr, cnt]) => {
          const tid = Number(tidStr);
          return new Promise((r, j) => {
            const sql = `
              UPDATE ticket_types
              SET sold = CASE
                WHEN sold - ? < 0 THEN 0
                ELSE sold - ?
              END
              WHERE id = ?
            `;
            db.query(sql, [cnt, cnt, tid], (e) => (e ? j(e) : r()));
          });
        });

        Promise.all(tasks).then(resolve).catch(reject);
      });

      /** ===============================
       * C. 更新订单状态为已退款
       * =============================== */
      const updateOrder = new Promise((resolve, reject) => {
        const sql = `
          UPDATE orders
          SET refund_status = 'approved',
              refund_reject_reason = NULL,
              refund_processed_at = NOW()
          WHERE id = ?
        `;
        db.query(sql, [order_id], err => {
          if (err) reject(err);
          else resolve();
        });
      });

      Promise.all([freeSeats, freeTicketTypes, updateOrder])
        .then(() => {
          res.send({
            status: 0,
            message: "退款已成功处理（座位/票档已释放）"
          });
        })
        .catch(err => res.cc(err));
    });
  });
});


router.post('/:id/reject-refund', adminAuth, (req, res) => {
  const order_id = req.params.id;
  const { reason } = req.body;

  if (!reason) return res.cc("拒绝原因不能为空");

  const sql = `
    UPDATE orders
    SET refund_status = 'rejected',
        refund_reject_reason = ?,
        refund_processed_at = NOW()
    WHERE id = ? AND refund_status = 'pending'
  `;

  db.query(sql, [reason, order_id], (err, result) => {
    if (err) return res.cc(err);
    if (result.affectedRows === 0) return res.cc("订单不在审核中，无法拒绝");

    res.send({
      status: 0,
      message: "已拒绝退款"
    });
  });
});

module.exports = router;
