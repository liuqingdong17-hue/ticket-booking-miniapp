// const jwt = require('jsonwebtoken');
// require('dotenv').config();

// module.exports = (req, res, next) => {
//   const authHeader = req.headers['authorization'];
//   if (!authHeader) return res.cc('缺少 token', 1);

//   const token = authHeader.split(' ')[1]; // Bearer token
//   if (!token) return res.cc('无效 token', 1);

//   jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
//     if (err) return res.cc('token 无效或已过期', 1);
//     req.user = decoded; // 这里有 userId、phone
//     next();
//   });
// };
const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth) return res.cc('未登录');

  // 兼容：Bearer xxx 或 直接 token
  const token = auth.startsWith('Bearer ')
    ? auth.slice(7)
    : auth;

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.cc('token 无效或已过期');
    req.user = decoded;
    next();
  });
};
