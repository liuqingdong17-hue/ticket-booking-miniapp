const express = require('express'); 
const router = express.Router();
const db = require('../db');
const auth = require('../middlewares/auth');

// 获取用户“想看”的演出列表
router.get('/', auth, (req, res) => {
  const userId = req.user.userId;

  const sql = `
    SELECT
      p.id, p.name, p.category, p.city, p.cover_url, p.popularity,p.status,
      GROUP_CONCAT(DISTINCT a.name SEPARATOR ',') AS artists,
      MIN(DATE_FORMAT(s.schedule_time, '%Y-%m-%d %H:%i:%s')) AS start_time,
      v.name AS venue_name,
      MAX(uf.created_at) AS favorite_time,
      CASE 
        WHEN p.status = 1 THEN 0
        ELSE 1
      END AS isExpired
    FROM user_favorites uf
    JOIN performances p ON uf.performance_id = p.id
    LEFT JOIN performance_artists pa ON p.id = pa.performance_id
    LEFT JOIN artists a ON pa.artist_id = a.id
    LEFT JOIN performance_schedules s ON p.id = s.performance_id
    LEFT JOIN venues v ON p.venue_id = v.id
    WHERE uf.user_id = ?
    GROUP BY p.id
    ORDER BY favorite_time DESC;
  `;

  db.query(sql, [userId], (err, results) => {
    if (err) return res.cc(err);

    if (!results.length) {
      return res.send({
        status: 0,
        message: '获取成功',
        data: []
      });
    }

    // ⭐ 对每个演出查询 selectable_seats + 最低价
    let pending = results.length;

    results.forEach((item, index) => {
      // 查 selectable_seats
      db.query(
        `SELECT selectable_seats FROM performance_services WHERE performance_id = ? LIMIT 1`,
        [item.id],
        (err2, serviceFlag) => {
          const selectableSeats = serviceFlag?.[0]?.selectable_seats || 0;

          const priceSql = selectableSeats
            ? `
              SELECT MIN(sap.price) AS min_price
              FROM schedule_area_prices sap
              JOIN performance_schedules s ON sap.schedule_id = s.id
              WHERE s.performance_id = ?
            `
            : `
              SELECT MIN(t.price) AS min_price
              FROM ticket_types t
              JOIN performance_schedules s ON t.schedule_id = s.id
              WHERE t.performance_id = ?
            `;

          db.query(priceSql, [item.id], (err3, priceResult) => {
            results[index].min_price = priceResult?.[0]?.min_price || null;

            pending--;

            if (pending === 0) {
              res.send({
                status: 0,
                message: '获取想看演出成功',
                data: results
              });
            }
          });
        }
      );
    });
  });
});

module.exports = router;
