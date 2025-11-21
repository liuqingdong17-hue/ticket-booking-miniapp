// routes/artists.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;

// 错误处理快捷函数
const handleError = (res, error, status = 500) => {
  console.error(error);
  res.status(status).json({ error: error.message || '服务器错误' });
};

// ================== 获取艺人信息 ==================
router.get('/:artistId', (req, res) => {
  const artistId = parseInt(req.params.artistId);
  const token = req.headers.authorization?.split(' ')[1];
  let userId = null;

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      userId = decoded.userId;
    } catch (err) {
      // Token 无效，忽略
    }
  }

  db.query(
    'SELECT id, name, avatar, description FROM artists WHERE id = ?',
    [artistId],
    (err, artistRows) => {
      if (err) return handleError(res, err);
      if (!artistRows.length) return res.status(404).json({ error: '艺人不存在' });

      db.query(
        'SELECT COUNT(*) AS fans FROM user_artist_follows WHERE artist_id = ?',
        [artistId],
        (err, followCountRows) => {
          if (err) return handleError(res, err);

          db.query(
            `SELECT COUNT(*) AS shows
             FROM performance_artists pa
             JOIN performances p ON pa.performance_id = p.id
             WHERE pa.artist_id = ?`,
            [artistId],
            (err, showCountRows) => {
              if (err) return handleError(res, err);

              if (!userId) {
                // 未登录
                return res.json({
                  id: artistRows[0].id,
                  name: artistRows[0].name,
                  avatar: artistRows[0].avatar,
                  description: artistRows[0].description,
                  fans: followCountRows[0].fans,
                  shows: showCountRows[0].shows,
                  isFollowing: false
                });
              }

              db.query(
                'SELECT 1 FROM user_artist_follows WHERE user_id = ? AND artist_id = ?',
                [userId, artistId],
                (err, followRows) => {
                  if (err) return handleError(res, err);

                  const isFollowing = followRows.length > 0;

                  res.json({
                    id: artistRows[0].id,
                    name: artistRows[0].name,
                    avatar: artistRows[0].avatar,
                    description: artistRows[0].description,
                    fans: followCountRows[0].fans,
                    shows: showCountRows[0].shows,
                    isFollowing
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

// ================== 查询艺人演出列表 ==============
// 获取艺人相关的演出列表，按时间排序
router.get('/:artistId/performances', (req, res) => {
  const artistId = parseInt(req.params.artistId);

  // 查询艺人相关的演出，按时间排序
  db.query(
    `SELECT p.id, p.name, p.category, p.city, p.cover_url, p.popularity,
            GROUP_CONCAT(DISTINCT a.name SEPARATOR ',') AS artists,
            MIN(DATE_FORMAT(s.schedule_time, '%Y-%m-%d %H:%i:%s')) AS start_time,
            v.name AS venue_name,
            MIN(t.price) AS min_price
     FROM performances p
     JOIN performance_artists pa ON p.id = pa.performance_id
     LEFT JOIN artists a ON pa.artist_id = a.id
     LEFT JOIN performance_schedules s ON p.id = s.performance_id
     LEFT JOIN venues v ON p.venue_id = v.id
     LEFT JOIN ticket_types t ON p.id = t.performance_id
     WHERE pa.artist_id = ?
     GROUP BY p.id
     ORDER BY start_time ASC`,  // 按演出时间排序
    [artistId],
    (err, results) => {
      if (err) {
        return handleError(res, err);
      }

      if (!results.length) {
        return res.status(404).json({ error: '未找到该艺人的演出信息' });
      }

      res.json({
        status: 0,
        message: '获取演出数据成功',
        data: results
      });
    }
  );
});


// ================== 查询关注状态 ==================
router.get('/:artistId/follow-status', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: '未登录' });

  let userId;
  try {
    userId = jwt.verify(token, JWT_SECRET).userId;
  } catch (err) {
    return res.status(401).json({ error: 'Token无效' });
  }

  const artistId = parseInt(req.params.artistId);

  db.query('SELECT 1 FROM artists WHERE id = ?', [artistId], (err, artistRows) => {
    if (err) return handleError(res, err);
    if (!artistRows.length) return res.status(404).json({ error: '艺人不存在' });

    db.query(
      'SELECT 1 FROM user_artist_follows WHERE user_id = ? AND artist_id = ?',
      [userId, artistId],
      (err, followRows) => {
        if (err) return handleError(res, err);
        res.json({ isFollowing: followRows.length > 0 });
      }
    );
  });
});

// ================== 关注艺人 ==================
router.post('/follow', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: '未登录' });

  let userId;
  try {
    userId = jwt.verify(token, JWT_SECRET).userId;
  } catch (err) {
    return res.status(401).json({ error: 'Token无效' });
  }

  const { artist_id: artistId } = req.body;
  if (!artistId) return res.status(400).json({ error: '参数错误' });

  db.query('SELECT 1 FROM artists WHERE id = ?', [artistId], (err, artistRows) => {
    if (err) return handleError(res, err);
    if (!artistRows.length) return res.status(404).json({ error: '艺人不存在' });

    db.query(
      'SELECT 1 FROM user_artist_follows WHERE user_id = ? AND artist_id = ?',
      [userId, artistId],
      (err, existingRows) => {
        if (err) return handleError(res, err);
        if (existingRows.length) return res.status(409).json({ error: '已关注' });

        db.query(
          'INSERT INTO user_artist_follows (user_id, artist_id) VALUES (?, ?)',
          [userId, artistId],
          (err) => {
            if (err) return handleError(res, err);
            res.status(201).json({ message: '关注成功', isFollowing: true });
          }
        );
      }
    );
  });
});

// ================== 取关艺人 ==================
router.post('/unfollow', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: '未登录' });

  let userId;
  try {
    userId = jwt.verify(token, JWT_SECRET).userId;
  } catch (err) {
    return res.status(401).json({ error: 'Token无效' });
  }

  const { artist_id: artistId } = req.body;
  if (!artistId) return res.status(400).json({ error: '参数错误' });

  db.query(
    'SELECT 1 FROM user_artist_follows WHERE user_id = ? AND artist_id = ?',
    [userId, artistId],
    (err, existingRows) => {
      if (err) return handleError(res, err);
      if (!existingRows.length) return res.status(404).json({ error: '未关注' });

      db.query(
        'DELETE FROM user_artist_follows WHERE user_id = ? AND artist_id = ?',
        [userId, artistId],
        (err) => {
          if (err) return handleError(res, err);
          res.json({ message: '取关成功', isFollowing: false });
        }
      );
    }
  );
});

// ================== 获取用户关注的艺人列表 ==================
router.get('/followed/list', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: '未登录' });

  let userId;
  try {
    userId = jwt.verify(token, JWT_SECRET).userId;
  } catch (err) {
    return res.status(401).json({ error: 'Token无效' });
  }

  const sql = `
  SELECT 
    a.id,
    a.name,
    a.avatar,
    COUNT(f2.id) AS follower_count,   -- 粉丝数
    COUNT(p.id) AS performance_count  -- 演出数
  FROM user_artist_follows f
  JOIN artists a ON f.artist_id = a.id
  LEFT JOIN user_artist_follows f2 ON f2.artist_id = a.id  -- 粉丝数统计
  LEFT JOIN performance_artists pa ON pa.artist_id = a.id
  LEFT JOIN performances p ON p.id = pa.performance_id     -- 去掉 p.status
  WHERE f.user_id = ?
  GROUP BY a.id
  ORDER BY f.id DESC
`;


  db.query(sql, [userId], (err, results) => {
    if (err) return handleError(res, err);
    res.json({
      status: 0,
      message: "获取关注的艺人成功",
      data: results
    });
  });
});


module.exports = router;
