// pages/follow/follow.js
Page({
  data: {
    artists: []
  },

  onShow() {
    this.loadFollowedArtists();
  },

  loadFollowedArtists() {
    const token = wx.getStorageSync('token');
    if (!token) {
      this.setData({ artists: [] });
      return;
    }

    wx.request({
      url: 'http://localhost:3000/api/artists/followed/list',
      header: { Authorization: 'Bearer ' + token },
      success: (res) => {
        if (res.data.status === 0) {
          this.setData({ artists: res.data.data });
        } else {
          this.setData({ artists: [] });
        }
      }
    });
  },

  // 点击艺人 → 跳转详情页
  goArtistDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/artistDetail/artistDetail?id=${id}`
    });
  }
});
