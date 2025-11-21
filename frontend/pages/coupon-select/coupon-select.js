Page({
  data: {
    couponList: [],
    selectedCouponId: null
  },

  onLoad() {
    this.loadCoupons();
  },

  // 拉取可用优惠券
  loadCoupons() {
    const token = wx.getStorageSync('token');
    if (!token) {
      wx.showToast({ title: '请登录', icon: 'none' });
      wx.navigateBack();
      return;
    }
  
    wx.request({
      url: 'http://localhost:3000/api/coupons/list',
      method: 'GET',
      header: { Authorization: `Bearer ${token}` },
      success: (res) => {
        if (res.data.status === 0) {
          const list = res.data.data.map(c => {
            // ✅ 先安全转换为数字
            const discountValue = Number(c.discount_value) || 0;
            const minAmount = Number(c.min_amount) || 0;
  
            // 格式化时间
            const valid_start_fmt = this.formatDate(c.valid_start);
            const valid_end_fmt = this.formatDate(c.valid_end);
  
            // ✅ 格式化显示值（仅用于展示）
            let display_value = '';
            if (c.discount_type === 1) {
              // 满减券 / 现金券
              display_value = discountValue.toFixed(2) + '元';
            } else if (c.discount_type === 2) {
              // 折扣券（0.7 → 7折，0.85 → 8.5折）
              const d = discountValue * 10;
              display_value = (d % 1 === 0 ? d : d.toFixed(1)) + '折';
            }
  
            return {
              ...c,
              valid_start_fmt,
              valid_end_fmt,
              display_value,
              min_amount: minAmount
            };
          });
  
          this.setData({ couponList: list });
        } else {
          wx.showToast({ title: res.data.message || '加载失败', icon: 'none' });
        }
      },
      fail: () => wx.showToast({ title: '网络错误', icon: 'none' })
    });
  },
  
  

  formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const y = d.getFullYear();
    const m = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${y}.${m}.${day}`;
  },

  // 点击选择优惠券
  onSelectCoupon(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    this.setData({ selectedCouponId: id });
  },

  // 确认使用优惠券
  onConfirm() {
    if (!this.data.selectedCouponId) {
      wx.showToast({ title: '请选择优惠券', icon: 'none' });
      return;
    }
    const selectedCoupon = this.data.couponList.find(
      c => c.user_coupon_id === this.data.selectedCouponId
    );

    const eventChannel = this.getOpenerEventChannel();
    eventChannel.emit('selectCoupon', selectedCoupon);
    wx.navigateBack();
  }
});
