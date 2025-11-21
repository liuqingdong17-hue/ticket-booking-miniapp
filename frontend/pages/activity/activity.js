// pages/activity/activity.js
Page({
  data: {
    id: null,
    activity: null,
    coupons: [],
    loading: true
  },

  onLoad(options) {
    const { id } = options;
    if (!id) {
      wx.showToast({ title: '活动ID无效', icon: 'none' });
      return;
    }
    this.setData({ id });
    this.getActivityDetail(id);
  },

  // ✅ 时间格式化函数
  formatTime(isoString, withTime = true) {
    if (!isoString) return '';
    const date = new Date(isoString);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    if (withTime) {
      const hh = String(date.getHours()).padStart(2, '0');
      const mm = String(date.getMinutes()).padStart(2, '0');
      return `${y}-${m}-${d} ${hh}:${mm}`;
    } else {
      return `${y}-${m}-${d}`;
    }
  },

  // ✅ 获取活动详情
  getActivityDetail(id) {
    const token = wx.getStorageSync('token');

    wx.request({
      url: `http://localhost:3000/api/activities/${id}`,
      method: 'GET',
      header: token ? { Authorization: 'Bearer ' + token } : {},
      success: (res) => {
        if (res.data.status === 0) {
          const { activity, coupons } = res.data.data;

          // ✅ 格式化活动时间
          const formattedActivity = {
            ...activity,
            start_time: this.formatTime(activity.start_time),
            end_time: this.formatTime(activity.end_time)
          };

          // ✅ 格式化优惠券信息
          const formattedCoupons = (coupons || []).map(c => {
            const valid_start = this.formatTime(c.start_time, false);
            const valid_end = this.formatTime(c.end_time, false);
          
            let displayText = '';
            if (c.discount_type === 1) {
              // 满减券
              displayText = `满${c.min_amount}减${c.discount_value}`;
            } else if (c.discount_type === 2) {
              // 折扣券，小数转成 x折
              let discountNum = Number(c.discount_value) * 10;
              // 保留一位小数（如果是整数则去掉小数点）
              discountNum = discountNum % 1 === 0 ? discountNum.toFixed(0) : discountNum.toFixed(1);
              displayText = `${discountNum}折`;
            } else {
              displayText = '优惠券';
            }
          
            return {
              ...c,
              valid_start,
              valid_end,
              display_text: displayText
            };
          });
          

          this.setData({
            activity: formattedActivity,
            coupons: formattedCoupons,
            loading: false
          });
        } else {
          wx.showToast({ title: res.data.message || '活动加载失败', icon: 'none' });
          this.setData({ loading: false });
        }
      },
      fail: (err) => {
        console.error('getActivityDetail fail:', err);
        wx.showToast({ title: '网络错误', icon: 'none' });
        this.setData({ loading: false });
      }
    });
  },

  // ✅ 领取优惠券逻辑保持不变
  onReceiveCoupon(e) {
    const couponId = e.currentTarget.dataset.id;
    if (!couponId) return;

    const token = wx.getStorageSync('token');
    if (!token) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }

    wx.request({
      url: `http://localhost:3000/api/coupons/receive/${couponId}`,
      method: 'POST',
      header: { Authorization: 'Bearer ' + token },
      success: (res) => {
        if (res.data.status === 0) {
          wx.showToast({ title: '领取成功', icon: 'success' });

          const updatedCoupons = this.data.coupons.map(c =>
            c.id === couponId ? { ...c, user_has_received: 1 } : c
          );
          this.setData({ coupons: updatedCoupons });
        } else if (res.data.code === 'ALREADY_RECEIVED') {
          wx.showToast({ title: '您已领取过该优惠券', icon: 'none' });
          const updatedCoupons = this.data.coupons.map(c =>
            c.id === couponId ? { ...c, user_has_received: 1 } : c
          );
          this.setData({ coupons: updatedCoupons });
        } else {
          wx.showToast({ title: res.data.message || '领取失败', icon: 'none' });
        }
      },
      fail: (err) => {
        console.error('领取优惠券失败:', err);
        wx.showToast({ title: '网络错误', icon: 'none' });
      }
    });
  }
});
