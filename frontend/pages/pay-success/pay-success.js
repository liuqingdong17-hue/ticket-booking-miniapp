// pages/pay-success/pay-success.js
// ✅ 不再需要 drawQrcode
// import drawQrcode from '../../utils/weapp-qrcode.js';

Page({
  data: {
    order: {},
    orderId: null,
    confettiList: [],
    iconAnim: {},
    cardAnim: {},
    buttonAnim: {},

    // ✅ 后端返回的 base64 dataUrl，直接给 <image src>
    qrcodeImg: '',

    // 如果你页面上还用到 qrSize/qrPx 之类可留着，不影响
    qrSize: 260
  },

  onLoad(options) {
    const order_id = options.id;
    if (!order_id) {
      wx.showToast({ title: '缺少订单ID', icon: 'none' });
      wx.navigateBack();
      return;
    }

    this.setData({ orderId: Number(order_id) || order_id });
    this.loadOrderDetail(order_id);
  },

  onReady() {
    this.createAnimations();
    this.spawnConfetti();
  },

  // ✅ 页面动画
  createAnimations() {
    const iconAnim = wx.createAnimation({ duration: 800, timingFunction: 'ease-out' });
    iconAnim.scale(1.4).opacity(1).step();

    const cardAnim = wx.createAnimation({ duration: 600, delay: 400, timingFunction: 'ease-out' });
    cardAnim.translateY(0).opacity(1).step();

    const buttonAnim = wx.createAnimation({ duration: 500, delay: 800, timingFunction: 'ease-out' });
    buttonAnim.opacity(1).step();

    this.setData({
      iconAnim: iconAnim.export(),
      cardAnim: cardAnim.export(),
      buttonAnim: buttonAnim.export()
    });
  },

  // ✅ 彩带
  spawnConfetti() {
    const colors = ['#ff4b70', '#ffb400', '#4caf50', '#03a9f4', '#9c27b0'];
    const confettiList = [];

    for (let i = 0; i < 20; i++) {
      const left = Math.random() * 100;
      const delay = Math.random() * 1.5;
      const color = colors[Math.floor(Math.random() * colors.length)];
      confettiList.push({
        style: `left:${left}%;animation-delay:${delay}s;background-color:${color};`
      });
    }

    this.setData({ confettiList });
    setTimeout(() => this.setData({ confettiList: [] }), 3000);
  },

  // ✅ 加载订单详情
  loadOrderDetail(order_id) {
    wx.request({
      url: `http://localhost:3000/api/order/detail/${order_id}`,
      header: { authorization: `Bearer ${wx.getStorageSync('token')}` },
      success: (res) => {
        if (!res.data || res.data.status !== 0) {
          wx.showToast({ title: res.data?.message || "加载失败", icon: "none" });
          return;
        }

        const order = res.data.data || {};

        // 格式化时间
        const date = new Date(order.schedule_time);
        const formattedTime =
          `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ` +
          `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

        // seat/ticket 格式化
        let seatInfo = order.seat_info;
        if (!seatInfo || String(seatInfo).trim() === "") {
          if (order.ticket_info) {
            seatInfo = order.ticket_info.map(t => `${t.name} × ${t.count}`).join('、');
          } else {
            seatInfo = "未分配";
          }
        }

        this.setData({
          order: { ...order, schedule_time: formattedTime, seat_info: seatInfo }
        });

        // ✅ 渲染稳定后再拉二维码
        setTimeout(() => this.createQrcode(), 200);
      },
      fail: (e) => {
        console.error("order detail fail:", e);
        wx.showToast({ title: "网络错误，请检查连接", icon: "none" });
      }
    });
  },

  // ✅ 直接请求后端生成的二维码图片（base64 dataUrl）
  createQrcode() {
    const orderId = this.data.orderId;
    if (!orderId) return;

    const token = wx.getStorageSync('token');

    wx.request({
      url: `http://localhost:3000/api/order/qrcode/${orderId}`,
      method: "GET",
      header: { authorization: `Bearer ${token}` },
      success: (r) => {
        if (!r.data || r.data.status !== 0) {
          wx.showToast({ title: r.data?.message || "二维码生成失败", icon: "none" });
          return;
        }

        const dataUrl = r.data.data?.dataUrl;
        if (!dataUrl) {
          wx.showToast({ title: "二维码图片为空", icon: "none" });
          return;
        }

        // ✅ 直接给 <image src> 用
        this.setData({ qrcodeImg: dataUrl });
      },
      fail: (e) => {
        console.error("qrcode request fail:", e);
        wx.showToast({ title: "二维码接口请求失败", icon: "none" });
      }
    });
  },

  // ✅ 查看订单 / 回首页
  // goToOrderList() {
  //   wx.redirectTo({ url: '/pages/order-list/order-list' });
  // },
  goHome() {
    wx.reLaunch({ url: '/pages/index/index' });
  },

  // ✅ 预览二维码（base64 也能预览）
  previewQr() {
    if (!this.data.qrcodeImg) return;
    wx.previewImage({ urls: [this.data.qrcodeImg] });
  },

  /**
   * ✅ 保存二维码到相册
   * 注意：base64 dataUrl 不能直接 saveImageToPhotosAlbum
   * 需要先写到本地临时文件
   */
  saveQr() {
    const src = this.data.qrcodeImg;
    if (!src) return;

    // dataUrl -> 本地文件
    if (src.startsWith('data:image')) {
      const fs = wx.getFileSystemManager();
      const match = src.match(/^data:image\/\w+;base64,(.*)$/);
      if (!match) {
        wx.showToast({ title: '二维码格式不正确', icon: 'none' });
        return;
      }

      const base64 = match[1];
      const filePath = `${wx.env.USER_DATA_PATH}/qrcode_${this.data.orderId}.png`;

      try {
        const buffer = wx.base64ToArrayBuffer(base64);
        fs.writeFileSync(filePath, buffer, 'binary');

        wx.saveImageToPhotosAlbum({
          filePath,
          success: () => wx.showToast({ title: '已保存到相册', icon: 'success' }),
          fail: (e) => {
            console.error('saveImage fail:', e);
            wx.showToast({ title: '保存失败（请检查相册权限）', icon: 'none' });
          }
        });
      } catch (e) {
        console.error('writeFile fail:', e);
        wx.showToast({ title: '保存失败', icon: 'none' });
      }

      return;
    }

    // 如果未来你换成了普通图片链接/本地路径，也兼容
    wx.saveImageToPhotosAlbum({
      filePath: src,
      success: () => wx.showToast({ title: '已保存到相册', icon: 'success' }),
      fail: (e) => {
        console.error('saveImage fail:', e);
        wx.showToast({ title: '保存失败（请检查相册权限）', icon: 'none' });
      }
    });
  }
});
