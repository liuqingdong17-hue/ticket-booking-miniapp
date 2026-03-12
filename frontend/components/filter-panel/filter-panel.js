// components/filter-panel/filter-panel.js
Component({
  properties: {
    showFilter: {
      type: Boolean,
      value: false
    },
    selectedPriceValue: {  
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

      this.triggerEvent('priceChange', { price: value });

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

    /* 
    =========================================
     ✅ 修复后的 selectProvince（支持直辖市）
    =========================================
    */
    selectProvince(e) {
      const province = e.currentTarget.dataset.value;
      const provinceCode = e.currentTarget.dataset.code;

      console.log("selectProvince:", province, provinceCode);

      // ---- 直辖市代码 ----
      const directCities = ["110000", "120000", "310000", "500000"];

      if (directCities.includes(provinceCode)) {
        console.log("直辖市，直接作为城市使用:", province);

        this.setData({
          selectedCity: province,
          provincePickerShow: false,
          cityPickerShow: false
        });

        this.triggerEvent("cityChange", { city: province });

        wx.showToast({ title: `已选择：${province}`, icon: "success" });
        return;
      }

      // ---- 普通省份逻辑 ----
      this.loadCities(provinceCode);

      this.setData({
        selectedProvince: province,
        provincePickerShow: false,
        cityPickerShow: true
      });

      console.log("普通省份，继续选择城市:", province);
    },

    toggleCityPicker() {
      console.log('toggleCityPicker: 打开省份 Picker，用于全国城市筛选');
      this.setData({
        provincePickerShow: true,
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
      wx.authorize({
        scope: 'scope.userLocation',
        success: () => {
          this._doGetLocation();
        },
        fail: () => {
          this._guideToSetting();
        }
      });
    },

    _guideToSetting() {
      wx.getSetting({
        success: (res) => {
          if (!res.authSetting['scope.userLocation']) {
            wx.showModal({
              title: '需要位置权限',
              content: '请在小程序设置中开启位置权限，以获取本地推荐。',
              confirmText: '去设置',
              success: (modalRes) => {
                if (modalRes.confirm) {
                  wx.openSetting({
                    success: (settingRes) => {
                      if (settingRes.authSetting['scope.userLocation']) {
                        wx.showToast({ title: '授权成功，重试定位', icon: 'success' });
                        setTimeout(() => this.onLocate(), 500);
                      }
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

    _doGetLocation() {
      wx.showLoading({ title: '定位中...' });
      wx.getLocation({
        type: 'gcj02',
        success: (res) => {
          wx.hideLoading();
          this.getCityByLocation(res.latitude, res.longitude);
        },
        fail: (err) => {
          wx.hideLoading();
          console.error('getLocation fail:', err);
          if (err.errMsg.includes('auth deny')) {
            this._guideToSetting();
          } else {
            wx.showToast({ title: '定位失败，请检查 GPS 或重试', icon: 'none' });
          }
        }
      });
    },

    getCityByLocation(latitude, longitude) {
      const apiKey = '2L5BZ-GFSHT-WL5XV-VIA4E-JDFYK-UEFOV';

      if (!apiKey || apiKey.length < 20) {
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
            this.setData({ selectedCity: city });
            this.triggerEvent('cityChange', { city });
            wx.showToast({ title: `定位到: ${city}`, icon: 'success' });
          } else {
            wx.showToast({ title: '解析城市失败', icon: 'none' });
          }
        },
        fail: () => {
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

    onReset() {
      console.log('onReset: 清空筛选数据');
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
      this.triggerEvent('reset', {});
      wx.showToast({ title: '已重置', icon: 'success' });
      this.onClose();
    }
  }
});
