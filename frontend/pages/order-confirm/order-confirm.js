// pages/order-confirm/order-confirm.js
Page({
  data: {
    performance: {},       // 演出信息
    schedule: {},          // 场次信息
    selectedSeats: [],     // 已选座位
    ticketType: {},        // 当前票档信息
    selectedViewer: null,  // 已选观演人
    contactPhone: '',      // 联系手机号
    totalPrice: '0.00',    // 总价
    finalPrice: '0.00',    // 实付价
    selectedCoupon: null,  // 当前选择优惠券
    discountCoupon: 0,     // 优惠金额
    loading: false         // 加载/提交状态
  },  onLoad(options) {
    console.log('订单确认页参数:', options);let performance_id, schedule_id, selectedSeats = [];

if (options.data) {
  try {
    const parsed = JSON.parse(decodeURIComponent(options.data));
    performance_id = parsed.performance_id;
    schedule_id = parsed.schedule_id;
    selectedSeats = parsed.selectedSeats || [];
  } catch (e) {
    console.error('参数解析失败:', e);
  }
}

if (!performance_id || !schedule_id || selectedSeats.length === 0) {
  wx.showToast({ title: '订单参数缺失', icon: 'none' });
  wx.navigateBack();
  return;
}

this.setData({ selectedSeats });
this.loadOrderDetails(performance_id, schedule_id);
this.loadUserPhone();  },  //  自动获取用户手机号
  loadUserPhone() {
    const token = wx.getStorageSync('token');
    if (!token) return;wx.request({
  url: 'http://localhost:3000/api/user/info',
  header: { Authorization: `Bearer ${token}` },
  success: (res) => {
    if (res.data.status === 0 && res.data.data?.phone) {
      this.setData({ contactPhone: res.data.data.phone });
    }
  }
});  },  //  加载演出与场次信息
  loadOrderDetails(performance_id, schedule_id) {
    this.setData({ loading: true });const perfPromise = new Promise((resolve, reject) => {
  wx.request({
    url: `http://localhost:3000/api/performance-details/detail/${performance_id}`,
    success: resolve, fail: reject
  });
});

const schedPromise = new Promise((resolve, reject) => {
  wx.request({
    url: `http://localhost:3000/api/schedules/detail/${schedule_id}`,
    success: resolve, fail: reject
  });
});

Promise.all([perfPromise, schedPromise])
  .then(([perfRes, schedRes]) => {
    const performance = perfRes.data.data;
    const schedule = schedRes.data.data;

    //  使用 selectedSeats 中的真实价格来计算总价
    const total = this.data.selectedSeats.reduce((sum, seat) => sum + parseFloat(seat.price || 0), 0);

    this.setData({
      performance,
      schedule,
      totalPrice: total.toFixed(2),
      finalPrice: total.toFixed(2),
      loading: false
    });
  })
  .catch((err) => {
    console.error('加载订单信息失败:', err);
    wx.showToast({ title: '加载订单信息失败', icon: 'none' });
    this.setData({ loading: false });
  });  },  //  手机号输入
  onInputPhone(e) {
    this.setData({ contactPhone: e.detail.value });
  },  //  选择观演人
  onSelectViewer() {
    wx.navigateTo({
      url: '/pages/viewer-select/viewer-select',
      events: {
        selectViewer: (viewer) => this.setData({ selectedViewer: viewer })
      }
    });
  },  //  选择优惠券
  onSelectCoupon() {
    wx.navigateTo({
      url: '/pages/coupon-select/coupon-select',
      events: {
        selectCoupon: (coupon) => {
          console.log('选中优惠券:', coupon);
          const discount = this.calculateDiscount(coupon);
          this.setData({
            selectedCoupon: coupon,
            discountCoupon: discount
          });
          this.updateFinalPrice();
        }
      }
    });
  },  //  计算优惠金额
  calculateDiscount(coupon) {
    if (!coupon) return 0;
    const total = parseFloat(this.data.totalPrice);if (total < coupon.min_amount) {
  wx.showToast({ title: `满${coupon.min_amount}元可用`, icon: 'none' });
  return 0;
}

if (coupon.discount_type === 1) {
  // 现金券
  return Math.min(coupon.discount_value, total);
} else if (coupon.discount_type === 2) {
  // 折扣券（如 9 折）
  return total * (1 - coupon.discount_value);
}
return 0;  },  //  更新应付金额
  updateFinalPrice() {
    const total = parseFloat(this.data.totalPrice);
    const discount = parseFloat(this.data.discountCoupon);
    const final = Math.max(0, total - discount);
    this.setData({ finalPrice: final.toFixed(2) });
  },  //  提交订单
  onSubmit() {
    const { selectedViewer, selectedSeats, performance, schedule, contactPhone, selectedCoupon } = this.data;if (!selectedViewer) return wx.showToast({ title: '请选择观演人', icon: 'none' });
if (!/^1[3-9]\d{9}$/.test(contactPhone)) return wx.showToast({ title: '手机号格式错误', icon: 'none' });

//  从 selectedSeats 中取每个座位对应票档与价格
const seatList = selectedSeats.map(item => ({
  seat_id: item.id,
  price: parseFloat(item.price || 0)
}));
const orderData = {
  performance_id: performance.id,
  schedule_id: schedule.id,
  coupon_id: selectedCoupon ? selectedCoupon.coupon_id : null,          // 优惠券模板ID
  user_coupon_id: selectedCoupon ? selectedCoupon.user_coupon_id : null, // 用户领取ID
  viewers: [selectedViewer],
  seat_list: seatList,
  contact_phone: contactPhone
};

console.log('onSubmit 订单数据:', orderData); //  调试日志

this.setData({ loading: true });

wx.request({
  url: 'http://localhost:3000/api/order/create',
  method: 'POST',
  header: { Authorization: `Bearer ${wx.getStorageSync('token')}` },
  data: orderData,
  success: (res) => {
    if (res.data.status === 0) {
      const order_id = res.data.data.order_id;

      //  下单成功后发起支付
      wx.request({
        url: 'http://localhost:3000/api/order/pay',
        method: 'POST',
        header: { Authorization: `Bearer ${wx.getStorageSync('token')}` },
        data: { order_id },
        success: (payRes) => {
          if (payRes.data.status === 0) {
            wx.showToast({ title: '支付成功', icon: 'success' });
            setTimeout(() => {
              wx.redirectTo({ url: `/pages/pay-success/pay-success?id=${order_id}` });
            }, 1500);
          } else {
            wx.showToast({ title: payRes.data.message || '支付失败', icon: 'none' });
          }
        },
        complete: () => this.setData({ loading: false })
      });
    } else {
      wx.showToast({ title: res.data.message || '下单失败', icon: 'none' });
      this.setData({ loading: false });
    }
  },
  fail: () => {
    wx.showToast({ title: '网络异常', icon: 'none' });
    this.setData({ loading: false });
  }
});  }
}); 

