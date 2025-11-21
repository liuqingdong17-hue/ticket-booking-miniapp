Page({
  data: {
    orders: []
  },

  onShow() {
    this.loadOrders();
  },

  loadOrders() {
    const token = wx.getStorageSync('token');

    wx.request({
      url: "http://localhost:3000/api/order/list",
      method: "GET",
      header: {
        Authorization: "Bearer " + token
      },

      success: (res) => {
        if (res.data.status === 0) {
          const list = res.data.data.map(o => {
            return {
              ...o,
              schedule_time_fmt: this.formatDateTime(o.schedule_time),
              ticket_count: o.total_price && o.pay_price
                ? Math.round(o.total_price / (o.pay_price / (o.ticket_count || 1)))
                : 1
            };
          });

          this.setData({
            orders: list
          });
        }
      }
    });
  },

  // 格式化日期
  formatDateTime(str) {
    const d = new Date(str);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const h = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    return `${y}.${m}.${day} ${h}:${min}`;
  },

  // 跳转订单详情
  goDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/order-detail/order-detail?id=${id}`
    });
  }
});
