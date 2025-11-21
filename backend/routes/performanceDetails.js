// routes/performanceDetails.js
const express = require('express');
const router = express.Router();
const db = require('../db');

// 获取演出详情
router.get('/detail/:id', (req, res) => {
  const { id } = req.params;
  if (!id || isNaN(id)) {
    return res.cc('演出ID无效', 1);
  }

  // 查询演出基本信息和场馆信息
  db.query(
    `SELECT p.id, p.name, p.category, p.city, p.cover_url, p.venue_id, p.popularity, p.description,
            v.name AS venue_name, v.address AS venue_address, v.has_seat_map, v.seat_map_url
     FROM performances p
     LEFT JOIN venues v ON p.venue_id = v.id
     WHERE p.id = ?`,
    [id],
    (err, performanceResult) => {
      if (err) {
        console.error('Database error:', err);
        return res.cc('数据库错误，请稍后重试', 1);
      }
      if (!performanceResult.length) {
        return res.cc('演出不存在', 1);
      }

      const performance = performanceResult[0];

      // 查询票价区间 & 可售状态
      db.query(
        `SELECT 
           MIN(t.price) as min_price, 
           MAX(t.price) as max_price,
           SUM(CASE WHEN t.stock > 0 AND s.schedule_time > NOW() THEN 1 ELSE 0 END) as available_count
         FROM ticket_types t
         JOIN performance_schedules s ON t.schedule_id = s.id
         WHERE t.performance_id = ?`,
        [id],
        (err, priceResult) => {
          if (err) {
            console.error('Database error:', err);
            return res.cc('数据库错误，请稍后重试', 1);
          }

          const { min_price, max_price, available_count } = priceResult[0] || { min_price: null, max_price: null, available_count: 0 };
          let priceRange = '暂无票价';
          if (min_price !== null && max_price !== null && !isNaN(min_price) && !isNaN(max_price)) {
            priceRange = min_price === max_price
              ? `￥${Number(min_price).toFixed(2)}`
              : `￥${Number(min_price).toFixed(2)}-${Number(max_price).toFixed(2)}`;
          }

          const isAvailable = available_count > 0; // 👈 判断是否还能买票

          // 查询最早演出时间和对应时长
          db.query(
            `SELECT DATE_FORMAT(schedule_time, '%Y-%m-%d %H:%i') AS start_time, duration
             FROM performance_schedules
             WHERE performance_id = ?
             AND schedule_time = (
               SELECT MIN(schedule_time)
               FROM performance_schedules
               WHERE performance_id = ?
             ) LIMIT 1`,
            [id, id],
            (err, timeResult) => {
              if (err) {
                console.error('Database error:', err);
                return res.cc('数据库错误，请稍后重试', 1);
              }

              const { start_time, duration } = timeResult[0] || { start_time: '待定', duration: 0 };

              // 查询服务信息
              db.query(
                `SELECT refundable, selectable_seats, real_name_required, ticket_exchangeable, electronic_ticket 
                 FROM performance_services WHERE performance_id = ?`,
                [id],
                (err, serviceResult) => {
                  if (err) {
                    console.error('Database error:', err);
                    return res.cc('数据库错误，请稍后重试', 1);
                  }

                  const services = serviceResult[0] || { refundable: 0, selectable_seats: 0, real_name_required: 0, ticket_exchangeable: 0, electronic_ticket: 0 };

                  // 查询艺人id列表
                  db.query(
                    'SELECT artist_id FROM performance_artists WHERE performance_id = ?',
                    [id],
                    (err, artistResult) => {
                      if (err) {
                        console.error('Database error:', err);
                        return res.cc('数据库错误，请稍后重试', 1);
                      }

                      // ✅ 处理 description 的 <img> 标签，自动加样式
                      if (performance.description) {
                        performance.description = performance.description.replace(
                          /<img/gi,
                          '<img style="max-width:100%;height:auto;display:block;margin:20rpx 0;border-radius:12rpx;"'
                        );
                      }

                      // 整理艺人id数组
                      const artists = artistResult.map(item => item.artist_id);

                      res.send({
                        status: 0,
                        message: '获取演出详情成功',
                        data: {
                          ...performance,
                          cover_url: performance.cover_url?.startsWith('http') ? performance.cover_url : `http://localhost:3000${performance.cover_url}`,
                          seat_map_url: performance.seat_map_url
                            ? (performance.seat_map_url.startsWith('http')
                              ? performance.seat_map_url
                              : `http://localhost:3000${performance.seat_map_url}`)
                            : '',
                          price_range: priceRange,
                          start_time,
                          duration,
                          ...services,
                          artists,     // 👈 返回艺人id数组
                          isAvailable  // 👈 返回能否购票
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
    }
  );
});

module.exports = router;
