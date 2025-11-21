// utils/qrcode-real.js
const QRCode = require('./qrcode.js');

/**
 * 高保真二维码绘制（无棋盘格、支持Logo）
 * @param {Object} opt
 *  - ctx: 2d context
 *  - canvas: 2d canvas node（用于 createImage）
 *  - size: 期望显示尺寸（px）
 *  - text: 二维码内容
 *  - version: 1~40，建议 6~8
 *  - background / foreground: 颜色
 *  - logo: 可选，本地图片路径（建议 40~60px）
 */
function drawRealQrcode({
  ctx,
  canvas,
  size = 300,
  text = '',
  version = 6,
  background = '#ffffff',
  foreground = '#000000',
  logo = null
}) {
  if (!ctx || !canvas || !text) {
    console.error('❌ 缺少 ctx / canvas / text');
    return;
  }

  // 1) 生成二维码矩阵
  const qr = new QRCode(version, 'M');
  qr.addData(text);
  qr.make();

  const count = qr.getModuleCount();      // 网格数量，例如 41
  const cell  = Math.floor(size / count); // 单格整数像素
  const snapSize = cell * count;          // 实际绘制尺寸（避免小数）
  const dpr = wx.getWindowInfo().pixelRatio;

  // 2) 设置画布物理像素，并按 DPR 缩放
  canvas.width  = snapSize * dpr;
  canvas.height = snapSize * dpr;
  ctx.setTransform(1, 0, 0, 1, 0, 0);     // 清 transform
  ctx.scale(dpr, dpr);

  // 3) 画布状态（禁用平滑，白底）
  ctx.imageSmoothingEnabled = false;
  ctx.imageSmoothingQuality = 'low';
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, snapSize, snapSize);

  // 4) 逐格填充（全部用整数坐标，彻底无缝）
  for (let r = 0; r < count; r++) {
    for (let c = 0; c < count; c++) {
      ctx.fillStyle = qr.isDark(r, c) ? foreground : background;
      const x = c * cell;
      const y = r * cell;
      ctx.fillRect(x, y, cell, cell);
    }
  }

  // 5) 可选 Logo
  if (logo) {
    try {
      const img = canvas.createImage(); // ✅ 正确用法
      img.onload = () => {
        const logoSize = Math.round(snapSize * 0.18);
        const left = Math.round((snapSize - logoSize) / 2);
        const top  = left;

        // 先铺一个白色方块再放 logo，保证对比
        ctx.fillStyle = background;
        ctx.fillRect(left, top, logoSize, logoSize);
        ctx.drawImage(img, left, top, logoSize, logoSize);
      };
      img.src = logo;
    } catch (e) {
      console.warn('Logo 加载失败：', e);
    }
  }

  console.log(`✅ 真·二维码绘制完成  size=${snapSize}, cell=${cell}, count=${count}`);
}

module.exports = drawRealQrcode;
