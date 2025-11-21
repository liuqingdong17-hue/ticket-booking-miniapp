/*!
 * 微信小程序专用二维码生成器（无棋盘格版）
 * Author: Yingle / 修改: ChatGPT 修正版
 */
function QR8bitByte(data){this.mode=1;this.data=data;}
QR8bitByte.prototype={getLength:function(){return this.data.length;},write:function(buffer){for(var i=0;i<this.data.length;i++){buffer.put(this.data.charCodeAt(i),8);}}};

function QRCode(typeNumber, errorCorrectLevel){
  this.typeNumber=typeNumber;
  this.errorCorrectLevel=errorCorrectLevel;
  this.modules=null;
  this.moduleCount=0;
  this.dataCache=null;
  this.dataList=[];
}
QRCode.prototype={
  addData:function(data){this.dataList.push(new QR8bitByte(data));this.dataCache=null;},
  make:function(){
    var QRCodeModel=require('./qrcode.js');
    var qr=new QRCodeModel(this.typeNumber,this.errorCorrectLevel);
    for(var i=0;i<this.dataList.length;i++){qr.addData(this.dataList[i].data);}
    qr.make();this.modules=qr.modules;this.moduleCount=qr.moduleCount;
  },
  isDark:function(row,col){return this.modules[row][col];}
};

function drawQrcode(options) {
  options = Object.assign(
    {
      width: 200,
      height: 200,
      canvasId: 'qrcode',
      text: '',
      typeNumber: 4,
      correctLevel: 'M',
      background: '#ffffff',
      foreground: '#000000',
    },
    options
  );

  const qrcode = new QRCode(options.typeNumber, options.correctLevel);
  qrcode.addData(options.text);
  qrcode.make();

  const tileW = options.width / qrcode.moduleCount;
  const tileH = options.height / qrcode.moduleCount;

  // ✅ 新版 Canvas2D context
  const ctx = options.ctx;
  if (!ctx) {
    console.error('❌ 缺少 ctx');
    return;
  }

  // ✅ 白底背景
  ctx.fillStyle = options.background;
  ctx.fillRect(0, 0, options.width, options.height);

  // ✅ 绘制每个模块
  for (let r = 0; r < qrcode.moduleCount; r++) {
    for (let c = 0; c < qrcode.moduleCount; c++) {
      const isDark = qrcode.isDark(r, c);
      ctx.fillStyle = isDark ? options.foreground : options.background;

      const x = Math.round(c * tileW);
      const y = Math.round(r * tileH);
      const w = Math.ceil(tileW);
      const h = Math.ceil(tileH);

      ctx.fillRect(x, y, w, h);
    }
  }

  // ✅ 注意：新版 Canvas 不要 ctx.draw()
  console.log('✅ drawQrcode 完成');
}

module.exports=drawQrcode;
