Page({
  data: {
    artist: {},            // 艺人信息
    performances: [],      // 艺人相关的演出列表
    isFollowing: false,    // 是否关注该艺人
    hasMore: true,         // 是否还有更多演出
    loading: false         // 是否正在加载演出
  },

  onLoad(options) {
    const artistId = options.id;  // 获取艺人ID
    if (!artistId || isNaN(artistId)) {
      wx.showToast({ title: '艺人ID无效', icon: 'none', duration: 2000 });
      return;
    }
    this.loadArtist(artistId);   // 加载艺人信息
    this.loadPerformances(artistId);  // 加载艺人相关演出
  },

  loadArtist(id) {
    const token = wx.getStorageSync('token');
    wx.request({
      url: `http://localhost:3000/api/artists/${id}`,
      method: 'GET',
      header: token ? { Authorization: `Bearer ${token}` } : {},
      success: (res) => {
        if (res.statusCode === 200 && res.data) {
          const artist = res.data;
          if (artist.cover_url && !artist.cover_url.startsWith('http')) {
            artist.cover_url = `http://localhost:3000${artist.cover_url}`;
          }
          this.setData({ artist, isFollowing: artist.isFollowing });
        } else {
          wx.showToast({ title: '获取艺人信息失败', icon: 'none' });
        }
      },
      fail: (err) => {
        console.error('获取艺人信息失败:', err);
        wx.showToast({ title: '网络错误，请稍后重试', icon: 'none' });
      }
    });
  },

  loadPerformances(artistId) {
    wx.request({
      url: `http://localhost:3000/api/artists/${artistId}/performances`,
      method: 'GET',
      success: (res) => {
        if (res.statusCode === 200 && Array.isArray(res.data.data)) {
          const performances = res.data.data.map(p => ({
            ...p,
            cover_url: p.cover_url.startsWith('http') ? p.cover_url : `http://localhost:3000${p.cover_url}`
          }));
          this.setData({ performances });  // 确保正确赋值给 performances
        } else {
          wx.showToast({ title: '未找到相关演出', icon: 'none' });
        }
      },
      fail: (err) => {
        console.error('获取艺人演出失败:', err);
        wx.showToast({ title: '网络错误，请稍后重试', icon: 'none' });
      }
    });
  }
,  

  // 滚动到底部加载更多
  onLoadMore() {
    if (this.data.hasMore) {
      const artistId = this.options.id;
      this.loadPerformances(artistId); // 加载更多演出
    }
  },

  onCardTap(e) {
    const id = e.detail.id;
    wx.navigateTo({
      url: `/pages/detail/detail?id=${id}`
    });
  },

  // 关注/取关艺人
  toggleFollow() {
    const token = wx.getStorageSync('token');
    if (!token) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }

    const { artist } = this.data;
    const isFollowing = !!artist.isFollowing;
    const url = `http://localhost:3000/api/artists/${isFollowing ? 'unfollow' : 'follow'}`;
    wx.request({
      url,
      method: 'POST',
      header: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      data: { artist_id: artist.id },
      success: (res) => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          this.setData({
            artist: {
              ...artist,
              isFollowing: !isFollowing,
              fans: artist.fans + (isFollowing ? -1 : 1)
            }
          });
          wx.showToast({
            title: isFollowing ? '已取关' : '已关注',
            icon: 'success',
          });
        } else {
          wx.showToast({ title: '操作失败', icon: 'none' });
        }
      },
      fail: () => {
        wx.showToast({ title: '网络错误，请稍后重试', icon: 'none' });
      }
    });
  },

  // 跳转到演出详情页
  goPerformanceDetail(e) {
    const id = e.currentTarget.dataset.id; // 获取演出ID
    wx.navigateTo({
      url: `/pages/performance-detail/performance-detail?id=${id}`,  // 跳转到演出详情页
    });
  }
});
