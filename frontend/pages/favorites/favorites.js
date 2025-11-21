const app = getApp();

Page({
  data: {
    performances: [],
    page: 1,
    pageSize: 10,
    hasMore: true
  },

  onLoad() {
    this.fetchFavorites();
  },

  // 获取“想看”演出
  fetchFavorites() {
    const userId = wx.getStorageSync('userId'); // 登录时存储的 userId
    if (!userId) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }

    wx.request({
      url: `http://localhost:3000/api/favorites`,
      method: 'GET',
      header: {
        Authorization: `Bearer ${wx.getStorageSync('token')}` // 登录时存的 token
      },
      success: (res) => {
        if (res.data.status === 0) {
          this.setData({
            performances: res.data.data || [],
            hasMore: false
          });
        } else {
          wx.showToast({ title: res.data.message, icon: 'none' });
        }
      },
      fail: () => {
        wx.showToast({ title: '请求失败', icon: 'none' });
      }
    });    
  },

  // 下拉加载更多
  loadMore() {
    if (!this.data.hasMore) return;
    this.setData({ page: this.data.page + 1 }, () => {
      this.fetchFavorites();
    });
  },

  // 点击演出卡片
  onCardTap(e) {
    const { id } = e.detail;
    wx.navigateTo({
      url: `/pages/detail/detail?id=${id}`
    });
  }
});
