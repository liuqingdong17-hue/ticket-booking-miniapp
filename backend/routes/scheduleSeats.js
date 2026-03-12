// const express = require("express");
// const router = express.Router();
// const db = require("../db");

// /**
//  * 获取某场次的所有区域 + 座位 + 状态 + 区域价格
//  * URL: GET /api/schedules/:schedule_id/seats
//  *
//  * 关键：返回给前端的 seat.id 必须是 schedule_seats.id（场次座位ID）
//  */
// router.get("/schedules/:schedule_id/seats", (req, res) => {
//   const schedule_id = Number(req.params.schedule_id);

//   if (!schedule_id || Number.isNaN(schedule_id)) {
//     return res.cc("场次ID无效");
//   }

//   const sql = `
//     SELECT 
//       va.id AS area_id,
//       va.name AS area_name,
//       va.position_x,
//       va.position_y,
//       va.width,
//       va.height,

//       sap.price AS area_price,

//       s.id AS seat_id,
//       s.row_no,
//       s.seat_no,
//       s.position_x AS seat_x,
//       s.position_y AS seat_y,

//       ss.id AS schedule_seat_id,       -- ✅ 场次座位ID（下单要用它）
//       ss.status AS seat_status

//     FROM venue_areas va

//     -- 区域价格（注意你的表名：schedule_area_prices / schedule_area_price）
//     LEFT JOIN schedule_area_prices sap 
//       ON sap.area_id = va.id AND sap.schedule_id = ?

//     LEFT JOIN seats s 
//       ON s.area_id = va.id
    
//     LEFT JOIN schedule_seats ss
//       ON ss.seat_id = s.id AND ss.schedule_id = ?

//     ORDER BY va.id, s.row_no, s.seat_no
//   `;

//   db.query(sql, [schedule_id, schedule_id], (err, results) => {
//     if (err) {
//       console.error("❌ 座位查询失败:", err);
//       return res.cc("数据库查询失败");
//     }

//     const areaMap = {};

//     results.forEach(r => {
//       if (!areaMap[r.area_id]) {
//         areaMap[r.area_id] = {
//           area_id: r.area_id,
//           area_name: r.area_name,
//           position_x: r.position_x,
//           position_y: r.position_y,
//           width: r.width,
//           height: r.height,
//           price: r.area_price != null ? parseFloat(r.area_price) : 0,
//           seats: []
//         };
//       }

//       // 可能会出现没有座位的区域
//       if (r.seat_id) {
//         areaMap[r.area_id].seats.push({
//           // ✅ 关键：id 返回 schedule_seats.id（否则下单外键必炸）
//           id: r.schedule_seat_id,     // 可能为 null（该场次没生成 schedule_seats）
//           seat_id: r.seat_id,         // seats.id（保留，后续详情/展示用）
//           row_no: r.row_no,
//           seat_no: r.seat_no,
//           position_x: r.seat_x,
//           position_y: r.seat_y,
//           status: r.seat_status || "available",
//           price: r.area_price != null ? parseFloat(r.area_price) : 0
//         });
//       }
//     });

//     res.send({
//       status: 0,
//       message: "获取座位成功",
//       data: Object.values(areaMap)
//     });
//   });
// });

// module.exports = router;
const express = require("express");
const router = express.Router();
const db = require("../db");

router.get("/schedules/:schedule_id/seats", (req, res) => {
  const schedule_id = Number(req.params.schedule_id);
  if (!schedule_id || Number.isNaN(schedule_id)) return res.cc("场次ID无效");

  // ① 先查该场次对应的 venue_id
  const venueSql = `
    SELECT p.venue_id
    FROM performance_schedules ps
    JOIN performances p ON ps.performance_id = p.id
    WHERE ps.id = ?
    LIMIT 1
  `;

  db.query(venueSql, [schedule_id], (err, vRows) => {
    if (err) {
      console.error("❌ 查询场馆失败:", err);
      return res.cc("数据库查询失败");
    }
    if (!vRows.length) return res.cc("场次不存在");

    const venue_id = vRows[0].venue_id;

    // ② 再查：只取这个 venue 的区域 + 座位 + 该场次状态 + 区域价格
    const sql = `
      SELECT 
        va.id AS area_id,
        va.name AS area_name,
        va.position_x,
        va.position_y,
        va.width,
        va.height,

        sap.price AS area_price,

        s.id AS seat_id,
        s.row_no,
        s.seat_no,
        s.position_x AS seat_x,
        s.position_y AS seat_y,

        ss.id AS schedule_seat_id,
        ss.status AS seat_status

      FROM venue_areas va

      LEFT JOIN schedule_area_prices sap 
        ON sap.area_id = va.id AND sap.schedule_id = ?

      LEFT JOIN seats s 
        ON s.area_id = va.id
      
      LEFT JOIN schedule_seats ss
        ON ss.seat_id = s.id AND ss.schedule_id = ?

      WHERE va.venue_id = ?     -- ✅关键：只查该场馆

      ORDER BY va.id, s.row_no, s.seat_no
    `;

    db.query(sql, [schedule_id, schedule_id, venue_id], (err, results) => {
      if (err) {
        console.error("❌ 座位查询失败:", err);
        return res.cc("数据库查询失败");
      }

      const areaMap = {};

      results.forEach(r => {
        if (!areaMap[r.area_id]) {
          areaMap[r.area_id] = {
            area_id: r.area_id,
            area_name: r.area_name,
            position_x: r.position_x,
            position_y: r.position_y,
            width: r.width,
            height: r.height,
            price: r.area_price != null ? parseFloat(r.area_price) : 0,
            seats: []
          };
        }

        // ✅建议：没有 schedule_seat_id 的座位别返回（避免“没生成场次座位也显示可选”）
        if (r.seat_id && r.schedule_seat_id) {
          areaMap[r.area_id].seats.push({
            id: r.schedule_seat_id, // schedule_seats.id
            seat_id: r.seat_id,     // seats.id
            row_no: r.row_no,
            seat_no: r.seat_no,
            position_x: r.seat_x,
            position_y: r.seat_y,
            status: r.seat_status || "available",
            price: r.area_price != null ? parseFloat(r.area_price) : 0
          });
        }
      });

      res.send({
        status: 0,
        message: "获取座位成功",
        data: Object.values(areaMap)
      });
    });
  });
});

module.exports = router;
