// pages/settings/settings.js
Page({
  data: {},

  // 清除缓存
  clearCache() {
    wx.showModal({
      title: '清除缓存',
      content: '确定要清除缓存吗？',
      confirmText: '清除',
      confirmColor: '#ff4d6d',
      success(res) {
        if (res.confirm) {
          wx.clearStorageSync();
          wx.showToast({
            title: '缓存已清除',
            icon: 'success',
            duration: 1500
          });
        }
      }
    });
  },

  // 退出登录
  logout() {
    wx.showModal({
      title: '退出登录',
      content: '确定退出登录吗？',
      confirmText: '退出',
      confirmColor: '#ff4d6d',
      success(res) {
        if (res.confirm) {
          wx.removeStorageSync('token');
          wx.removeStorageSync('userId');
          wx.showToast({
            title: '已退出',
            icon: 'success',
            duration: 1000
          });
          setTimeout(() => {
            wx.switchTab({ url: '/pages/profile/profile' });
          }, 1000);
        }
      }
    });
  }
});
