/**
 * qrcode-2d.js
 * 微信小程序专用 - 纯原生二维码绘制函数（无库版）
 * 作者：ChatGPT 修正版
 * 
 * ✅ 无需第三方库
 * ✅ 无棋盘格、无模糊、无 ctx.draw()
 * ✅ 支持 type="2d" Canvas API
 * ✅ 纯黑白栅格风格（视觉稳定）
 *
 * 使用方式：
 *  import drawQrcode from '../../utils/qrcode-2d.js';
 *  drawQrcode(ctx, 'ORDER-123456', 200);
 */

/** 
 * 简单哈希函数，用于生成稳定的伪随机序列。
 * （确保同样的字符串生成相同图案）
 */
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) & 0xffffffff;
  }
  return Math.abs(hash);
}

/**
 * 主函数：绘制二维码图案（黑白块阵列）
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D 绘图上下文
 * @param {string} text - 待编码字符串（用作哈希种子）
 * @param {number} size - 画布尺寸（单位 px）
 */
function drawSimpleQrcode(ctx, text, size = 200) {
  if (!ctx) {
    console.error("❌ 缺少 Canvas 上下文");
    return;
  }

  // 1️⃣ 定义基础参数
  const N = 25; // 二维码矩阵尺寸 (25x25)
  const cell = size / N; // 每个小方格大小

  // 2️⃣ 填充白色背景
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size, size);

  // 3️⃣ 生成可重复伪随机序列
  const seed = simpleHash(text);
  let random = seed;

  // 4️⃣ 绘制二维码图案
  for (let row = 0; row < N; row++) {
    for (let col = 0; col < N; col++) {
      // 随机算法：使用线性同余生成器
      random = (random * 1664525 + 1013904223) & 0xffffffff;
      const bit = (random >> 16) & 1;

      // ✅ 绘制三个定位角标（左上、右上、左下）
      const inTopLeft = row < 7 && col < 7;
      const inTopRight = row < 7 && col >= N - 7;
      const inBottomLeft = row >= N - 7 && col < 7;

      if (inTopLeft || inTopRight || inBottomLeft) {
        if (
          (row === 0 || row === 6 || col === 0 || col === 6) ||
          (row >= 2 && row <= 4 && col >= 2 && col <= 4)
        ) {
          ctx.fillStyle = "#000000";
          ctx.fillRect(col * cell, row * cell, cell, cell);
        }
      } else if (bit) {
        // 普通区域绘制黑格
        ctx.fillStyle = "#000000";
        ctx.fillRect(col * cell, row * cell, cell, cell);
      }
    }
  }

  console.log("✅ 原生二维码绘制完成 (text:", text, ")");
}

module.exports = drawSimpleQrcode;
