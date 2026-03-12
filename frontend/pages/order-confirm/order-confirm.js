Page({
  data: {
    mode: "seat",  // seat = 可选座模式, ticket = 不可选座模式

    performance: {},
    schedule: {},

    // 可选座模式
    selectedSeats: [],   // seat list

    // 不可选座模式
    ticketType: null,    // 单个票档信息
    ticketCount: 1,

    // 公共
    selectedViewer: null,
    contactPhone: "",
    totalPrice: "0.00",
    finalPrice: "0.00",
    selectedCoupon: null,
    discountCoupon: 0,
    loading: false,
    payMethod: "wechat"
  },

  onLoad(options) {
    console.log("订单确认页参数:", options);

    let performance_id, schedule_id;

    // -----------① 可选座模式-----------
    if (options.data) {
      try {
        const parsed = JSON.parse(decodeURIComponent(options.data));
        performance_id = parsed.performance_id;
        schedule_id = parsed.schedule_id;

        if (parsed.selectedSeats?.length > 0) {
          this.setData({
            mode: "seat",
            selectedSeats: parsed.selectedSeats
          });
        }
      } catch (e) {
        console.error("解析 seat 模式失败:", e);
      }
    }

    // -----------② 不可选座模式-----------
    if (!performance_id) performance_id = options.performance_id;
    if (!schedule_id) schedule_id = options.schedule_id;

    if (options.ticket_id) {
      this.setData({
        mode: "ticket",
        ticketType: {
          id: options.ticket_id,
          price: parseFloat(options.price),
          name: decodeURIComponent(options.ticket_name)   // ⭐ 修复中文乱码
        },
        ticketCount: parseInt(options.count) || 1
      });
    }

    if (!performance_id || !schedule_id) {
      wx.showToast({ title: "订单参数缺失", icon: "none" });
      wx.navigateBack();
      return;
    }

    this.loadOrderDetails(performance_id, schedule_id);
    this.loadUserPhone();
  },

  // ---------- 用户手机号 ----------
  loadUserPhone() {
    const token = wx.getStorageSync("token");
    if (!token) return;

    wx.request({
      url: "http://localhost:3000/api/user/info",
      header: { Authorization: `Bearer ${token}` },
      success: res => {
        if (res.data.status === 0 && res.data.data?.phone) {
          this.setData({ contactPhone: res.data.data.phone });
        }
      }
    });
  },

  // ---------- 加载演出 & 场次 ----------
  loadOrderDetails(performance_id, schedule_id) {
    this.setData({ loading: true });

    Promise.all([
      new Promise((resolve, reject) => {
        wx.request({
          url: `http://localhost:3000/api/performance-details/detail/${performance_id}`,
          success: resolve, fail: reject
        });
      }),
      new Promise((resolve, reject) => {
        wx.request({
          url: `http://localhost:3000/api/schedules/detail/${schedule_id}`,
          success: resolve, fail: reject
        });
      })
    ])
      .then(([perfRes, schedRes]) => {
        const performance = perfRes.data.data;
        const schedule = schedRes.data.data;

        let total = 0;

        if (this.data.mode === "seat") {
          total = this.data.selectedSeats.reduce(
            (sum, s) => sum + parseFloat(s.price),
            0
          );
        } else {
          total = parseFloat(this.data.ticketType.price) * this.data.ticketCount;
        }

        this.setData({
          performance,
          schedule,
          totalPrice: total.toFixed(2),
          finalPrice: total.toFixed(2),
          loading: false
        });
      })
      .catch(err => {
        console.error("加载失败:", err);
        wx.showToast({ title: "加载订单失败", icon: "none" });
        this.setData({ loading: false });
      });
  },

  // ---------- 手机号 ----------
  onInputPhone(e) {
    this.setData({ contactPhone: e.detail.value });
  },

  // ---------- 选择观演人 ----------
  onSelectViewer() {
    wx.navigateTo({
      url: "/pages/viewer-select/viewer-select",
      events: {
        selectViewer: viewer => this.setData({ selectedViewer: viewer })
      }
    });
  },
//支付方式
  onSelectPayWechat() {
    this.setData({ payMethod: "wechat" });
  },
  

  // ---------- 优惠券 ----------
  onSelectCoupon() {
    wx.navigateTo({
      url: "/pages/coupon-select/coupon-select",
      events: {
        selectCoupon: coupon => {
          const discount = this.calculateDiscount(coupon);
          this.setData({
            selectedCoupon: coupon,
            discountCoupon: discount
          });
          this.updateFinalPrice();
        }
      }
    });
  },

  calculateDiscount(coupon) {
    if (!coupon) return 0;
    const total = parseFloat(this.data.totalPrice);

    if (total < coupon.min_amount) return 0;

    if (coupon.discount_type === 1) {
      return Math.min(coupon.discount_value, total);
    } else if (coupon.discount_type === 2) {
      return total * (1 - coupon.discount_value);
    }
    return 0;
  },

  updateFinalPrice() {
    const total = parseFloat(this.data.totalPrice);
    const discount = parseFloat(this.data.discountCoupon);
    this.setData({ finalPrice: Math.max(0, total - discount).toFixed(2) });
  },

  // ---------- 提交 ----------
  onSubmit() {
    const { selectedViewer, contactPhone, selectedCoupon } = this.data;

    if (!selectedViewer)
      return wx.showToast({ title: "请选择观演人", icon: "none" });

    if (!/^1[3-9]\d{9}$/.test(contactPhone))
      return wx.showToast({ title: "手机号错误", icon: "none" });

    let seat_list = [];
    let ticket_list = [];

    if (this.data.mode === "seat") {
      seat_list = this.data.selectedSeats.map(s => ({
        seat_id: s.id,
        price: s.price
      }));
    } else {
      ticket_list = [
        {
          ticket_type_id: this.data.ticketType.id,
          count: this.data.ticketCount,
          price: this.data.ticketType.price
        }
      ];
    }

    const orderData = {
      performance_id: this.data.performance.id,
      schedule_id: this.data.schedule.id,
      contact_phone: contactPhone,
      viewers: [{
        name: selectedViewer.name,
        id_card: selectedViewer.id_card,
        phone: contactPhone   // ← 添加这一行！
      }],      
      coupon_id: selectedCoupon?.coupon_id || null,
      user_coupon_id: selectedCoupon?.user_coupon_id || null,
      seat_list,
      ticket_list
    };

    this.createOrder(orderData);
  },

  // ---------- 创建订单 ----------
createOrder(orderData) {
  this.setData({ loading: true });

  wx.request({
    url: "http://localhost:3000/api/order/create",
    method: "POST",
    header: { Authorization: `Bearer ${wx.getStorageSync("token")}` },
    data: orderData,
    success: res => {
      if (res.data.status === 0) {
        const order_id = res.data.data.order_id;

        // ✅ 创建成功后弹窗：立即支付 or 先不付
        wx.showModal({
          title: "确认支付",
          content: "是否立即支付该订单？",
          confirmText: "确认",
          cancelText: "取消",
          success: (modalRes) => {
            if (modalRes.confirm) {
              // 点击确认：走支付接口
              this.pay(order_id);
            } else {
              // 点击取消：保持 unpaid，去订单列表
              wx.redirectTo({
                url: `/pages/order-list/order-list`
              });
            }
          }
        });

      } else {
        wx.showToast({ title: res.data.message, icon: "none" });
      }
    },
    fail: () => wx.showToast({ title: "下单失败", icon: "none" }),
    complete: () => this.setData({ loading: false })
  });
},


  // ---------- 支付 ----------
  pay(order_id) {
    wx.request({
      url: "http://localhost:3000/api/order/pay",
      method: "POST",
      header: { Authorization: `Bearer ${wx.getStorageSync("token")}` },
      data: { 
        order_id,
        pay_method: this.data.payMethod
      },      
      success: res => {
        if (res.data.status === 0) {
          wx.redirectTo({
            url: `/pages/pay-success/pay-success?id=${order_id}`
          });
        } else {
          wx.showToast({ title: res.data.message, icon: "none" });
        }
      },
      complete: () => this.setData({ loading: false })
    });
  }
});
