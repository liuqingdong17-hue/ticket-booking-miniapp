// backend/routes/admin/venues.js
const express = require("express");
const router = express.Router();
const db = require("../../db");
const adminAuth = require('../adminAuth')
const multer = require('multer')

const upload = multer({
  dest: 'public/uploads/'
})
router.post(
  '/upload',
  adminAuth,
  upload.single('file'),
  (req, res) => {
    if (!req.file) return res.cc('未上传文件')

    const url = `http://localhost:3000/public/uploads/${req.file.filename}`

    res.send({
      status: 0,
      url
    })
  }
)

// 获取所有场馆
router.get("/", adminAuth, (req, res) => {
  db.query("SELECT * FROM venues ORDER BY id ASC", (err, results) => {
    if (err) return res.cc(err);
    res.send({ status: 0, data: results });
  });
});

// 获取场馆详情
router.get("/:id", (req, res) => {
  db.query("SELECT * FROM venues WHERE id = ?", [req.params.id], (err, results) => {
    if (err || results.length === 0) return res.cc("未找到该场馆");
    res.send({ status: 0, data: results[0] });
  });
});

// 修改场馆
router.put("/:id",adminAuth, (req, res) => {
  db.query(
    "UPDATE venues SET ? WHERE id = ?",
    [req.body, req.params.id],
    err => {
      if (err) return res.cc(err);
      res.cc("修改成功", 0);
    }
  );
});

// 新增场馆
router.post("/",adminAuth, (req, res) => {
  const {
    name,
    province,
    city,
    address,
    has_seat_map,
    seat_map_url
  } = req.body;

  if (!name || !city) {
    return res.cc("场馆名称和城市不能为空");
  }

  const sql = `
    INSERT INTO venues
    (name, province, city, address, has_seat_map, seat_map_url)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [
      name,
      province || "",
      city,
      address || "",
      has_seat_map || 0,
      seat_map_url || null
    ],
    (err, result) => {
      if (err) return res.cc(err);
      res.cc("新增成功", 0);
    }
  );
});

module.exports = router;
