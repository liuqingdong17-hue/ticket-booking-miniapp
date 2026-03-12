// 后端接口修改（完全修复版）
const db = require('../db');

exports.getRecommendedPerformances = (req, res) => {
  let {
    page = 1,
    pageSize = 10,
    city,
    priceRange,
    startDate,
    category,
    keyword,
    sinceDate,
    untilDate
  } = req.query;

  console.log('Received query:', req.query);

  startDate = !startDate || startDate === "null" ? null : startDate;
  sinceDate = sinceDate || null;
  untilDate = untilDate || null;
  page = Math.max(parseInt(page) || 1, 1);
  pageSize = Math.max(parseInt(pageSize) || 10, 1);
  const offset = (page - 1) * pageSize;

  /* ---------------------------
      价格筛选 SQL 片段
  ---------------------------- */
  let priceCondition = '';
  if (priceRange) {
    switch (priceRange) {
      case '0-100': priceCondition = 'AND t.price < 100'; break;
      case '100-300': priceCondition = 'AND t.price BETWEEN 100 AND 300'; break;
      case '300-500': priceCondition = 'AND t.price BETWEEN 300 AND 500'; break;
      case '500+': priceCondition = 'AND t.price > 500'; break;
    }
  }

  /* ---------------------------
      关键词筛选
  ---------------------------- */
  let keywordCondition = '';
  if (keyword) keywordCondition = 'AND (p.name LIKE ? OR v.name LIKE ? OR a.name LIKE ?)';

  /* ---------------------------
      分类筛选（重要）
  ---------------------------- */
  let categoryCondition = '';
  if (category) categoryCondition = 'AND p.category = ?';

  /* ---------------------------
      日期筛选
  ---------------------------- */
  let dateCondition = '';
  if (sinceDate && untilDate) {
    dateCondition = 'AND s.schedule_time BETWEEN ? AND ?';
  } else if (startDate) {
    dateCondition = 'AND DATE(s.schedule_time) = DATE(?)';
  }

  /* ---------------------------
      共用 WHERE 条件
  ---------------------------- */
  const baseCondition = `
    FROM performances p
    LEFT JOIN performance_artists pa ON p.id = pa.performance_id
    LEFT JOIN artists a ON pa.artist_id = a.id
    LEFT JOIN performance_schedules s ON p.id = s.performance_id
    LEFT JOIN venues v ON p.venue_id = v.id
    LEFT JOIN ticket_types t ON s.id = t.schedule_id
    WHERE 1 = 1
      AND p.status = 1                -- ⭐ 上架演出
      AND (v.city = ? OR ? IS NULL)
      AND s.schedule_time > NOW()
      ${categoryCondition}
      ${priceCondition}
      ${dateCondition}
      ${keywordCondition}
  `;

  /* ---------------------------
      参数顺序（极重要）
  ---------------------------- */
  const queryParams = [
    city || null,
    city || null,
  ];

  if (category) queryParams.push(category);

  if (sinceDate && untilDate) {
    queryParams.push(sinceDate, untilDate);
  } else if (startDate) {
    queryParams.push(startDate);
  }

  if (keyword) {
    const like = `%${keyword}%`;
    queryParams.push(like, like, like);
  }

  /* ---------------------------
      统计总数
  ---------------------------- */
  const countSql = `
    SELECT COUNT(*) AS total
    FROM (
      SELECT p.id
      ${baseCondition}
      GROUP BY p.id
    ) tmp
  `;

  console.log('Count SQL:', countSql, 'Params:', queryParams);

  db.query(countSql, queryParams, (err, countResult) => {
    if (err) return res.cc({ status: 1, message: "数据库查询失败", error: err });

    const total = countResult[0].total || 0;

    /* ---------------------------
        数据 SQL（含可选座最低价）
    ---------------------------- */
    const dataSql = `
      SELECT
        p.id,
        p.name,
        p.category,
        p.city,
        p.cover_url,
        p.popularity,
        GROUP_CONCAT(DISTINCT a.name SEPARATOR ',') AS artists,
        MIN(DATE_FORMAT(s.schedule_time, '%Y-%m-%d %H:%i:%s')) AS start_time,
        v.name AS venue_name,

        CASE
          WHEN MAX(ps.selectable_seats) = 1 THEN MIN(sa.selectable_min_price)
          ELSE MIN(tt.normal_min_price)
        END AS min_price

      FROM performances p
      LEFT JOIN performance_artists pa ON p.id = pa.performance_id
      LEFT JOIN artists a ON pa.artist_id = a.id
      LEFT JOIN performance_schedules s ON p.id = s.performance_id
      LEFT JOIN venues v ON p.venue_id = v.id
      LEFT JOIN ticket_types t ON s.id = t.schedule_id

      LEFT JOIN performance_services ps ON p.id = ps.performance_id

      LEFT JOIN (
        SELECT schedule_id, MIN(price) AS selectable_min_price
        FROM schedule_area_prices
        GROUP BY schedule_id
      ) sa ON s.id = sa.schedule_id

      LEFT JOIN (
        SELECT schedule_id, MIN(price) AS normal_min_price
        FROM ticket_types
        GROUP BY schedule_id
      ) tt ON s.id = tt.schedule_id

      WHERE 1 = 1
        AND p.status = 1
        AND (v.city = ? OR ? IS NULL)
        ${categoryCondition}
        ${priceCondition}
        ${dateCondition}
        ${keywordCondition}

      GROUP BY p.id
      ORDER BY p.popularity DESC
      LIMIT ?, ?
    `;

    const dataParams = [...queryParams, offset, pageSize];

    console.log("Data SQL:", dataSql, "Params:", dataParams);

    db.query(dataSql, dataParams, (err, dataResult) => {
      if (err) return res.cc({ status: 1, message: "数据库查询失败", error: err });

      res.send({
        status: 0,
        message: "获取推荐演出成功",
        data: {
          performances: dataResult,
          total,
        },
      });
    });
  });
};


exports.updatePopularity = (req, res) => {
  const { id, popularity } = req.body;

  if (!id || popularity === undefined) {
    return res.cc({ status: 1, message: '缺少必要参数' });
  }

  const sql = 'UPDATE performances SET popularity = ? WHERE id = ?';
  db.query(sql, [popularity, id], (err, result) => {
    if (err) {
      console.error('Update popularity error:', err);
      return res.cc({ status: 1, message: '更新热度失败', error: err.message });
    }
    if (result.affectedRows === 0) {
      return res.cc({ status: 1, message: '演出不存在' });
    }
    console.log(`Updated popularity for id ${id} to ${popularity}`);
    res.send({ status: 0, message: '更新热度成功' });
  });
};
