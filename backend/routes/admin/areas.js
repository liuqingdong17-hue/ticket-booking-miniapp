const express = require("express");
const router = express.Router();
const db = require("../../db");

/* =========================================================
   获取某场馆所有区域（含 seat_count）
   GET /admin/areas/venue/:venueId
========================================================= */
router.get("/venue/:venueId", (req, res) => {
  const venueId = req.params.venueId;

  const sql = `
    SELECT 
      a.*,
      v.name AS venue_name,
      (
        SELECT COUNT(*) 
        FROM seats 
        WHERE area_id = a.id
      ) AS seat_count
    FROM venue_areas a
    LEFT JOIN venues v ON a.venue_id = v.id
    WHERE a.venue_id = ?
    ORDER BY a.id ASC
  `;

  db.query(sql, [venueId], (err, results) => {
    if (err) return res.cc(err);

    res.send({
      status: 0,
      data: results
    });
  });
});

/* =========================================================
   获取单个区域（含 seat_count）
   GET /admin/areas/:id
========================================================= */
router.get("/:id", (req, res) => {
  const areaId = req.params.id;

  const sqlArea = `SELECT * FROM venue_areas WHERE id = ?`;
  const sqlSeatCount = `SELECT COUNT(*) AS seat_count FROM seats WHERE area_id = ?`;

  db.query(sqlArea, [areaId], (err, areaRows) => {
    if (err) return res.cc(err);
    if (areaRows.length === 0) return res.cc("区域不存在");

    const area = areaRows[0];

    db.query(sqlSeatCount, [areaId], (err2, seatRows) => {
      if (err2) return res.cc(err2);

      area.seat_count = seatRows[0].seat_count || 0;

      res.send({
        status: 0,
        data: area
      });
    });
  });
});

/* =========================================================
   新增区域
   POST /admin/areas
========================================================= */
router.post("/", (req, res) => {
  const body = req.body;

  db.query("INSERT INTO venue_areas SET ?", body, err => {
    if (err) return res.cc(err);

    res.cc("新增区域成功", 0);
  });
});

/* =========================================================
   修改区域
   PUT /admin/areas/:id
========================================================= */
router.put("/:id", (req, res) => {
  const id = req.params.id;
  const body = req.body;

  db.query(
    "UPDATE venue_areas SET ? WHERE id = ?",
    [body, id],
    err => {
      if (err) return res.cc(err);
      res.cc("区域更新成功", 0);
    }
  );
});

/* =========================================================
   删除区域
   DELETE /admin/areas/:id
========================================================= */
router.delete("/:id", (req, res) => {
  const id = req.params.id;

  db.query("DELETE FROM venue_areas WHERE id = ?", [id], err => {
    if (err) return res.cc(err);
    res.cc("删除区域成功", 0);
  });
});

module.exports = router;
