Page({
  data: {
    performance: {},
    artists: [],
    loading: false,
    showSeatMapModal: false,
    showServiceDetailsModal: false,
    isFavorite: false,
    checkingFavorite: false,
    isDataLoaded: false, // 跟踪数据加载状态

    reviews: []   // ⭐ 新增：评论列表
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

    this.loadReviews(id);   // ⭐ 新增：加载用户评论
  },

  // ⭐ 新增方法：加载评论
  loadReviews(performance_id) {
    wx.request({
      url: `http://localhost:3000/api/review/list/${performance_id}`,
      method: "GET",
      success: (res) => {
        if (res.data.status === 0) {
          const reviews = res.data.data || [];
  
          reviews.forEach(r => {
            const rating = Number(r.rating || 0);
  
            // ⭐⭐⭐ 关键：生成星星数组
            r.stars = [1, 2, 3, 4, 5].map(n => n <= rating);
          });
  
          this.setData({ reviews });
        }
      }
    });
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
          wx.showToast({ title: '登录可享完整服务', icon: 'none' });
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
          
          const avgScore = Number(performance.avg_score || 0); // 10 分制
          performance.avgStars = Math.floor(avgScore / 2);     // 6.0 → 3 星

          if (performance.cover_url && !performance.cover_url.startsWith('http')) {
            performance.cover_url = `http://localhost:3000${performance.cover_url}`;
          }

          this.setData({ performance, loading: false, isDataLoaded: true });

          // const a = performance.artists;
          // let artistId = null;
          // if (typeof a === 'number') {
          //   artistId = a;
          // } else if (a && typeof a === 'object' && !Array.isArray(a)) {
          //   artistId = a.id || a.artist_id || null;
          // } else if (Array.isArray(a) && a.length) {
          //   artistId = typeof a[0] === 'number' ? a[0] : (a[0]?.id || a[0]?.artist_id || null);
          // }

          // if (artistId) this.fetchArtist(artistId);
          // 统一拿到 artistIds 数组
          const a = performance.artists;
          let artistIds = [];

          if (Array.isArray(a)) {
            artistIds = a;
          } else if (typeof a === 'number') {
            artistIds = [a];
          } else if (a && typeof a === 'object') {
            const one = a.id || a.artist_id;
            artistIds = one ? [one] : [];
          }

          // 去重 + 过滤空值
          artistIds = [...new Set(artistIds)].filter(Boolean);

          // 批量获取艺人详情
          if (artistIds.length) {
            this.fetchArtists(artistIds);
          } else {
            this.setData({ artists: [] });
          }

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

  // fetchArtist(artistId) {
  //   const token = wx.getStorageSync('token');
  //   wx.request({
  //     url: `http://localhost:3000/api/artists/${artistId}`,
  //     method: 'GET',
  //     header: token ? { Authorization: `Bearer ${token}` } : {},
  //     success: (res) => {
  //       if (res.statusCode === 200 && res.data && res.data.id) {
  //         this.setData({ artist: res.data });
  //       } else {
  //         console.warn('获取艺人失败：', res);
  //       }
  //     },
  //     fail: (err) => {
  //       console.error('Artist request fail:', err);
  //     }
  //   });
  // },
  requestPromise(options) {
    return new Promise((resolve, reject) => {
      wx.request({
        ...options,
        success: resolve,
        fail: reject
      });
    });
  },
  
  async fetchArtists(artistIds) {
    const token = wx.getStorageSync('token');
    try {
      const reqs = artistIds.map(id =>
        this.requestPromise({
          url: `http://localhost:3000/api/artists/${id}`,
          method: 'GET',
          header: token ? { Authorization: `Bearer ${token}` } : {}
        })
      );
  
      const resList = await Promise.all(reqs);
  
      // 你的艺人接口现在看起来是直接返回对象（res.data.id 存在）
      const artists = resList
        .map(r => r.data)
        .filter(a => a && a.id);
  
      this.setData({ artists });
    } catch (e) {
      console.error('fetchArtists error:', e);
      this.setData({ artists: [] });
    }
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
          wx.showToast({ title:'请先登录' || '操作失败', icon: 'none' });
        }
      },
      fail: () => {
        wx.showToast({ title: '网络错误，请稍后重试', icon: 'none' });
      }
    });
  },

  goArtistDetail(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) {
      wx.showToast({ title: '艺人数据未加载', icon: 'none' });
      return;
    }
    wx.navigateTo({
      url: `/pages/artistDetail/artistDetail?id=${id}`
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

  onShareAppMessage() {
    console.log('onShareAppMessage triggered', this.data.performance);
    const { performance } = this.data;
    if (!performance || !performance.id) {
      wx.showToast({ title: '演出数据未加载', icon: 'none' });
      return;
    }
    return {
      title: performance.name || '好演出推荐',
      path: `/pages/detail/detail?id=${performance.id}`
    };
  },

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
