Page({
  data: {
    keyword: '',             // 搜索关键词
    performances: [],        // 存储演出数据
    artists: [],             // 存储艺人数据
    page: 1,                 // 当前页数
    pageSize: 10,            // 每页数量
    hasMore: true,           // 是否还有更多数据
    loading: false,          // 控制加载状态
    internalPerformances: [] // 用来展示演出信息
  },

  onLoad(options) {
    const { keyword } = options;
    this.setData({ keyword: decodeURIComponent(keyword) });
    this.fetchSearchResults();
  },

  fetchSearchResults() {
    const { keyword, page, pageSize } = this.data;

    if (this.data.loading) return;
    this.setData({ loading: true });

    wx.request({
      url: `http://localhost:3000/api/search`,
      method: 'GET',
      data: { keyword, page, pageSize }, // 直接传 data，避免多次 encode
      success: (res) => {
        if (res.data.status === 0) {
          const data = res.data.data || {};
          const performances = page === 1
            ? data.performances
            : [...this.data.performances, ...data.performances];

          this.setData({
            performances,
            artists: page === 1 ? (data.artists || []) : this.data.artists,
            hasMore: data.performances.length === pageSize, // 如果返回的数量小于 pageSize，表示没有更多数据
            internalPerformances: performances,
          });
        } else {
          wx.showToast({ title: res.data.message, icon: 'none' });
        }
      },
      fail: () => {
        wx.showToast({ title: '请求失败', icon: 'none' });
      },
      complete: () => {
        this.setData({ loading: false });
      }
    });
  },

  onSearchInput(e) {
    this.setData({ keyword: e.detail.value });
  },

  onSearch() {
    const { keyword } = this.data;
    if (keyword.trim()) {
      this.setData({ page: 1, performances: [] }, () => {
        this.fetchSearchResults();  // 获取新的搜索结果
      });
    } else {
      wx.showToast({ title: '请输入搜索关键词', icon: 'none' });
    }
  },

  onSearchBtn() {
    const { keyword } = this.data;
    if (keyword.trim()) {
      this.setData({ page: 1 }, () => {
        this.fetchSearchResults();  // 获取新的搜索结果
      });
    } else {
      wx.showToast({ title: '请输入搜索关键词', icon: 'none' });
    }
  },

  // 下拉加载更多
  onScrollToLower() {
    if (this.data.hasMore && !this.data.loading) {
      this.setData({ page: this.data.page + 1 }, () => {
        this.fetchSearchResults();
      });
    }
  },

  // 点击演出卡片
  onPerformanceTap(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/detail/detail?id=${id}` });
  },

  // 点击艺人卡片
  onArtistTap(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/artistDetail/artistDetail?id=${id}` });
  },
});
