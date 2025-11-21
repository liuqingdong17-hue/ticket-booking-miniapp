// 后端接口修改（在原有基础上添加sinceDate和untilDate支持）
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

  startDate = startDate === 'null' || startDate === 'undefined' || !startDate ? null : startDate;
  sinceDate = sinceDate || null;
  untilDate = untilDate || null;
  page = Math.max(parseInt(page, 10) || 1, 1);
  pageSize = Math.max(parseInt(pageSize, 10) || 10, 1);
  const offset = (page - 1) * pageSize;

  let priceCondition = '';
  if (priceRange) {
    switch (priceRange) {
      case '0-100':
        priceCondition = 'AND t.price < 100';
        break;
      case '100-300':
        priceCondition = 'AND t.price BETWEEN 100 AND 300';
        break;
      case '300-500':
        priceCondition = 'AND t.price BETWEEN 300 AND 500';
        break;
      case '500+':
        priceCondition = 'AND t.price > 500';
        break;
    }
  }

  let keywordCondition = '';
  if (keyword) {
    keywordCondition = 'AND (p.name LIKE ? OR v.name LIKE ? OR a.name LIKE ?)';
  }

  let categoryCondition = '';
  if (category) {
    categoryCondition = 'AND p.category = ?';
  }

  let dateCondition = '';
  if (sinceDate && untilDate) {
    dateCondition = 'AND s.schedule_time BETWEEN ? AND ?';
  } else if (startDate) {
    dateCondition = 'AND DATE(s.schedule_time) = DATE(?)';
  }

  const baseCondition = `
    FROM performances p
    LEFT JOIN performance_artists pa ON p.id = pa.performance_id
    LEFT JOIN artists a ON pa.artist_id = a.id
    LEFT JOIN performance_schedules s ON p.id = s.performance_id
    LEFT JOIN venues v ON p.venue_id = v.id
    LEFT JOIN ticket_types t ON s.id = t.schedule_id
    WHERE 1 = 1
      AND (v.city = ? OR ? IS NULL)
      AND s.schedule_time > NOW()   -- 只展示未过期
      ${categoryCondition}
      ${priceCondition}
      ${dateCondition}
      ${keywordCondition}
  `;

  const queryParams = [city || null, city || null];
  if (category) queryParams.push(category);
  if (sinceDate && untilDate) {
    queryParams.push(sinceDate, untilDate);
  } else if (startDate) {
    queryParams.push(startDate);
  }
  if (keyword) {
    const keywordLike = `%${keyword}%`;
    queryParams.push(keywordLike, keywordLike, keywordLike);
  }

  const countSql = `
    SELECT COUNT(*) AS total 
    FROM (
      SELECT p.id
      ${baseCondition}
      GROUP BY p.id
      HAVING SUM(t.stock) > 0   -- 只统计还有票的
    ) sub
  `;
  console.log('Count SQL:', countSql, 'Params:', queryParams);

  db.query(countSql, queryParams, (err, countResult) => {
    if (err) {
      console.error('Count query error:', err);
      return res.cc({ status: 1, message: '数据库查询失败', error: err.message });
    }

    const total = countResult[0]?.total || 0;
    console.log('Count result:', total);

    const dataSql = `
      SELECT
        p.id, p.name, p.category, p.city, p.cover_url, p.popularity,
        GROUP_CONCAT(DISTINCT a.name SEPARATOR ',') AS artists,
        MIN(DATE_FORMAT(s.schedule_time, '%Y-%m-%d %H:%i:%s')) AS start_time,
        v.name AS venue_name,
        MIN(t.price) AS min_price,
        SUM(t.stock) AS total_stock
      ${baseCondition}
      GROUP BY p.id
      HAVING SUM(t.stock) > 0   -- 必须还有票
      ORDER BY p.popularity DESC
      LIMIT ?, ?
    `;

    const dataParams = [...queryParams, offset, pageSize];
    console.log('Data SQL:', dataSql, 'Params:', dataParams);

    db.query(dataSql, dataParams, (err, dataResult) => {
      if (err) {
        console.error('Data query error:', err);
        return res.cc({ status: 1, message: '数据库查询失败', error: err.message });
      }

      console.log('Data result:', dataResult);
      res.send({
        status: 0,
        message: '获取推荐演出成功',
        data: {
          performances: dataResult || [],
          total
        }
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
