// routes/performanceDetails.js
const express = require('express');
const router = express.Router();
const db = require('../db');

// 获取演出详情
router.get('/detail/:id', (req, res) => {
  const { id } = req.params;
  if (!id || isNaN(id)) return res.cc('演出ID无效', 1);

  // 查询演出基本信息
  db.query(
    `SELECT p.id, p.name, p.category, p.city, p.cover_url, p.venue_id, 
            p.popularity, p.description,
            v.name AS venue_name, v.address AS venue_address, 
            v.has_seat_map, v.seat_map_url
     FROM performances p
     LEFT JOIN venues v ON p.venue_id = v.id
     WHERE p.id = ?`,
    [id],
    (err, performanceResult) => {
      if (err) return res.cc('数据库错误，请稍后重试', 1);
      if (!performanceResult.length) return res.cc('演出不存在', 1);

      const performance = performanceResult[0];

      // 查询是否可选座
      db.query(
        `SELECT selectable_seats 
         FROM performance_services 
         WHERE performance_id = ? LIMIT 1`,
        [id],
        (err, serviceFlagResult) => {
          if (err) return res.cc('数据库错误，请稍后重试', 1);

          const selectableSeats = serviceFlagResult[0]?.selectable_seats || 0;

          /* ---------- 价格区间 SQL ---------- */
          const priceSql = selectableSeats
            ? `
              SELECT MIN(sap.price) AS min_price, MAX(sap.price) AS max_price
              FROM schedule_area_prices sap
              JOIN performance_schedules s ON sap.schedule_id = s.id
              WHERE s.performance_id = ?
            `
            : `
              SELECT MIN(t.price) AS min_price, MAX(t.price) AS max_price
              FROM ticket_types t
              JOIN performance_schedules s ON t.schedule_id = s.id
              WHERE t.performance_id = ?
            `;

          db.query(priceSql, [id], (err, priceResult) => {
            if (err) return res.cc('数据库错误，请稍后重试', 1);

            const { min_price, max_price } = priceResult[0] || {};
            let priceRange = '暂无票价';
            if (min_price != null && max_price != null) {
              priceRange =
                min_price === max_price
                  ? `￥${Number(min_price).toFixed(2)}`
                  : `￥${Number(min_price).toFixed(2)}-${Number(max_price).toFixed(2)}`;
            }

            /* ---------- 是否可售 ---------- */
            const availableSql = selectableSeats
              ? `
                SELECT COUNT(*) AS cnt
                FROM performance_schedules
                WHERE performance_id = ? AND schedule_time > NOW()
              `
              : `
                SELECT COUNT(*) AS cnt
                FROM ticket_types t
                JOIN performance_schedules s ON t.schedule_id = s.id
                WHERE t.performance_id = ? AND t.stock > 0 AND s.schedule_time > NOW()
              `;

            db.query(availableSql, [id], (err, availableResult) => {
              if (err) return res.cc('数据库错误，请稍后重试', 1);

              const isAvailable = availableResult[0].cnt > 0;

              /* ---------- 查询最早场次 ---------- */
              db.query(
                `SELECT DATE_FORMAT(schedule_time, '%Y-%m-%d %H:%i') AS start_time, duration
                 FROM performance_schedules
                 WHERE performance_id = ?
                 ORDER BY schedule_time ASC
                 LIMIT 1`,
                [id],
                (err, timeResult) => {
                  if (err) return res.cc('数据库错误，请稍后重试', 1);

                  const { start_time, duration } = timeResult[0] || {};

                  /* ---------- 查询服务 ---------- */
                  db.query(
                    `SELECT refundable, selectable_seats, real_name_required, 
                            ticket_exchangeable, electronic_ticket 
                     FROM performance_services 
                     WHERE performance_id = ?`,
                    [id],
                    (err, serviceResult) => {
                      if (err) return res.cc('数据库错误，请稍后重试', 1);

                      const services = serviceResult[0] || {
                        refundable: 0,
                        selectable_seats: 0,
                        real_name_required: 0,
                        ticket_exchangeable: 0,
                        electronic_ticket: 0
                      };

                      /* ---------- 查询艺人 ---------- */
                      db.query(
                        'SELECT artist_id FROM performance_artists WHERE performance_id = ?',
                        [id],
                        (err, artistResult) => {
                          if (err) return res.cc('数据库错误，请稍后重试', 1);

                          if (performance.description) {
                            performance.description = performance.description.replace(
                              /<img/gi,
                              '<img style="max-width:100%;height:auto;display:block;margin:20rpx 0;border-radius:12rpx;"'
                            );
                          }

                          /* ---------- ⭐ 查询评分 ---------- */
                          db.query(
                            `SELECT 
                                COUNT(*) AS count,
                                AVG(rating) * 2 AS avg_score
                             FROM performance_reviews
                             WHERE performance_id = ?`,
                            [id],
                            (err, scoreResult) => {
                              if (err) return res.cc('数据库错误，请稍后重试', 1);

                              const scoreInfo = scoreResult[0] || {};
                              const avgScore = scoreInfo.avg_score
                                ? Number(scoreInfo.avg_score).toFixed(1)
                                : null;
                              const reviewCount = scoreInfo.count || 0;

                              /* ---------- 最终返回 ---------- */
                              res.send({
                                status: 0,
                                message: '获取演出详情成功',
                                data: {
                                  ...performance,

                                  cover_url: performance.cover_url?.startsWith('http')
                                    ? performance.cover_url
                                    : `http://localhost:3000${performance.cover_url}`,

                                  seat_map_url: performance.seat_map_url
                                    ? (performance.seat_map_url.startsWith('http')
                                      ? performance.seat_map_url
                                      : `http://localhost:3000${performance.seat_map_url}`)
                                    : '',

                                  price_range: priceRange,
                                  start_time,
                                  duration,
                                  isAvailable,
                                  ...services,
                                  artists: artistResult.map(a => a.artist_id),

                                  avg_score: avgScore,      // ⭐ 平均分（10 分制）
                                  review_count: reviewCount // ⭐ 评论数量
                                }
                              });
                            }
                          );
                        }
                      );
                    }
                  );
                }
              );
            });
          });
        }
      );
    }
  );
});

module.exports = router;
