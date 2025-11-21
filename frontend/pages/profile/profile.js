// pages/profile/profile.js
Page({
  data: {
    user: {},
    userStats: {
      want_count: 0,
      follow_count: 0,
      coupon_count: 0
    }
  },

  onShow() {
    const token = wx.getStorageSync('token');
    if (token) {
      this.loadUserInfo();
      this.loadUserStats();
    } else {
      this.setData({
        user: {},
        userStats: { want_count: 0, follow_count: 0, coupon_count: 0 }
      });
    }
  },

  // ✅ 点击登录/注册跳转
  onLoginTap() {
    const token = wx.getStorageSync('token');
    if (!token) {
      wx.navigateTo({ url: '/pages/login/login' });
    }
  },

  // 获取用户基本信息
  loadUserInfo() {
    wx.request({
      url: 'http://localhost:3000/api/user/info',
      header: { Authorization: 'Bearer ' + wx.getStorageSync('token') },
      success: (res) => {
        if (res.data.status === 0) {
          this.setData({ user: res.data.data });
        }
      }
    });
  },

  // 获取用户统计
  loadUserStats() {
    wx.request({
      url: 'http://localhost:3000/api/user/stats',
      header: { Authorization: 'Bearer ' + wx.getStorageSync('token') },
      success: (res) => {
        if (res.data.status === 0) {
          this.setData({ userStats: res.data.data });
        }
      }
    });
  },

  // 点击跳转
  goToOrders() {
    wx.navigateTo({ url: '/pages/order-list/order-list' });
  },
  goToTickets() {
    wx.navigateTo({ url: '/pages/ticket/ticket' });
  },
  goToViewers() {
    wx.navigateTo({ url: '/pages/viewer-select/viewer-select' });
  },
  goToFeedback() {
    wx.navigateTo({ url: '/pages/feedback/feedback' });
  },
  goToCoupons() {
    wx.navigateTo({ url: '/pages/coupon-list/coupon-list' });
  },
  goToFavorites() {
    wx.switchTab({ url: '/pages/favorites/favorites' });
  },  
  goToFollow() {
    wx.navigateTo({ url: '/pages/follow/follow' });
  },
  goToPolicy() {
    wx.navigateTo({ url: '/pages/policy/policy' });
  },
  goToLicense() {
    wx.navigateTo({ url: '/pages/license/license' });
  },
  onSettings() {
    wx.navigateTo({ url: '/pages/settings/settings' });
  },
  goToService() {
    wx.navigateTo({ url: '/pages/customer-service/customer-service' });
  }
});
