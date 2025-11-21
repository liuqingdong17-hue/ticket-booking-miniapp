// index.js
Page({
  data: {
    keyword: '',
    categories: [
      { id: 1, name: '演唱会', icon: '/images/music.png' },
      { id: 2, name: '话剧', icon: '/images/drama.png' },
      { id: 3, name: '体育', icon: '/images/sport.png' },
      { id: 4, name: '脱口秀', icon: '/images/comedy.png' },
      { id: 5, name: '舞剧', icon: '/images/dance.png' },
      { id: 6, name: '戏曲相声', icon: '/images/opera.png' },
      { id: 7, name: '音乐会', icon: '/images/concert.png' },
      { id: 8, name: '音乐节', icon: '/images/festival.png' },
      { id: 9, name: '展览', icon: '/images/exhibit.png' },
    ],
    banners: [],
    performances: [],
    page: 1,
    pageSize: 10,
    hasMore: true,
    loading: false,
    showFilter: false,
    selectedPriceValue: '',
    selectedDate: '',
    selectedCity: '',
    priceOptions: [
      { label: '100以内', value: '0-100' },
      { label: '100-300', value: '100-300' },
      { label: '300-500', value: '300-500' },
      { label: '500以上', value: '500+' }
    ],
    cityOptions: []
  },

  onLoad() {
    this.getBanners();
    this.loadData(true);
  },

  getBanners() {
    wx.request({
      url: 'http://localhost:3000/api/banners',
      method: 'GET',
      success: (res) => {
        if (res.data && res.data.status === 0) {
          this.setData({ banners: res.data.data });
        } else {
          wx.showToast({ title: '轮播图加载失败', icon: 'none' });
        }
      },
      fail: (err) => {
        console.error('getBanners fail', err);
        wx.showToast({ title: '网络请求失败', icon: 'none' });
      }
    });
  },

  loadData(reset = false) {
    if (this.data.loading) return;

    if (reset) {
      this.setData({ page: 1, performances: [], hasMore: true, loading: true });
    } else if (!this.data.hasMore) {
      return;
    }

    const { page, pageSize, selectedDate, selectedCity, selectedPriceValue } = this.data;

    const query = { page, pageSize };
    if (selectedDate) query.startDate = selectedDate;
    if (selectedCity) query.city = selectedCity;
    if (selectedPriceValue) query.priceRange = selectedPriceValue;

    wx.request({
      url: 'http://localhost:3000/api/performances/recommend',
      method: 'GET',
      data: query,
      success: (res) => {
        if (!res || !res.data) {
          wx.showToast({ title: '服务器返回异常', icon: 'none' });
          this.setData({ loading: false });
          return;
        }
        if (res.data.status !== 0) {
          wx.showToast({ title: res.data.message || '获取数据失败', icon: 'none' });
          this.setData({ loading: false });
          return;
        }

        const newList = res.data.data?.performances || [];
        const total = res.data.data?.total ?? 0;
        const offset = (page - 1) * pageSize;

        const sortedList = [...newList].sort((a, b) => b.popularity - a.popularity);

        this.setData({
          performances: reset ? sortedList : [...this.data.performances, ...sortedList],
          page: page + 1,
          hasMore: sortedList.length === pageSize && (offset + sortedList.length) < total,
          loading: false
        });
      },
      fail: (err) => {
        console.error('loadData 请求失败:', err);
        wx.showToast({ title: '网络请求失败', icon: 'none' });
        this.setData({ loading: false });
      }
    });
  },

  onFilterTap() {
    this.setData({ showFilter: true });
  },

  onFilterConfirm(e) {
    const { price, date, city } = e.detail;
    const priceOption = this.data.priceOptions.find(opt => opt.value === price) || { label: '', value: '' };

    this.setData({
      selectedPriceValue: priceOption.value,
      selectedDate: date,
      selectedCity: city,
      showFilter: false
    }, () => {
      this.loadData(true);
    });
  },

  onFilterClose() {
    this.setData({ showFilter: false });
  },

  // 新增：重置事件监听，清空筛选 + 重载数据
  onFilterReset(e) {
    console.log('父页收到重置事件', e);
    this.setData({
      selectedPriceValue: '',
      selectedDate: '',
      selectedCity: ''
    }, () => {
      this.loadData(true);  // 自动重载数据，恢复默认列表
    });
    wx.showToast({ title: '筛选已重置', icon: 'success' });
  },

  onCityChange(e) {
    this.setData({ selectedCity: e.detail.city });
    this.loadData(true);  // 城市变时自动重载
  },

  onLoadMore() {
    this.loadData(false);
  },

  onBannerTap(e) {
    const item = e.currentTarget.dataset.item;
    if (!item) return;

    const { link_type, link_value } = item;

    if (!link_type || !link_value) {
      wx.showToast({ title: '链接无效', icon: 'none' });
      return;
    }

    if (link_type === 'performance') {
      wx.navigateTo({ url: `/pages/detail/detail?id=${link_value}` });
    } else if (link_type === 'activity') {
      wx.navigateTo({ url: `/pages/activity/activity?id=${link_value}` });
    } else {
      wx.showToast({ title: '未知跳转类型', icon: 'none' });
    }
  },

  onCardTap(e) {
    const id = e?.detail?.id;
    if (!id) return;
    const performances = this.data.performances;
    const index = performances.findIndex(item => item.id === id);
    if (index !== -1) {
      const updatedItem = { ...performances[index], popularity: performances[index].popularity + 1 };
      performances[index] = updatedItem;
      this.setData({ performances });

      wx.request({
        url: 'http://localhost:3000/api/performances/updatePopularity',
        method: 'POST',
        data: { id, popularity: updatedItem.popularity },
      });

      wx.navigateTo({ url: `/pages/detail/detail?id=${id}` });
    }
  },

  onSearch(e) {
    const keyword = e.detail.value;
    if (keyword.trim()) {
      wx.navigateTo({
        url: `/pages/search/search?keyword=${encodeURIComponent(keyword)}`
      });
    } else {
      wx.showToast({ title: '请输入搜索关键词', icon: 'none' });
    }
  },

  onCategoryTap(e) {
    const categoryName = e.currentTarget.dataset.name;
    this.setData({
      selectedCategory: null,
      keyword: '',
      selectedPriceValue: '',
      selectedDate: '',
      selectedCity: ''
    }, () => {
      wx.navigateTo({
        url: `/pages/category/category?category=${encodeURIComponent(categoryName)}`
      });
    });
  }
});