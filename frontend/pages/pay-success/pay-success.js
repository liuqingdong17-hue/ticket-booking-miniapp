// pages/pay-success/pay-success.js
import drawRealQrcode from '../../utils/qrcode-real.js';
Page({
  data: {
    order: {},
    confettiList: [],
    iconAnim: {},
    cardAnim: {},
    buttonAnim: {}
  },

  onLoad(options) {
    const order_id = options.id;
    if (!order_id) {
      wx.showToast({ title: '缺少订单ID', icon: 'none' });
      wx.navigateBack();
      return;
    }
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

  // ✅ 生成彩带
  spawnConfetti() {
    const colors = ['#ff4b70', '#ffb400', '#4caf50', '#03a9f4', '#9c27b0'];
    const confettiList = [];
    for (let i = 0; i < 20; i++) {
      const left = Math.random() * 100;
      const delay = Math.random() * 1.5;
      const color = colors[Math.floor(Math.random() * colors.length)];
      confettiList.push({
        left, delay, color,
        style: `left:${left}%;animation-delay:${delay}s;background-color:${color};`
      });
    }
    this.setData({ confettiList });
    setTimeout(() => this.setData({ confettiList: [] }), 3000);
  },

  // ✅ 加载订单详情（保存 this，上下文安全）
  loadOrderDetail(order_id) {
    const that = this; // ✅ 保存上下文
    wx.request({
      url: `http://localhost:3000/api/order/detail/${order_id}`,
      header: { Authorization: `Bearer ${wx.getStorageSync('token')}` },
      success(res) {
        if (res.data.status === 0) {
          const order = res.data.data;
          const date = new Date(order.schedule_time);
          const formattedTime = `${date.getFullYear()}-${(date.getMonth() + 1)
            .toString().padStart(2, '0')}-${date.getDate()
            .toString().padStart(2, '0')} ${date.getHours()
            .toString().padStart(2, '0')}:${date.getMinutes()
            .toString().padStart(2, '0')}`;
          const seatInfo = order.seat_info || '未分配';

          that.setData(
            { order: { ...order, schedule_time: formattedTime, seat_info: seatInfo } },
            () => {
              // ✅ 延迟执行，确保节点已挂载
              setTimeout(() => {
                that.createQrcode(order);
              }, 400);
            }
          );
        } else {
          wx.showToast({ title: res.data.message || '加载失败', icon: 'none' });
        }
      },
      fail() {
        wx.showToast({ title: '网络错误，请检查连接', icon: 'none' });
      }
    });
  },

  createQrcode(order) {
    const orderId = order.id || order.order_number || 'unknown';
    const salt = Math.random().toString(36).slice(2, 7);
    const text = `https://example.com/wechat/order?id=${orderId}&v=${salt}`;
  
    wx.createSelectorQuery()
      .select('#ticket-qrcode')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res[0]) return;
        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');
  
        // 你想要的显示尺寸（和 wxss 的 .qrcode-canvas 保持接近即可）
        const displaySize = 300;
  
        drawRealQrcode({
          ctx,
          canvas,
          size: 300,
          text,
          version: 1.5, // ✅ 改成 3 或 4，清晰度最好
          background: '#fff',
          foreground: '#000',
        });        
      });
  },
  
  goToOrderList() {
    wx.redirectTo({ url: '/pages/order-list/order-list' });
  },

  goHome() {
    wx.reLaunch({ url: '/pages/index/index' });
  }
});
