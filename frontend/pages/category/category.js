// pages/category/category.js
Page({
  data: {
    categoryName: '',
    hotPerformances: [],
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
  },

  onLoad(options) {
    this.setData({
      categoryName: decodeURIComponent(options.category || '')
    });
    const name = decodeURIComponent(options.category || '');
    this.setData({
      categoryName: name
    });
    wx.setNavigationBarTitle({
      title: `分类（${name}）`
    });
    this.loadHotPerformances();
    this.loadData(true);
  },

  onBack() {
    wx.navigateBack();
  },

  loadHotPerformances() {
    const today = new Date().toISOString().split('T')[0];
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 1);
    const until = futureDate.toISOString().split('T')[0];

    const query = {
      category: this.data.categoryName,
      sinceDate: today,
      untilDate: until,
      page: 1,
      pageSize: 5
    };

    console.log('Hot performances query:', query);
    wx.request({
      url: 'http://localhost:3000/api/performances/recommend',
      method: 'GET',
      data: query,
      success: (res) => {
        console.log('Hot performances response:', res.data);
        if (res.data.status === 0) {
          this.setData({
            hotPerformances: (res.data.data.performances || []).map(item => ({
              ...item,
              cover_url: item.cover_url.startsWith('http') ? item.cover_url : `http://localhost:3000${item.cover_url}`
            }))
          });
          if (res.data.data.performances.length === 0) {
            wx.showToast({ title: '暂无热门演出', icon: 'none' });
          }
        } else {
          wx.showToast({ title: res.data.message || '热门演出加载失败', icon: 'none' });
        }
      },
      fail: (err) => {
        console.error('loadHotPerformances fail:', err);
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

    const query = { 
      page, 
      pageSize, 
      category: this.data.categoryName
    };
    if (selectedDate) query.startDate = selectedDate;
    if (selectedCity) query.city = selectedCity;
    if (selectedPriceValue) query.priceRange = selectedPriceValue;

    console.log('loadData -> 请求参数:', query);

    wx.request({
      url: 'http://localhost:3000/api/performances/recommend',
      method: 'GET',
      data: query,
      success: (res) => {
        console.log('All performances response:', res.data);
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
    console.log('分类页收到重置事件', e);
    this.setData({
      selectedPriceValue: '',
      selectedDate: '',
      selectedCity: ''
    }, () => {
      this.loadData(true);  // 自动重载数据
    });
    wx.showToast({ title: '筛选已重置', icon: 'success' });
  },

  onCityChange(e) {
    this.setData({ selectedCity: e.detail.city });
  },

  onLoadMore() {
    this.loadData(false);
  },

  onCardTap(e) {
    const id = e.currentTarget.dataset.id || e.detail?.id;
    console.log('onCardTap:', { id, event: e }); // 调试：检查 id
    if (!id) {
      console.error('No valid id found for card tap');
      wx.showToast({ title: '演出ID无效', icon: 'none' });
      return;
    }

    // 更新热度（异步，不阻塞跳转）
    const updatePopularity = (list, index, isHot) => {
      const updatedItem = { ...list[index], popularity: list[index].popularity + 1 };
      list[index] = updatedItem;
      this.setData(isHot ? { hotPerformances: list } : { performances: list });

      wx.request({
        url: 'http://localhost:3000/api/performances/updatePopularity',
        method: 'POST',
        data: { id, popularity: updatedItem.popularity },
        success: (res) => {
          if (res.data.status !== 0) {
            console.error('Update popularity failed:', res.data.message);
            list[index] = { ...list[index], popularity: list[index].popularity - 1 };
            this.setData(isHot ? { hotPerformances: list } : { performances: list });
          }
        },
        fail: (err) => {
          console.error('Update popularity request failed:', err);
          list[index] = { ...list[index], popularity: list[index].popularity - 1 };
          this.setData(isHot ? { hotPerformances: list } : { performances: list });
        }
      });
    };

    // 查找 id
    const hotIndex = this.data.hotPerformances.findIndex(item => item.id === id);
    if (hotIndex !== -1) {
      updatePopularity([...this.data.hotPerformances], hotIndex, true);
    } else {
      const index = this.data.performances.findIndex(item => item.id === id);
      if (index !== -1) {
        updatePopularity([...this.data.performances], index, false);
      } else {
        console.warn('Performance not found for id:', id);
      }
    }

    // 立即跳转
    wx.navigateTo({ url: `/pages/detail/detail?id=${id}` });
  }
});