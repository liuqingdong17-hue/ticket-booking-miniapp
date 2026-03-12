const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
  let { keyword, page = 1, pageSize = 10 } = req.query;

  keyword = decodeURIComponent(keyword);
  const offset = (page - 1) * pageSize;

  // 搜索条件
  const searchCondition = keyword 
    ? 'AND (p.name LIKE ? OR v.name LIKE ? OR a.name LIKE ?)' 
    : '';

  const params = keyword 
    ? [`%${keyword}%`, `%${keyword}%`, `%${keyword}%`, offset, parseInt(pageSize)] 
    : [offset, parseInt(pageSize)];

  // 第一次查询：不查询价格（避免 only_full_group_by 报错）
  const sql = `
    SELECT 
      p.id, p.name, p.category, p.city, p.cover_url, p.popularity,
      GROUP_CONCAT(DISTINCT a.name SEPARATOR ',') AS artists,
      MIN(DATE_FORMAT(s.schedule_time, '%Y-%m-%d %H:%i:%s')) AS start_time,
      v.name AS venue_name
    FROM performances p
    LEFT JOIN performance_artists pa ON p.id = pa.performance_id
    LEFT JOIN artists a ON pa.artist_id = a.id
    LEFT JOIN performance_schedules s ON p.id = s.performance_id
    LEFT JOIN venues v ON p.venue_id = v.id
    WHERE 1 = 1
      ${searchCondition}
    GROUP BY p.id
    LIMIT ?, ?`;

  db.query(sql, params, (err, result) => {
    if (err) {
      console.error('SQL Error:', err);
      return res.cc('数据库查询失败');
    }

    if (!result.length) {
      return res.send({
        status: 0,
        message: '搜索成功',
        data: {
          performances: [],
          artists: []
        }
      });
    }

    const performanceIds = result.map(r => r.id);
    const uniqueArtistNames = [...new Set(result.flatMap(item => item.artists.split(',')))];

    let pending = result.length;

    // ⭐ 为每个演出查询 selectable_seats + 最低票价
    result.forEach((item, index) => {
      db.query(
        `SELECT selectable_seats FROM performance_services WHERE performance_id = ? LIMIT 1`,
        [item.id],
        (err2, flagResult) => {
          const selectableSeats = flagResult?.[0]?.selectable_seats || 0;

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
            result[index].min_price = priceResult?.[0]?.min_price || null;

            pending--;
            if (pending === 0) {
              // 再查艺人详情（你的原逻辑不变）
              if (uniqueArtistNames.length) {
                const artistSql = `
                  SELECT 
                    id, name, avatar,
                    (SELECT COUNT(*) FROM user_artist_follows WHERE artist_id = a.id) AS fans_count,
                    (SELECT COUNT(*) FROM performance_artists WHERE artist_id = a.id) AS shows_count
                  FROM artists a
                  WHERE a.name IN (?)`;

                db.query(artistSql, [uniqueArtistNames], (err4, artistData) => {
                  if (err4) return res.cc('艺人数据查询失败');

                  // 匹配艺人信息
                  result.forEach(perf => {
                    perf.artists = perf.artists.split(',').map(name => {
                      const artist = artistData.find(a => a.name === name);
                      return artist ? {
                        id: artist.id,
                        name: artist.name,
                        avatar: artist.avatar,
                        fans_count: artist.fans_count,
                        shows_count: artist.shows_count
                      } : null;
                    }).filter(Boolean);
                  });

                  res.send({
                    status: 0,
                    message: '搜索成功',
                    data: {
                      performances: result,
                      artists: artistData
                    }
                  });
                });

              } else {
                // 没有艺人数据
                res.send({
                  status: 0,
                  message: '搜索成功',
                  data: {
                    performances: result,
                    artists: []
                  }
                });
              }
            }
          });
        }
      );
    });
  });
});

module.exports = router;
