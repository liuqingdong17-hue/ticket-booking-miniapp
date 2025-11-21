Page({
  data: {
    performance: {},
    artist: null,
    loading: false,
    showSeatMapModal: false,
    showServiceDetailsModal: false,
    isFavorite: false,
    checkingFavorite: false,
    isDataLoaded: false // 跟踪数据加载状态
  },

  onLoad(options) {
    console.log('onLoad triggered', options);
    const id = options.id;
    if (!id || isNaN(id)) {
      wx.showToast({ title: '演出ID无效', icon: 'none', duration: 2000 });
      return;
    }
    this.checkFavorite(id);
    this.loadPerformance(id);
  },

  checkFavorite(performanceId) {
    if (this.data.checkingFavorite) return;
    this.setData({ checkingFavorite: true });

    const token = wx.getStorageSync('token');
    if (!token) {
      this.setData({ isFavorite: false, checkingFavorite: false });
      return;
    }

    wx.request({
      url: `http://localhost:3000/api/userFavorites/${performanceId}`,
      method: 'GET',
      header: { Authorization: `Bearer ${token}` },
      success: (res) => {
        console.log('checkFavorite success', res.data);
        if (res.statusCode === 200 && res.data) {
          if (res.data.status === 0) {
            this.setData({ isFavorite: !!res.data.isFavorite, checkingFavorite: false });
          } else {
            wx.showToast({ title: res.data.error || '检查收藏失败', icon: 'none' });
            this.setData({ isFavorite: false, checkingFavorite: false });
          }
        } else {
          wx.showToast({ title: '服务器响应异常', icon: 'none' });
          this.setData({ isFavorite: false, checkingFavorite: false });
        }
      },
      fail: (err) => {
        console.error('检查收藏失败：', err);
        wx.showToast({ title: '网络错误', icon: 'none' });
        this.setData({ isFavorite: false, checkingFavorite: false });
      }
    });
  },

  loadPerformance(id) {
    this.setData({ loading: true });
    wx.request({
      url: `http://localhost:3000/api/performance-details/detail/${id}`,
      method: 'GET',
      success: (res) => {
        console.log('loadPerformance success', res.data);
        if (res.statusCode !== 200) {
          wx.showToast({ title: `服务器错误(${res.statusCode})`, icon: 'none' });
          this.setData({ loading: false });
          return;
        }
        if (res.data && res.data.status === 0) {
          const performance = res.data.data;

          if (performance.cover_url && !performance.cover_url.startsWith('http')) {
            performance.cover_url = `http://localhost:3000${performance.cover_url}`;
          }

          this.setData({ performance, loading: false, isDataLoaded: true });

          const a = performance.artists;
          let artistId = null;
          if (typeof a === 'number') {
            artistId = a;
          } else if (a && typeof a === 'object' && !Array.isArray(a)) {
            artistId = a.id || a.artist_id || null;
          } else if (Array.isArray(a) && a.length) {
            artistId = typeof a[0] === 'number' ? a[0] : (a[0]?.id || a[0]?.artist_id || null);
          }

          if (artistId) this.fetchArtist(artistId);
        } else {
          wx.showToast({ title: res.data.message || '获取演出详情失败', icon: 'none' });
          this.setData({ loading: false });
        }
      },
      fail: (err) => {
        console.error('Performance request fail:', err);
        wx.showToast({ title: '网络错误，请稍后重试', icon: 'none' });
        this.setData({ loading: false });
      }
    });
  },

  onToggleFavorite() {
    const token = wx.getStorageSync('token');
    if (!token) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }

    const { performance } = this.data;
    if (!performance.id) return;

    wx.request({
      url: `http://localhost:3000/api/userFavorites/toggle`,
      method: 'POST',
      header: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      data: { performance_id: performance.id },
      success: (res) => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          if (res.data.status === 0) {
            this.setData({ isFavorite: res.data.isFavorite });
            wx.showToast({
              title: res.data.message || '操作成功',
              icon: 'success'
            });
          } else {
            wx.showToast({ title: res.data.error || '操作失败', icon: 'none' });
          }
        } else {
          wx.showToast({ title: res.data?.error || '服务器错误', icon: 'none' });
        }
      },
      fail: (err) => {
        console.error('切换收藏失败：', err);
        wx.showToast({ title: '网络错误，请稍后重试', icon: 'none' });
      }
    });
  },

  fetchArtist(artistId) {
    const token = wx.getStorageSync('token');
    wx.request({
      url: `http://localhost:3000/api/artists/${artistId}`,
      method: 'GET',
      header: token ? { Authorization: `Bearer ${token}` } : {},
      success: (res) => {
        if (res.statusCode === 200 && res.data && res.data.id) {
          this.setData({ artist: res.data });
        } else {
          console.warn('获取艺人失败：', res);
        }
      },
      fail: (err) => {
        console.error('Artist request fail:', err);
      }
    });
  },

  toggleFollow() {
    const { artist } = this.data;
    if (!artist) return;

    const token = wx.getStorageSync('token');
    if (!token) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }

    const isFollowing = !!artist.isFollowing;
    const url = `http://localhost:3000/api/artists/${isFollowing ? 'unfollow' : 'follow'}`;
    wx.request({
      url,
      method: 'POST',
      header: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      data: { artist_id: artist.id },
      success: (res) => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          const fansDelta = isFollowing ? -1 : 1;
          this.setData({
            artist: {
              ...artist,
              isFollowing: !isFollowing,
              fans: Math.max(0, (artist.fans || 0) + fansDelta)
            }
          });
        } else {
          wx.showToast({ title: res.data?.error || '操作失败', icon: 'none' });
        }
      },
      fail: () => {
        wx.showToast({ title: '网络错误，请稍后重试', icon: 'none' });
      }
    });
  },

  goArtistDetail() {
    const { artist } = this.data;
    if (!artist || !artist.id) {
      wx.showToast({ title: '艺人数据未加载', icon: 'none' });
      return;
    }
    wx.navigateTo({
      url: `/pages/artistDetail/artistDetail?id=${artist.id}`
    });
  },
  

  showSeatMap() {
    if (this.data.performance.has_seat_map && this.data.performance.seat_map_url) {
      this.setData({ showSeatMapModal: true });
    } else {
      wx.showToast({ title: '暂无座位图', icon: 'none' });
    }
  },
  closeSeatMapModal() {
    this.setData({ showSeatMapModal: false });
  },
  showServiceDetails() {
    const p = this.data.performance;
    if (p.refundable || p.selectable_seats || p.real_name_required || p.ticket_exchangeable || p.electronic_ticket) {
      this.setData({ showServiceDetailsModal: true });
      const serviceDetail = this.selectComponent('#service-detail');
      if (serviceDetail) serviceDetail.show();
      else wx.showToast({ title: '组件加载失败，请刷新', icon: 'none' });
    }
  },
  closeServiceDetailsModal() {
    this.setData({ showServiceDetailsModal: false });
    const serviceDetail = this.selectComponent('#service-detail');
    if (serviceDetail) serviceDetail.hide();
  },

  // ================= 分享 =================
  onShareAppMessage() {
    console.log('onShareAppMessage triggered', this.data.performance);
    const { performance } = this.data;
    if (!performance || !performance.id) {
      console.warn('Performance data not loaded for sharing');
      wx.showToast({ title: '演出数据未加载', icon: 'none' });
      return;
    }
    return {
      title: performance.name || '好演出推荐',
      path: `/pages/detail/detail?id=${performance.id}`,
      success: (res) => {
        console.log('Share success', res);
      },
      fail: (err) => {
        console.error('Share failed:', err);
      }
    };
  },

// 购买
onBuyNow() {
  const { performance } = this.data;
  if (!performance || !performance.id) {
    wx.showToast({ title: '演出数据未加载', icon: 'none' });
    return;
  }

  wx.navigateTo({
    url: `/pages/select-schedule/select-schedule?performance_id=${performance.id}`
  });
}

});