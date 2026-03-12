// routes/orderVerify.js
const express = require("express");
const router = express.Router();
const db = require("../db");
const crypto = require("crypto");

// ✅ 用户鉴权（用于 GET verify-code）
// 你项目目录是 /middlewares/auth.js
const auth = require("../middlewares/auth");

// =================== 工具函数 ===================

// 生成签名（只保留一个 sign，别重复定义）
function sign(secret, orderNumber, ts) {
  return crypto
    .createHmac("sha256", secret)
    .update(`${orderNumber}|${ts}`)
    .digest("hex")
    .slice(0, 16);
}

// 解析二维码内容：ticket://verify?o=xxx&t=123&s=xxx
function parseQrText(qr_text) {
  // 兼容：可能有空格/换行
  const text = String(qr_text || "").trim();

  // 必须包含 ?
  const idx = text.indexOf("?");
  if (idx === -1) return null;

  const query = text.slice(idx + 1);
  const params = new URLSearchParams(query);

  const o = params.get("o");
  const t = params.get("t");
  const s = params.get("s");

  if (!o || !t || !s) return null;

  const ts = Number(t);
  if (!ts) return null;

  return {
    order_number: decodeURIComponent(o),
    ts,
    sig: s
  };
}

// =================== 1) 管理端核销接口 ===================
// POST /api/order/verify
// body: { qr_text } 或 { order_id } 或 { order_number }
router.post("/verify", /* adminAuth, */ (req, res) => {
  let { qr_text, order_id, order_number } = req.body || {};

  // ✅ A. 优先解析扫码内容
  if (qr_text) {
    const parsed = parseQrText(qr_text);
    if (!parsed) return res.cc("核销码解析失败或缺少参数");

    const { order_number: o, ts, sig } = parsed;

    // 有效期（10分钟）
    const ttl = 10 * 60 * 1000;
    if (Date.now() - ts > ttl) return res.cc("核销码已过期，请刷新二维码");

    const secret = process.env.VERIFY_QR_SECRET || process.env.JWT_SECRET;
    const expected = sign(secret, o, ts);
    if (expected !== sig) return res.cc("核销码验签失败");

    // ✅ 从二维码里拿到订单号
    order_number = o;
  }

  // ✅ B. 兼容手输
  if (!order_id && !order_number) {
    return res.cc("缺少 qr_text 或 order_id 或 order_number");
  }

  const where = order_id ? "id = ?" : "order_number = ?";
  const val = order_id ? order_id : order_number;

  // ====== 下面是你原有核销逻辑 ======
  db.query(
    `SELECT id, order_number, status, refund_status, used_at, schedule_id
     FROM orders
     WHERE ${where}
     LIMIT 1`,
    [val],
    (err, rows) => {
      if (err) return res.cc(err);
      if (!rows.length) return res.cc("订单不存在");

      const o = rows[0];

      if (o.status !== "paid") return res.cc("订单未支付或已失效");
      if (o.refund_status === "approved") return res.cc("该订单已退款，无法核销");
      if (o.used_at) return res.cc("该订单已核销");

      // 场次时间校验（可保留）
      db.query(
        `SELECT schedule_time FROM performance_schedules WHERE id = ? LIMIT 1`,
        [o.schedule_id],
        (err2, srows) => {
          if (err2) return res.cc(err2);

          if (srows.length) {
            const scheduleTime = new Date(srows[0].schedule_time).getTime();
            const now = Date.now();

            const allowBefore = 6 * 60 * 60 * 1000;
            const allowAfter = 24 * 60 * 60 * 1000;

            if (now < scheduleTime - allowBefore) return res.cc("演出未开始，暂不可核销");
            if (now > scheduleTime + allowAfter) return res.cc("演出已结束太久，无法核销");
          }

          db.query(
            `UPDATE orders SET used_at = NOW() WHERE id = ?`,
            [o.id],
            (err3) => {
              if (err3) return res.cc(err3);

              res.send({
                status: 0,
                message: "核销成功",
                data: {
                  order_id: o.id,
                  order_number: o.order_number,
                  used_at: new Date().toISOString()
                }
              });
            }
          );
        }
      );
    }
  );
});


// =================== 2) 小程序获取核销码 ===================
// GET /api/order/verify-code/:id
router.get("/verify-code/:id", auth, (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.cc("订单ID无效");

  const userId = req.user?.userId;
  if (!userId) return res.cc("未登录");

  db.query(
    `SELECT id, order_number, user_id, status
     FROM orders
     WHERE id = ?
     LIMIT 1`,
    [id],
    (err, rows) => {
      if (err) return res.cc(err);
      if (!rows.length) return res.cc("订单不存在");

      const o = rows[0];

      // ✅ 确保只能拿自己的订单核销码
      if (Number(o.user_id) !== Number(userId)) return res.cc("无权访问该订单");

      if (o.status !== "paid") return res.cc("订单未支付，无法生成核销码");

      const ts = Date.now();
      const secret = process.env.VERIFY_QR_SECRET || process.env.JWT_SECRET;
      const s = sign(secret, o.order_number, ts);

      // ✅ 二维码内容（Verify.vue jsQR 解出来就是它）
      const text = `ticket://verify?o=${encodeURIComponent(o.order_number)}&t=${ts}&s=${s}`;

      res.send({
        status: 0,
        message: "ok",
        data: { text }
      });
    }
  );
});

module.exports = router;
