const express = require("express");
const router = express.Router();
const db = require("../../db");
const multer = require("multer");

/* =========================================================
   ⭐ 艺人头像上传（和演出封面一致）
   POST /admin/artists/upload
========================================================= */
const upload = multer({
  dest: "public/uploads/"
});

router.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) return res.cc("未上传文件");

  const url = `http://localhost:3000/public/uploads/${req.file.filename}`;

  res.send({
    status: 0,
    url
  });
});

/* ======================
   1. 艺人列表（分页 + 搜索）
   路径：GET /admin/artists
   ====================== */
router.get("/", (req, res) => {
  const { page = 1, pageSize = 10, keyword = "" } = req.query;
  const offset = (page - 1) * pageSize;

  const listSql = `
    SELECT * FROM artists
    WHERE name LIKE ?
    ORDER BY id DESC
    LIMIT ?, ?
  `;

  db.query(listSql, [`%${keyword}%`, offset, Number(pageSize)], (err, list) => {
    if (err) return res.cc(err);

    const countSql = `SELECT COUNT(*) AS total FROM artists WHERE name LIKE ?`;

    db.query(countSql, [`%${keyword}%`], (err2, cnt) => {
      if (err2) return res.cc(err2);

      res.send({
        status: 0,
        data: list,
        total: cnt[0].total
      });
    });
  });
});

// 获取全部艺人（给演出新增/编辑使用）
router.get("/simple/list", (req, res) => {
  const sql = `SELECT id, name FROM artists ORDER BY id DESC`;
  db.query(sql, (err, results) => {
    if (err) return res.cc(err);
    res.send({ status: 0, data: results });
  });
});

/* ======================
   2. 新增艺人
   路径：POST /admin/artists
   ====================== */
router.post("/", (req, res) => {
  const { name, avatar, description } = req.body;

  if (!name) return res.cc("艺人名称不能为空");

  const sql = `
    INSERT INTO artists (name, avatar, description, created_at)
    VALUES (?, ?, ?, NOW())
  `;

  db.query(sql, [name, avatar, description], err => {
    if (err) return res.cc(err);
    res.cc("新增成功", 0);
  });
});


/* ======================
   3. 获取艺人详情
   路径：GET /admin/artists/:id
   ====================== */
router.get("/:id", (req, res) => {
  db.query(`SELECT * FROM artists WHERE id = ?`, [req.params.id], (err, rows) => {
    if (err) return res.cc(err);
    if (!rows.length) return res.cc("艺人不存在");
    res.send({ status: 0, data: rows[0] });
  });
});


/* ======================
   4. 修改艺人
   路径：PUT /admin/artists/:id
   ====================== */
router.put("/:id", (req, res) => {
  const { name, avatar, description } = req.body;
  const id = req.params.id;

  const sql = `
    UPDATE artists
    SET
      name = ?,
      avatar = ?,
      description = ?
    WHERE id = ?
  `;

  db.query(
    sql,
    [
      name,
      avatar || null,   // ⭐ 关键：允许为空，但不误伤
      description,
      id
    ],
    (err) => {
      if (err) return res.cc(err);
      res.cc("修改成功", 0);
    }
  );
});



/* ======================
   5. 删除艺人（含解除演出绑定）
   路径：DELETE /admin/artists/:id
   ====================== */
router.delete("/:id", (req, res) => {
  const id = req.params.id;

  // 删除演出绑定
  db.query(`DELETE FROM performance_artists WHERE artist_id = ?`, [id], () => {});

  // 删除艺人
  db.query(`DELETE FROM artists WHERE id = ?`, [id], (err) => {
    if (err) return res.cc(err);
    res.cc("删除成功", 0);
  });
});

module.exports = router;
