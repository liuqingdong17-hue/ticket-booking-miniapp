const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middlewares/auth'); // 引入上面的中间件

// 获取用户“想看”的演出列表
router.get('/', auth, (req, res) => {
  const userId = req.user.userId; // 从 token 里取 userId

  const sql = `
    SELECT
      p.id, p.name, p.category, p.city, p.cover_url, p.popularity,
      GROUP_CONCAT(DISTINCT a.name SEPARATOR ',') AS artists,
      MIN(DATE_FORMAT(s.schedule_time, '%Y-%m-%d %H:%i:%s')) AS start_time,
      v.name AS venue_name,
      MIN(t.price) AS min_price,
      MAX(uf.created_at) AS favorite_time,
      CASE 
        WHEN MIN(s.schedule_time) < NOW() THEN 1   -- 已下架
        ELSE 0                                    -- 未下架
      END AS isExpired
    FROM user_favorites uf
    JOIN performances p ON uf.performance_id = p.id
    LEFT JOIN performance_artists pa ON p.id = pa.performance_id
    LEFT JOIN artists a ON pa.artist_id = a.id
    LEFT JOIN performance_schedules s ON p.id = s.performance_id
    LEFT JOIN venues v ON p.venue_id = v.id
    LEFT JOIN ticket_types t ON s.id = t.schedule_id
    WHERE uf.user_id = ?
    GROUP BY p.id
    ORDER BY favorite_time DESC;
  `;

  db.query(sql, [userId], (err, results) => {
    if (err) return res.cc(err);
    res.send({
      status: 0,
      message: '获取想看演出成功',
      data: results
    });
  });
});

module.exports = router;
