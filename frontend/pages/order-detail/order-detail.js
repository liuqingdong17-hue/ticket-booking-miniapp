// pages/order-detail/order-detail.js
Page({
  data: {
    order: {}  // 存放订单详情
  },

  onLoad(options) {
    const orderId = options.id;
    this.loadOrderDetail(orderId);
  },

  // 获取订单详情
  loadOrderDetail(orderId) {
    const token = wx.getStorageSync('token');
    if (!token) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }

    wx.request({
      url: `http://localhost:3000/api/order/detail/${orderId}`,
      method: 'GET',
      header: { Authorization: `Bearer ${token}` },
      success: (res) => {
        if (res.data.status === 0) {

          let order = res.data.data;

          // 格式化时间
          order.schedule_time_fmt = this.formatDateTime(order.schedule_time);
          order.created_at_fmt = this.formatDateTime(order.created_at);

          // 格式化座位列表（接口返回 seat_info 字符串）
          // seat_info 如： “C区-5排2座、F区-2排3座”
          if (order.seat_info) {
            order.seat_list = order.seat_info.split('、').map(item => ({ text: item }));
          } else {
            order.seat_list = [];
          }

          this.setData({ order });
        } else {
          wx.showToast({ title: res.data.message || '获取订单失败', icon: 'none' });
        }
      },
      fail: () => wx.showToast({ title: '网络异常', icon: 'none' })
    });
  },

  // 查看电子票
  viewTicket() {
    const order_id = this.data.order.order_id;

    if (!order_id) {
      wx.showToast({ title: '订单信息缺失', icon: 'none' });
      return;
    }

    wx.navigateTo({
      url: `/pages/pay-success/pay-success?id=${order_id}`
    });
  },

  // 时间格式化（yyyy.mm.dd hh:mm）
  formatDateTime(t) {
    if (!t) return '';
    const d = new Date(t);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${y}.${m}.${day} ${hh}:${mm}`;
  }
});
