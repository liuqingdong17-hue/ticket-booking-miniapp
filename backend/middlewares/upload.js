const multer = require('multer');
const path = require('path');

// 配置文件存储位置
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../public/uploads/feedback'));
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const name = Date.now() + '-' + Math.random().toString(36).substr(2, 6);
    cb(null, name + ext);
  }
});

const upload = multer({ storage });

module.exports = upload;
