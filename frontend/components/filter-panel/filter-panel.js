// components/filter-panel/filter-panel.js
Component({
  properties: {
    showFilter: {
      type: Boolean,
      value: false
    },
    selectedPriceValue: {  // 传的是区间值，比如 "0-100"
      type: String,
      value: ''
    },
    selectedDate: {
      type: String,
      value: ''
    },
    selectedCity: {
      type: String,
      value: ''
    },
    priceOptions: {
      type: Array,
      value: []
    }
  },

  data: {
    selectedPriceLabel: '请选择',
    pricePickerShow: false,
    provincePickerShow: false,
    cityPickerShow: false,
    provinces: [],
    currentCities: [],
    selectedProvince: ''
  },

  observers: {
    'selectedPriceValue,priceOptions'(selectedPriceValue, priceOptions) {
      const found = priceOptions.find(item => item.value === selectedPriceValue);
      this.setData({
        selectedPriceLabel: found ? found.label : '请选择'
      });
    }
  },

  lifetimes: {
    attached() {
      this.loadProvinces();
    }
  },

  methods: {
    loadProvinces() {
      wx.request({
        url: 'https://unpkg.com/province-city-china/dist/province.json',
        success: (res) => {
          if (res.statusCode === 200 && res.data) {
            const provinces = res.data.map(item => ({
              name: item.name,
              code: item.code
            }));
            this.setData({ provinces });
            console.log('loadProvinces: 成功加载', provinces.length, '省份');
          } else {
            wx.showToast({ title: '加载省份数据失败', icon: 'none' });
          }
        },
        fail: (err) => {
          console.error('loadProvinces fail', err);
          wx.showToast({ title: '网络请求失败', icon: 'none' });
        }
      });
    },

    loadCities(provinceCode) {
      wx.request({
        url: 'https://unpkg.com/province-city-china/dist/city.json',
        success: (res) => {
          if (res.statusCode === 200 && res.data) {
            const cities = res.data
              .filter(item => item.province === provinceCode.slice(0, 2))
              .map(item => item.name);
            this.setData({ currentCities: cities });
            console.log('loadCities: 成功加载', cities.length, '城市 for 省份', provinceCode);
          } else {
            wx.showToast({ title: '加载城市数据失败', icon: 'none' });
          }
        },
        fail: (err) => {
          console.error('loadCities fail', err);
          wx.showToast({ title: '网络请求失败', icon: 'none' });
        }
      });
    },

    onClose() {
      this.setData({
        pricePickerShow: false,
        provincePickerShow: false,
        cityPickerShow: false
      });
      this.triggerEvent('close');
    },

    togglePricePicker() {
      this.setData({
        pricePickerShow: !this.data.pricePickerShow,
        provincePickerShow: false,
        cityPickerShow: false
      });
    },

    selectPrice(e) {
      const value = e.currentTarget.dataset.value;
      this.setData({
        selectedPriceValue: value,
        pricePickerShow: false
      });
    },

    onDateChange(e) {
      this.setData({
        selectedDate: e.detail.value
      });
    },

    toggleProvincePicker() {
      this.setData({
        provincePickerShow: !this.data.provincePickerShow,
        pricePickerShow: false,
        cityPickerShow: false
      });
      console.log('toggleProvincePicker: 打开省份 Picker');
    },

    selectProvince(e) {
      const province = e.currentTarget.dataset.value;
      const provinceCode = e.currentTarget.dataset.code;
      this.loadCities(provinceCode);
      this.setData({
        selectedProvince: province,
        provincePickerShow: false,
        cityPickerShow: true  // 选省份后打开城市 Picker
      });
      console.log('selectProvince: 选择省份', province, '加载城市');
    },

    // 修改：toggleCityPicker 点“城市”栏时打开省份 Picker（全国筛选）
    toggleCityPicker() {
      console.log('toggleCityPicker: 打开省份 Picker，用于全国城市筛选');
      this.setData({
        provincePickerShow: true,  // 先打开省份 Picker
        pricePickerShow: false,
        cityPickerShow: false
      });
    },

    selectCity(e) {
      const city = e.currentTarget.dataset.value;
      this.setData({
        selectedCity: city,
        cityPickerShow: false
      });
      this.triggerEvent('cityChange', { city });
      console.log('selectCity: 选择城市', city);
    },

    onLocate() {
      // 新增：预授权位置权限（弹出授权弹窗）
      wx.authorize({
        scope: 'scope.userLocation',
        success: () => {
          // 已授权，直接定位
          this._doGetLocation();
        },
        fail: () => {
          // 拒绝或未授权，引导设置
          this._guideToSetting();
        }
      });
    },

    // 新增：引导设置的逻辑
    _guideToSetting() {
      wx.getSetting({
        success: (res) => {
          if (!res.authSetting['scope.userLocation']) {
            wx.showModal({
              title: '需要位置权限',
              content: '请在小程序设置中开启位置权限，以获取本地推荐。注意：如果未看到位置选项，请检查 app.json 配置并重启小程序。',
              confirmText: '去设置',
              success: (modalRes) => {
                if (modalRes.confirm) {
                  wx.openSetting({
                    success: (settingRes) => {
                      // 设置后重新检查并重试
                      if (settingRes.authSetting['scope.userLocation']) {
                        wx.showToast({ title: '授权成功，重试定位', icon: 'success' });
                        setTimeout(() => this.onLocate(), 500);  // 延时重试
                      } else {
                        wx.showToast({ title: '请手动开启位置权限', icon: 'none' });
                      }
                    },
                    fail: () => {
                      wx.showToast({ title: '打开设置失败', icon: 'none' });
                    }
                  });
                }
              }
            });
          } else {
            this._doGetLocation();
          }
        }
      });
    },

    // 新增：提取 getLocation 逻辑
    _doGetLocation() {
      wx.showLoading({ title: '定位中...' });
      wx.getLocation({
        type: 'gcj02',  // 改成 gcj02，更适合中国
        success: (res) => {
          wx.hideLoading();
          this.getCityByLocation(res.latitude, res.longitude);
        },
        fail: (err) => {
          wx.hideLoading();
          console.error('getLocation fail:', err);  // 调试用
          // 如果是权限拒绝，重新引导
          if (err.errMsg.includes('auth deny')) {
            this._guideToSetting();
          } else {
            wx.showToast({ title: '定位失败，请检查 GPS 或重试', icon: 'none' });
          }
        },
        complete: () => {
          wx.hideLoading();  // 无论成败都隐藏 loading
        }
      });
    },

    // 修改 getCityByLocation：定位后直接填城市栏，不打开 Picker
    getCityByLocation(latitude, longitude) {
      const apiKey = '2L5BZ-GFSHT-WL5XV-VIA4E-JDFYK-UEFOV';  // 当前 Key；请替换成你的真实腾讯地图 Key
      if (!apiKey || apiKey.length < 20) {  // 简单校验 Key 有效性
        wx.showToast({ title: '请配置有效的腾讯地图 Key', icon: 'none' });
        return;
      }

      wx.request({
        url: 'https://apis.map.qq.com/ws/geocoder/v1/',
        data: {
          location: `${latitude},${longitude}`,
          key: apiKey
        },
        success: (res) => {
          if (res.data.status === 0) {
            const city = res.data.result.address_component.city;
            this.setData({ selectedCity: city });  // 直接填入城市栏
            this.triggerEvent('cityChange', { city });
            wx.showToast({ title: `定位到: ${city}`, icon: 'success' });
            console.log('getCityByLocation: 填入城市', city);
          } else {
            wx.showToast({ title: `解析城市失败: ${res.data.message || '未知错误'}`, icon: 'none' });
          }
        },
        fail: (err) => {
          console.error('腾讯地图 API fail:', err);
          wx.showToast({ title: '网络错误，城市解析失败', icon: 'none' });
        }
      });
    },

    onConfirm() {
      const { selectedPriceValue, selectedDate, selectedCity } = this.data;
      this.triggerEvent('confirm', {
        price: selectedPriceValue,
        date: selectedDate,
        city: selectedCity
      });
      this.onClose();
    },

    // 新增：重置筛选数据
    onReset() {
      console.log('onReset: 清空筛选数据');  // 调试日志
      this.setData({
        selectedPriceValue: '',
        selectedDate: '',
        selectedCity: '',
        selectedProvince: '',
        currentCities: [],
        selectedPriceLabel: '请选择',
        pricePickerShow: false,
        provincePickerShow: false,
        cityPickerShow: false
      });
      this.triggerEvent('reset', {});  // 通知父页重载数据
      wx.showToast({ title: '已重置', icon: 'success' });
      this.onClose();
    }
  }
});