const express = require("express");
const router = express.Router();
const db = require("../../db");

/* =========================================================
   ⭐ 票档管理必须放在最前面（否则会被 /:id 截胡）
   路径前缀：/admin/schedules
========================================================= */

/* 获取某场次所有票档 */
router.get("/ticket-types", (req, res) => {
  const { schedule_id } = req.query;

  const sql = `SELECT * FROM ticket_types WHERE schedule_id = ? ORDER BY id ASC`;

  db.query(sql, [schedule_id], (err, results) => {
    if (err) return res.cc(err);
    res.send({ status: 0, data: results });
  });
});

/* 新增票档 */
router.post("/ticket-types", (req, res) => {
  const { performance_id, schedule_id, name, price, stock } = req.body;

  const sql = `
    INSERT INTO ticket_types (performance_id, schedule_id, name, price, stock, created_at)
    VALUES (?, ?, ?, ?, ?, NOW())
  `;

  db.query(sql, [performance_id, schedule_id, name, price, stock], err => {
    if (err) return res.cc(err);
    res.cc("新增票档成功", 0);
  });
});

// /* 修改票档 */
// router.put("/ticket-types/:id", (req, res) => {
//   db.query(
//     `UPDATE ticket_types SET ? WHERE id = ?`,
//     [req.body, req.params.id],
//     err => {
//       if (err) return res.cc(err);
//       res.cc("票档修改成功", 0);
//     }
//   );
// });

/* 删除票档 */
router.delete("/ticket-types/:id", (req, res) => {
  db.query(
    `DELETE FROM ticket_types WHERE id = ?`,
    [req.params.id],
    err => {
      if (err) return res.cc(err);
      res.cc("删除票档成功", 0);
    }
  );
});

/* =========================================================
   ⭐ 判断某场次是否可选座（用于前端判断显示票档还是区域价格）
========================================================= */

router.get("/service/:schedule_id", (req, res) => {
  const scheduleId = req.params.schedule_id;

  const sql1 = `SELECT performance_id FROM performance_schedules WHERE id = ?`;

  db.query(sql1, [scheduleId], (err1, rows1) => {
    if (err1 || rows1.length === 0) return res.cc("场次不存在");

    const performanceId = rows1[0].performance_id;

    const sql2 = `SELECT selectable_seats FROM performance_services WHERE performance_id = ?`;

    db.query(sql2, [performanceId], (err2, rows2) => {
      if (err2) return res.cc(err2);

      const selectable = rows2.length ? rows2[0].selectable_seats : 0;

      res.send({
        status: 0,
        selectable_seats: selectable
      });
    });
  });
});

/* =========================================================
   ⭐ 场次区域价格设置（可选座使用）
========================================================= */

router.get("/:id/area-prices", (req, res) => {
  const scheduleId = req.params.id;

  const sql = `
    SELECT 
      a.id AS area_id,
      a.name AS area_name,
      COALESCE(p.price, 0) AS price
    FROM venue_areas a
    LEFT JOIN schedule_area_prices p
      ON a.id = p.area_id AND p.schedule_id = ?
    WHERE a.venue_id = (
      SELECT venue_id 
      FROM performances 
      WHERE id = (
        SELECT performance_id FROM performance_schedules WHERE id = ?
      )
    )
    ORDER BY a.id
  `;

  db.query(sql, [scheduleId, scheduleId], (err, rows) => {
    if (err) return res.cc(err);
    res.send({ status: 0, data: rows });
  });
});

router.post("/:id/area-prices", (req, res) => {
  const scheduleId = req.params.id;
  const prices = req.body.prices;

  if (!Array.isArray(prices)) return res.cc("数据格式错误");

  const sql = `
    INSERT INTO schedule_area_prices (schedule_id, area_id, price)
    VALUES ?
    ON DUPLICATE KEY UPDATE price = VALUES(price)
  `;

  const values = prices.map(item => [
    scheduleId,
    item.area_id,
    item.price
  ]);

  db.query(sql, [values], err => {
    if (err) return res.cc(err);
    res.cc("价格设置成功", 0);
  });
});

/* =========================================================
   ⭐ 场次 CRUD（路径含 :id，必须放最后）
========================================================= */

