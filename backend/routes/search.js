const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
  let { keyword, page = 1, pageSize = 10 } = req.query;

  // 解码 keyword，避免URL编码错误
  keyword = decodeURIComponent(keyword);
  const offset = (page - 1) * pageSize;

  // 构建查询条件
  const searchCondition = keyword ? 
    'AND (p.name LIKE ? OR v.name LIKE ? OR a.name LIKE ?)' 
    : '';

  const params = keyword 
    ? [`%${keyword}%`, `%${keyword}%`, `%${keyword}%`, offset, parseInt(pageSize)] 
    : [offset, parseInt(pageSize)];

  const sql = `
    SELECT p.id, p.name, p.category, p.city, p.cover_url, p.popularity,
           GROUP_CONCAT(DISTINCT a.name SEPARATOR ',') AS artists,
           MIN(DATE_FORMAT(s.schedule_time, '%Y-%m-%d %H:%i:%s')) AS start_time,
           v.name AS venue_name,
           MIN(t.price) AS min_price
    FROM performances p
    LEFT JOIN performance_artists pa ON p.id = pa.performance_id
    LEFT JOIN artists a ON pa.artist_id = a.id
    LEFT JOIN performance_schedules s ON p.id = s.performance_id
    LEFT JOIN venues v ON p.venue_id = v.id
    LEFT JOIN ticket_types t ON s.id = t.schedule_id
    WHERE 1 = 1
      ${searchCondition}
    GROUP BY p.id
    LIMIT ?, ?`;

  // 执行查询
  db.query(sql, params, (err, result) => {
    if (err) {
      console.error('SQL Error:', err);
      return res.cc('数据库查询失败');
    }

    // 解析艺人信息
    const artistNames = result.flatMap(item => item.artists.split(','));
    const uniqueArtistNames = [...new Set(artistNames)]; // 去重艺人名字

    if (uniqueArtistNames.length) {
      // 查询艺人详细信息
      const artistSql = `
        SELECT 
          id, name, avatar,
          (SELECT COUNT(*) FROM user_artist_follows WHERE artist_id = a.id) AS fans_count,
          (SELECT COUNT(*) FROM performance_artists WHERE artist_id = a.id) AS shows_count
        FROM artists a
        WHERE a.name IN (?)`;

      db.query(artistSql, [uniqueArtistNames], (err, artistResult) => {
        if (err) {
          console.error('Artist Query Error:', err);
          return res.cc('艺人数据查询失败');
        }

        // 将艺人数据添加到每个演出中
        result.forEach(performance => {
          performance.artists = performance.artists.split(',').map(artistName => {
            const artist = artistResult.find(a => a.name === artistName);
            if (artist) {
              return {
                id: artist.id,
                name: artist.name,
                avatar: artist.avatar,
                fans_count: artist.fans_count,
                shows_count: artist.shows_count
              };
            }
            return null;
          }).filter(Boolean); // 过滤掉 null 或 undefined 的艺人数据
        });

        res.send({
          status: 0,
          message: '搜索成功',
          data: {
            performances: result,
            artists: artistResult
          }
        });
      });
    } else {
      res.send({
        status: 0,
        message: '搜索成功',
        data: {
          performances: result,
          artists: []
        }
      });
    }
  });
});

module.exports = router;
