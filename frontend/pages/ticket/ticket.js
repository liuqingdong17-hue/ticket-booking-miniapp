Page({
  data: {
    usableList: [],
    historyList: []
  },

  onLoad() {
    this.loadTickets();
  },

  onShow() {
    this.loadTickets();
  },

  loadTickets() {
    const token = wx.getStorageSync('token');

    wx.request({
      url: 'http://localhost:3000/api/order/allTickets',
      method: 'GET',
      header: {
        Authorization: "Bearer " + token
      },
      success: (res) => {
        if (res.data.status !== 0) return;

        const list = Array.isArray(res.data.data) ? res.data.data : [];

        this.setData({
          usableList: list.filter(item => !item.ended),
          historyList: list.filter(item => item.ended)
        });
      }
    });
  },

  // ==============================
  // 点击整卡区域（未结束 / 已结束）
  // ==============================
  goDetail(e) {
    const id = e.currentTarget.dataset.id;
    const ended = e.currentTarget.dataset.ended;
    const performance_id = e.currentTarget.dataset.performanceId; // ⭐ 大小写一致

    if (!ended) {
      // 未结束 → 去电子票
      wx.navigateTo({
        url: `/pages/pay-success/pay-success?id=${id}`
      });
    } else {
      // 已结束 → 默认跳评价页（被按钮拦截时不会执行这里）
      wx.navigateTo({
        url: `/pages/review/review?order_id=${id}&performance_id=${performance_id}`
      });
    }
  },

  // ==============================
  // 点击 “去评价” 按钮（阻止冒泡）
  // ==============================
  goReview(e) {
    const id = e.currentTarget.dataset.id;
    const performance_id = e.currentTarget.dataset.performanceId;

    wx.navigateTo({
      url: `/pages/review/review?order_id=${id}&performance_id=${performance_id}`
    });
  }
});
