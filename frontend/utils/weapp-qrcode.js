/*!
 * weapp-qrcode.js - Node Canvas 2D version (for 小程序 type="2d")
 * ✅ 修复棋盘格、抗锯齿问题（最终版）
 */

function QR8bitByte(data) {
  this.mode = 1;
  this.data = data || '';
}
QR8bitByte.prototype = {
  getLength() {
    return this.data.length;
  },
  write(buffer) {
    for (let i = 0; i < this.data.length; i++) {
      buffer.put(this.data.charCodeAt(i), 8);
    }
  },
};

function QRCode(typeNumber, errorCorrectLevel) {
  this.typeNumber = typeNumber;
  this.errorCorrectLevel = errorCorrectLevel;
  this.modules = null;
  this.moduleCount = 0;
  this.dataList = [];
}
QRCode.prototype = {
  addData(data) {
    this.dataList.push(new QR8bitByte(data));
  },
  make() {
    const QRCodeModel = require('./qrcode.js');
    const qr = new QRCodeModel(this.typeNumber, this.errorCorrectLevel);
    for (let i = 0; i < this.dataList.length; i++) {
      qr.addData(this.dataList[i].data);
    }
    qr.make();
    this.modules = qr.modules;
    this.moduleCount = qr.moduleCount;
  },
  isDark(r, c) {
    return this.modules[r][c];
  },
};

function drawQrcode(options) {
  options = Object.assign(
    {
      width: 200,
      height: 200,
      text: '',
      typeNumber: 4,
      correctLevel: 'M',
      background: '#ffffff',
      foreground: '#000000',
      pixelRatio: 1,
      canvas: null,
      ctx: null,
    },
    options
  );

  if (!options.text) {
    console.error('❌ drawQrcode 缺少 text 内容');
    return;
  }

  const qrcode = new QRCode(options.typeNumber, options.correctLevel);
  qrcode.addData(options.text);
  qrcode.make();

  const ctx = options.ctx;
  const pr = options.pixelRatio || 1;
  const size = options.width;

  // ✅ 禁用抗锯齿（关键）
  ctx.imageSmoothingEnabled = false;
  ctx.scale(pr, pr);

  const tileW = options.width / qrcode.moduleCount;
  const tileH = options.height / qrcode.moduleCount;

  ctx.fillStyle = options.background;
  ctx.fillRect(0, 0, options.width, options.height);

  // ✅ 精确绘制
  for (let r = 0; r < qrcode.moduleCount; r++) {
    for (let c = 0; c < qrcode.moduleCount; c++) {
      ctx.fillStyle = qrcode.isDark(r, c)
        ? options.foreground
        : options.background;
      // 🚫 去掉 Math.round / ceil，用 floor 确保像素不抖动
      const x = Math.floor(c * tileW);
      const y = Math.floor(r * tileH);
      const w = Math.ceil(tileW);
      const h = Math.ceil(tileH);
      ctx.fillRect(x, y, w, h);
    }
  }

  ctx.draw && ctx.draw();
}

module.exports = drawQrcode;
