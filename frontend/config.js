// config.js
const ENV = 'natapp';  
// 可选值：'local' | 'natapp' | 'prod'

const configMap = {
  local: 'http://192.168.106.107:3000/api',    // 局域网开发时使用
  natapp: 'https://nondynastical-palaeoentomological-audrea.ngrok-free.dev', // NATAPP 外网穿透
  prod: 'https://yourdomain.com/api'           // 生产部署地址（上线用）
};

module.exports = {
  api: configMap[ENV]
};
