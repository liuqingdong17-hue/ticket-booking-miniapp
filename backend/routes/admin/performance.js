const express = require("express");
const router = express.Router();
const db = require("../../db");
const multer = require("multer");

// 上传模块
const upload = multer({ dest: "public/uploads/" });

/* =========================================================
   上传封面
   ========================================================= */
router.post("/upload", upload.single("file"), (req, res) => {
  const url = "http://localhost:3000/public/uploads/" + req.file.filename;
  res.send({ status: 0, url });
});

/* =========================================================
   演出主表 CRUD（含艺人）
   BASE 路径已改为：/admin/performances
   ========================================================= */


/**
 * 获取所有演出（用于下拉选择）
 * GET /admin/performances/all
 */
router.get("/all", (req, res) => {
  const sql = `
    SELECT id, name
    FROM performances
    ORDER BY id DESC
  `;

  db.query(sql, (err, rows) => {
    if (err) return res.cc(err);
    res.send({ status: 0, data: rows });
  });
});

/**
 * 获取演出列表（含场馆名 + 艺人列表）
 * GET /admin/performances
 */
router.get("/", (req, res) => {
  const { page = 1, pageSize = 10, keyword = "" } = req.query;
  const offset = (page - 1) * pageSize;

  const sql = `
    SELECT p.*, v.name AS venue_name
    FROM performances p
    LEFT JOIN venues v ON p.venue_id = v.id
    WHERE p.name LIKE ? OR p.category LIKE ? OR p.city LIKE ?
    ORDER BY p.id DESC
    LIMIT ?, ?
  `;

  db.query(
    sql,
    [`%${keyword}%`, `%${keyword}%`, `%${keyword}%`, offset, Number(pageSize)],
    (err, results) => {
      if (err) return res.cc(err);

      const ids = results.map((p) => p.id);
      if (ids.length === 0)
        return res.send({ status: 0, data: [], total: 0 });

      // 查所有演出的艺人名
      const artistSql = `
        SELECT pa.performance_id, a.name 
        FROM performance_artists pa
        JOIN artists a ON pa.artist_id = a.id
        WHERE pa.performance_id IN (?)
      `;

      db.query(artistSql, [ids], (err2, artistRows) => {
        if (err2) return res.cc(err2);

        results.forEach((p) => {
          p.artists = artistRows
            .filter((ar) => ar.performance_id === p.id)
            .map((ar) => ar.name);
        });

        const countSql = `
          SELECT COUNT(*) AS total
          FROM performances
          WHERE name LIKE ? OR category LIKE ? OR city LIKE ?
        `;

        db.query(
          countSql,
          [`%${keyword}%`, `%${keyword}%`, `%${keyword}%`],
          (err3, cnt) => {
            if (err3) return res.cc(err3);

            res.send({
              status: 0,
              data: results,
              total: cnt[0].total
            });
          }
        );
      });
    }
  );
});

/**
 * 获取演出详情（含艺人ID数组）
 * GET /admin/performances/:id
 */
router.get("/:id", (req, res) => {
  const id = req.params.id;

  db.query(`SELECT * FROM performances WHERE id = ?`, [id], (err, rows) => {
    if (err || rows.length === 0) return res.cc("未找到演出");

    const perf = rows[0];

    db.query(
      `SELECT artist_id FROM performance_artists WHERE performance_id = ?`,
      [id],
      (err2, artists) => {
        if (err2) return res.cc(err2);

        perf.artist_ids = artists.map((a) => a.artist_id);

        res.send({ status: 0, data: perf });
      }
    );
  });
});

/**
 * 新增演出
 * POST /admin/performances
 */
router.post("/", (req, res) => {
  const data = req.body;

  const sql = `
    INSERT INTO performances
      (name, category, city, cover_url, venue_id, popularity, description, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
  `;

  db.query(
    sql,
    [
      data.name, data.category, data.city, data.cover_url,
      data.venue_id, data.popularity || 0, data.description
    ],
    (err, result) => {
      if (err) return res.cc(err);

      const newId = result.insertId;

      // 创建默认服务
      db.query(
        `
        INSERT INTO performance_services 
          (performance_id, refundable, selectable_seats, real_name_required, ticket_exchangeable, electronic_ticket)
        VALUES (?, 0, 0, 0, 0, 0)
      `,
        [newId]
      );

      // 插入艺人
      if (Array.isArray(data.artist_ids) && data.artist_ids.length > 0) {
        const values = data.artist_ids.map((aid) => [newId, aid]);
        db.query(
          `INSERT INTO performance_artists (performance_id, artist_id) VALUES ?`,
          [values]
        );
      }

      res.send({ status: 0, message: "新增成功", id: newId });
    }
  );
});

