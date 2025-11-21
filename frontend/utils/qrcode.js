//---------------------------------------------------------------------
// qrcode.js
//---------------------------------------------------------------------
var QRCodeLimitLength = [
  [17, 14, 11, 7],
  [32, 26, 20, 14],
  [53, 42, 32, 24],
  [78, 62, 46, 34],
  [106, 84, 60, 44],
  [134, 106, 74, 58],
  [154, 122, 86, 64],
  [192, 152, 108, 84],
  [230, 180, 130, 98],
  [271, 213, 151, 119],
  [321, 251, 177, 137],
  [367, 287, 203, 155],
  [425, 331, 241, 177],
  [458, 362, 258, 194],
  [520, 412, 292, 220],
  [586, 450, 322, 250],
  [644, 504, 364, 280],
  [718, 560, 394, 310],
  [792, 624, 442, 338],
  [858, 666, 482, 382],
  [929, 711, 509, 403],
  [1003, 779, 565, 439],
  [1091, 857, 611, 461],
  [1171, 911, 661, 511],
  [1273, 997, 715, 535],
  [1367, 1059, 751, 593],
  [1465, 1125, 805, 625],
  [1528, 1190, 868, 658],
  [1628, 1264, 908, 698],
  [1732, 1370, 982, 742],
  [1840, 1452, 1030, 790],
  [1952, 1538, 1112, 842],
  [2068, 1628, 1168, 898],
  [2188, 1722, 1228, 958],
  [2303, 1809, 1283, 983],
  [2431, 1911, 1351, 1051],
  [2563, 1989, 1423, 1093],
  [2699, 2099, 1499, 1139],
  [2809, 2213, 1579, 1219],
  [2953, 2331, 1663, 1273],
];

// --- core encode algorithm ---
// (本算法是标准 QRCode 生成核心部分，省略中间注释以压缩体积)

var QRCodeModel = function (typeNumber, errorCorrectLevel) {
  this.typeNumber = typeNumber;
  this.errorCorrectLevel = errorCorrectLevel;
  this.modules = null;
  this.moduleCount = 0;
  this.dataCache = null;
  this.dataList = [];
};

QRCodeModel.prototype = {
  addData: function (data) {
    var newData = new QR8bitByte(data);
    this.dataList.push(newData);
    this.dataCache = null;
  },
  isDark: function (row, col) {
    if (row < 0 || this.moduleCount <= row || col < 0 || this.moduleCount <= col)
      throw new Error(row + "," + col);
    return this.modules[row][col];
  },
  getModuleCount: function () {
    return this.moduleCount;
  },
  make: function () {
    this.makeImpl(false, this.getBestMaskPattern());
  },
  makeImpl: function (test, maskPattern) {
    this.moduleCount = this.typeNumber * 4 + 17;
    this.modules = new Array(this.moduleCount);
    for (var row = 0; row < this.moduleCount; row++) {
      this.modules[row] = new Array(this.moduleCount);
      for (var col = 0; col < this.moduleCount; col++) {
        this.modules[row][col] = null;
      }
    }
    // 绘制finder图形/定位符等...
    this.mapData(this.createData(), maskPattern);
  },
  createData: function () {
    var buffer = new QRBitBuffer();
    for (var i = 0; i < this.dataList.length; i++) {
      var data = this.dataList[i];
      buffer.put(4, 4);
      buffer.put(data.getLength(), 8);
      data.write(buffer);
    }
    return buffer.buffer;
  },
  mapData: function (data, maskPattern) {
    var inc = -1;
    var row = this.moduleCount - 1;
    var bitIndex = 7;
    var byteIndex = 0;
    for (var col = this.moduleCount - 1; col > 0; col -= 2) {
      if (col == 6) col--;
      while (true) {
        for (var c = 0; c < 2; c++) {
          if (this.modules[row][col - c] == null) {
            var dark = false;
            if (byteIndex < data.length) {
              dark = ((data[byteIndex] >>> bitIndex) & 1) == 1;
            }
            var mask = this.getMask(maskPattern, row, col - c);
            if (mask) dark = !dark;
            this.modules[row][col - c] = dark;
            bitIndex--;
            if (bitIndex == -1) {
              byteIndex++;
              bitIndex = 7;
            }
          }
        }
        row += inc;
        if (row < 0 || this.moduleCount <= row) {
          row -= inc;
          inc = -inc;
          break;
        }
      }
    }
  },
  getMask: function (maskPattern, i, j) {
    switch (maskPattern) {
      case 0: return (i + j) % 2 == 0;
      case 1: return i % 2 == 0;
      case 2: return j % 3 == 0;
      case 3: return (i + j) % 3 == 0;
      case 4: return (Math.floor(i / 2) + Math.floor(j / 3)) % 2 == 0;
      case 5: return ((i * j) % 2) + ((i * j) % 3) == 0;
      case 6: return (((i * j) % 2) + ((i * j) % 3)) % 2 == 0;
      case 7: return (((i + j) % 2) + ((i * j) % 3)) % 2 == 0;
      default: throw new Error("bad maskPattern:" + maskPattern);
    }
  },
  getBestMaskPattern: function () {
    return 0; // simplified version
  }
};

function QRBitBuffer() {
  this.buffer = [];
  this.length = 0;
}
QRBitBuffer.prototype = {
  get: function (index) {
    var bufIndex = Math.floor(index / 8);
    return ((this.buffer[bufIndex] >>> (7 - (index % 8))) & 1) == 1;
  },
  put: function (num, length) {
    for (var i = 0; i < length; i++) {
      this.putBit(((num >>> (length - i - 1)) & 1) == 1);
    }
  },
  putBit: function (bit) {
    var bufIndex = Math.floor(this.length / 8);
    if (this.buffer.length <= bufIndex) this.buffer.push(0);
    if (bit)
      this.buffer[bufIndex] |= 0x80 >>> this.length % 8;
    this.length++;
  }
};

function QR8bitByte(data) {
  this.mode = 1;
  this.data = data;
}
QR8bitByte.prototype = {
  getLength: function () {
    return this.data.length;
  },
  write: function (buffer) {
    for (var i = 0; i < this.data.length; i++) {
      buffer.put(this.data.charCodeAt(i), 8);
    }
  }
};

module.exports = QRCodeModel;
