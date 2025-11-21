// pages/coupon-list/coupon-list.js
Page({
  data: {
    couponList: []
  },

  onShow() {
    this.loadMyCoupons();
  },

  // 加载优惠券
  loadMyCoupons() {
    const token = wx.getStorageSync('token');

    wx.request({
      url: 'http://localhost:3000/api/coupons/my',
      method: 'GET',
      header: { Authorization: `Bearer ${token}` },
      success: (res) => {
        if (res.data.status === 0) {
          const list = res.data.data.map(c => ({
            ...c,
            display_value: this.formatValue(c),
            valid_start_fmt: this.formatDate(c.valid_start),
            valid_end_fmt: this.formatDate(c.valid_end)
          }));

          // ⭐ 排序：未使用 → 已使用 → 已过期
          list.sort((a, b) => a.status - b.status);

          this.setData({ couponList: list });
        }
      }
    });
  },

  // 格式化显示
  formatValue(c) {
    if (c.discount_type === 1) {
      return Number(c.discount_value).toFixed(2) + '元';
    } else {
      return (c.discount_value * 10).toString().replace(/\.0$/, '') + '折';
    }
  },

  formatDate(dateStr) {
    const d = new Date(dateStr);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}.${m}.${day}`;
  },

  // 点击“去使用”
  goUse() {
    wx.switchTab({
      url: '/pages/index/index'
    });
  }
});