/**
 * 修改演出（不覆盖封面图）
 * PUT /admin/performances/:id
 */
router.put("/:id", (req, res) => {
  const id = req.params.id;
  const data = req.body;

  const sql = `
    UPDATE performances
    SET
      name = ?,
      category = ?,
      city = ?,
      venue_id = ?,
      cover_url = ?,
      description = ?
    WHERE id = ?
  `;

  db.query(
    sql,
    [
      data.name,
      data.category,
      data.city,
      data.venue_id,
      data.cover_url || null, // ⭐关键：明确更新封面
      data.description,
      id
    ],
    (err) => {
      if (err) return res.cc(err);

      // ===== 更新艺人绑定 =====
      db.query(
        `DELETE FROM performance_artists WHERE performance_id = ?`,
        [id],
        (err2) => {
          if (err2) return res.cc(err2);

          if (Array.isArray(data.artist_ids) && data.artist_ids.length > 0) {
            const values = data.artist_ids.map((aid) => [id, aid]);

            db.query(
              `INSERT INTO performance_artists (performance_id, artist_id) VALUES ?`,
              [values],
              (err3) => {
                if (err3) return res.cc(err3);
                res.send({ status: 0, message: "修改成功" });
              }
            );
          } else {
            res.send({ status: 0, message: "修改成功" });
          }
        }
      );
    }
  );
});

/**
 * 删除演出
 * DELETE /admin/performances/:id
 */
router.delete("/:id", (req, res) => {
  db.query(
    `DELETE FROM performances WHERE id = ?`,
    [req.params.id],
    (err) => {
      if (err) return res.cc(err);
      res.cc("删除成功", 0);
    }
  );
});

/* =========================================================
   演出艺人绑定
   ========================================================= */

/** 获取某演出的艺人 */
router.get("/:id/artists", (req, res) => {
  db.query(
    `SELECT artist_id FROM performance_artists WHERE performance_id = ?`,
    [req.params.id],
    (err, rows) => {
      if (err) return res.cc(err);
      res.send({ status: 0, data: rows.map((r) => r.artist_id) });
    }
  );
});

/** 更新某演出的艺人 */
router.put("/:id/artists", (req, res) => {
  const id = req.params.id;
  const artists = req.body.artist_ids || [];

  db.query(
    `DELETE FROM performance_artists WHERE performance_id = ?`,
    [id],
    () => {
      if (artists.length === 0) return res.cc("艺人更新成功", 0);

      const values = artists.map((aid) => [id, aid]);

      db.query(
        `INSERT INTO performance_artists (performance_id, artist_id) VALUES ?`,
        [values],
        (err) => {
          if (err) return res.cc(err);
          res.cc("艺人更新成功", 0);
        }
      );
    }
  );
});

/* =========================================================
   服务配置
   ========================================================= */

/** 获取服务配置 */
router.get("/:id/services", (req, res) => {
  const id = req.params.id;

  db.query(
    `SELECT * FROM performance_services WHERE performance_id = ?`,
    [id],
    (err, results) => {
      if (err) return res.cc(err);

      if (results.length === 0) {
        db.query(
          `
          INSERT INTO performance_services 
            (performance_id, refundable, selectable_seats, real_name_required, ticket_exchangeable, electronic_ticket)
          VALUES (?, 0, 0, 0, 0, 0)
        `,
          [id]
        );

        return res.send({
          status: 0,
          data: {
            refundable: 0,
            selectable_seats: 0,
            real_name_required: 0,
            ticket_exchangeable: 0,
            electronic_ticket: 0
          }
        });
      }

      res.send({ status: 0, data: results[0] });
    }
  );
});

/** 更新服务配置 */
router.put("/:id/services", (req, res) => {
  db.query(
    `UPDATE performance_services SET ? WHERE performance_id = ?`,
    [req.body, req.params.id],
    (err) => {
      if (err) return res.cc(err);
      res.cc("服务配置已更新", 0);
    }
  );
});

/* =========================================================
   上下架
   ========================================================= */
router.put("/status/:id", (req, res) => {
  db.query(
    `UPDATE performances SET status = ? WHERE id = ?`,
    [req.body.status, req.params.id],
    (err) => {
      if (err) return res.cc(err);
      res.cc("状态更新成功", 0);
    }
  );
});

module.exports = router;
