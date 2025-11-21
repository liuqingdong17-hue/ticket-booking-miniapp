// pages/ticket/ticket.js
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
    console.log("发送 token:", token);

    wx.request({
      url: 'http://localhost:3000/api/order/allTickets',
      method: 'GET',
      header: {
        Authorization: "Bearer " + token  // ★ 关键修复点
      },
      success: (res) => {
        console.log('allTickets res:', res.data);

        if (res.data.status !== 0) {
          console.warn('接口返回非 0 状态：', res.data.status);
          return;
        }

        const list = Array.isArray(res.data.data) ? res.data.data : [];

        const usable = list.filter(item => !item.ended);
        const history = list.filter(item => item.ended);

        console.log("usable:", usable);
        console.log("history:", history);

        this.setData({
          usableList: usable,
          historyList: history
        });

        console.log('page data after setData:', this.data);
      },
      fail(err) {
        console.error("请求失败:", err);
      }
    });
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id;
    const ended = e.currentTarget.dataset.ended; // true / false
  
    if (!ended) {
      // 👉 未结束 → 去电子票页面（pay-success）
      wx.navigateTo({
        url: `/pages/pay-success/pay-success?id=${id}`
      });
    } else {
      // 👉 已结束 → 去订单详情页
      wx.navigateTo({
        url: `/pages/评论页/评论页?order_id=${id}`
      });
    }
  }  
});
