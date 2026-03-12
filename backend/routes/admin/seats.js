// admin/seats.js
const express = require("express");
const router = express.Router();
const db = require("../../db");

/* =========================================================
   1. 获取某区域全部座位模板
========================================================= */
router.get("/areas/:area_id/seats", (req, res) => {
  const { area_id } = req.params;

  const sql = `
    SELECT *
    FROM seats
    WHERE area_id = ?
    ORDER BY row_no, seat_no
  `;

  db.query(sql, [area_id], (err, results) => {
    if (err) return res.cc(err);
    res.send({ status: 0, data: results });
  });
});

/* =========================================================
   2. 批量生成某区域座位模板（改为绝对坐标 ⭐⭐）
========================================================= */
router.post("/areas/:area_id/seats/batch-generate", (req, res) => {
  const { area_id } = req.params;
  const {
    startRow,
    rows,
    seatsPerRow,
    startX,
    startY,
    gapX,
    gapY,
  } = req.body;

  // ⭐ 第一步：查区域坐标（绝对）
  const areaSql = `SELECT position_x, position_y FROM venue_areas WHERE id = ?`;

  db.query(areaSql, [area_id], (err, areaRows) => {
    if (err) return res.cc(err);
    if (areaRows.length === 0) return res.cc("区域不存在");

    const areaX = areaRows[0].position_x; // 区域左上角绝对坐标
    const areaY = areaRows[0].position_y;

    const values = [];

    // 第二步：生成绝对坐标
    for (let i = 0; i < rows; i++) {
      const row_no = startRow + i;
      for (let j = 1; j <= seatsPerRow; j++) {
        const seat_no = j;

        // ⭐ 相对区域的偏移
        const offsetX = startX + (seat_no - 1) * gapX;
        const offsetY = startY + i * gapY;

        // ⭐ 绝对位置 = 区域左上角 + 您设置的偏移
        const absX = areaX + offsetX;
        const absY = areaY + offsetY;

        values.push([area_id, row_no, seat_no, absX, absY]);
      }
    }

    const sql = `
      INSERT INTO seats (area_id, row_no, seat_no, position_x, position_y)
      VALUES ?
    `;

    db.query(sql, [values], (err) => {
      if (err) return res.cc(err);
      res.cc("批量生成成功", 0);
    });
  });
});

/* =========================================================
   3. 修改单个座位模板
========================================================= */
router.put("/seats/:id", (req, res) => {
  db.query(
    `UPDATE seats SET ? WHERE id = ?`,
    [req.body, req.params.id],
    (err) => {
      if (err) return res.cc(err);
      res.cc("修改成功", 0);
    }
  );
});

/* =========================================================
   4. 删除单个座位模板
========================================================= */
router.delete("/seats/:id", (req, res) => {
  db.query(
    `DELETE FROM seats WHERE id = ?`,
    [req.params.id],
    (err) => {
      if (err) return res.cc(err);
      res.cc("删除成功", 0);
    }
  );
});

module.exports = router;