/* 获取场次列表 */
router.get("/", (req, res) => {
  const keyword = `%${req.query.keyword || ""}%`;

  const sql = `
    SELECT 
      s.*, 
      p.name AS performance_name,
      v.name AS venue_name,
      DATE_FORMAT(s.schedule_time, '%Y-%m-%d') AS date,
      DATE_FORMAT(s.schedule_time, '%H:%i') AS time,
      ps.selectable_seats
    FROM performance_schedules s
    LEFT JOIN performances p ON s.performance_id = p.id
    LEFT JOIN venues v ON p.venue_id = v.id
    LEFT JOIN performance_services ps ON p.id = ps.performance_id
    WHERE p.name LIKE ?
    ORDER BY s.id DESC
  `;

  db.query(sql, [keyword], async (err, schedules) => {
    if (err) return res.cc(err);

    const tasks = schedules.map(s =>
      new Promise(resolve => {
        if (s.selectable_seats) {
          const seatSql = `
            SELECT COUNT(*) AS total_stock, 
                   SUM(status='sold') AS sold
            FROM schedule_seats
            WHERE schedule_id = ?
          `;
          db.query(seatSql, [s.id], (e2, rows) => {
            s.total_stock = rows?.[0]?.total_stock || 0;
            s.sold = rows?.[0]?.sold || 0;
            resolve();
          });
        } else {
          const ticketSql = `
            SELECT SUM(stock) AS total_stock,
                   SUM(sold) AS sold
            FROM ticket_types
            WHERE schedule_id = ?
          `;
          db.query(ticketSql, [s.id], (e3, rows) => {
            s.total_stock = rows?.[0]?.total_stock || 0;
            s.sold = rows?.[0]?.sold || 0;
            resolve();
          });
        }
      })
    );

    await Promise.all(tasks);

    res.send({ status: 0, data: schedules });
  });
});

/* 新增场次 */
router.post("/", (req, res) => {
  const { performance_id, schedule_time, duration } = req.body;

  const sql = `
    INSERT INTO performance_schedules (performance_id, schedule_time, duration, status)
    VALUES (?, ?, ?, 1)
  `;

  db.query(sql, [performance_id, schedule_time, duration], err => {
    if (err) return res.cc(err);
    res.cc("新增成功", 0);
  });
});

/* 获取单个场次 */
router.get("/:id", (req, res) => {
  db.query(
    `SELECT * FROM performance_schedules WHERE id = ?`,
    [req.params.id],
    (err, rows) => {
      if (err || rows.length === 0) return res.cc("未找到场次");
      res.send({ status: 0, data: rows[0] });
    }
  );
});

/* 修改场次 */
router.put("/:id", (req, res) => {
  db.query(
    `UPDATE performance_schedules SET ? WHERE id = ?`,
    [req.body, req.params.id],
    err => {
      if (err) return res.cc(err);
      res.cc("修改成功", 0);
    }
  );
});

/* 删除场次 */
router.delete("/:id", (req, res) => {
  db.query(
    `DELETE FROM performance_schedules WHERE id = ?`,
    [req.params.id],
    err => {
      if (err) return res.cc(err);
      res.cc("删除成功", 0);
    }
  );
});

/* =========================================================
   场次座位初始化（从 seats 模板生成 schedule_seats）
   POST /admin/schedules/:id/init-seats
========================================================= */
router.post("/:id/init-seats", (req, res) => {
  const scheduleId = req.params.id;

  // 1. 先看是否已生成过
  const checkSql = `
    SELECT COUNT(*) AS cnt
    FROM schedule_seats
    WHERE schedule_id = ?
  `;
  db.query(checkSql, [scheduleId], (err, rows) => {
    if (err) return res.cc(err);

    if (rows[0].cnt > 0) {
      // 已经生成过就不重复插入
      return res.cc("该场次已初始化过座位", 0);
    }

    // 2. 找到该场次所属场馆的所有 seats
    const seatSql = `
      SELECT s.id AS seat_id
      FROM seats s
      JOIN venue_areas a ON s.area_id = a.id
      WHERE a.venue_id = (
        SELECT venue_id FROM performances WHERE id = (
          SELECT performance_id FROM performance_schedules WHERE id = ?
        )
      )
    `;

    db.query(seatSql, [scheduleId], (err2, seatRows) => {
      if (err2) return res.cc(err2);

      if (seatRows.length === 0) {
        return res.cc("该场馆暂未配置座位模板，请先在区域管理中生成座位");
      }

      const values = seatRows.map((row) => [
        scheduleId,
        row.seat_id,
        "available",
        new Date(),
      ]);

      const insertSql = `
        INSERT INTO schedule_seats (schedule_id, seat_id, status, created_at)
        VALUES ?
      `;

      db.query(insertSql, [values], (err3) => {
        if (err3) return res.cc(err3);

        res.cc("初始化场次座位成功", 0);
      });
    });
  });
});


module.exports = router;
