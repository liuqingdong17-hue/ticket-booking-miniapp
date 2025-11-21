const express = require('express')
const jwt = require('jsonwebtoken')
const router = express.Router()
require('dotenv').config()

// 从 .env 读取
const JWT_SECRET = process.env.JWT_SECRET

// 测试 token 是否有效
router.get('/verify-token', (req, res) => {
  const authHeader = req.headers['authorization']

  if (!authHeader) {
    return res.status(401).json({ error: '缺少 Authorization 头' })
  }

  // 格式应该是 Bearer token
  const token = authHeader.split(' ')[1]
  if (!token) {
    return res.status(401).json({ error: '缺少 Token' })
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: 'Token无效或已过期', detail: err.message })
    }
    res.json({
      message: 'Token有效',
      decoded
    })
  })
})

module.exports = router
