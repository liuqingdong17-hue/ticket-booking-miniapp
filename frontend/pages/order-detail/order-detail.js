// // pages/order-detail/order-detail.js
// Page({
//   data: {
//     order: {}
//   },

//   onLoad(options) {
//     const orderId = options.id;
//     this.loadOrderDetail(orderId);
//   },

//   // 获取订单详情
//   loadOrderDetail(orderId) {
//     const token = wx.getStorageSync('token');
//     if (!token) {
//       wx.showToast({ title: '请先登录', icon: 'none' });
//       return;
//     }

//     wx.request({
//       url: `http://localhost:3000/api/order/detail/${orderId}`,
//       method: 'GET',
//       header: { Authorization: `Bearer ${token}` },
//       success: (res) => {
//         if (res.data.status === 0) {
//           let order = res.data.data;

//           // 追加退款字段（如果后端没有，会自动给默认值）
//           order.refundable = order.refundable || 0;
//           order.refund_status = order.refund_status || 'none';

//           // 格式化时间
//           order.schedule_time_fmt = this.formatDateTime(order.schedule_time);
//           order.created_at_fmt = this.formatDateTime(order.created_at);
//           order.now = Date.now(); 
//           order.schedule_timestamp = new Date(order.schedule_time).getTime();

//           // -------- 可选座 seat_list（接口已返回结构化） --------
//           if (order.seat_list && order.seat_list.length > 0) {
//             order.seat_list = order.seat_list.map(s => ({
//               text: `${s.area_name}区-${s.row_no}排${s.seat_no}座`
//             }));
//           } else {
//             order.seat_list = [];
//           }

//           // -------- 不可选座 ticket_list（结构化） --------
//           if (!order.ticket_list) order.ticket_list = [];

//           this.setData({ order });

//         } else {
//           wx.showToast({ title: res.data.message || '获取订单失败', icon: 'none' });
//         }
//       },
//       fail: () => wx.showToast({ title: '网络异常', icon: 'none' })
//     });
//   },

//   // 申请退款
// // 申请退款
// onApplyRefund() {
//   const { order } = this.data

//   wx.showModal({
//     title: '申请退款',
//     content: '请输入退款原因（可选）',
//     editable: true,                 // ✅ 关键：允许输入
//     placeholderText: '例如：行程冲突/临时有事/买错场次…',
//     confirmText: '提交申请',
//     success: (res) => {
//       if (!res.confirm) return

//       const reason = (res.content || '').trim() // ✅ 用户输入内容

//       wx.request({
//         url: 'http://localhost:3000/api/order/apply-refund',
//         method: 'POST',
//         header: { Authorization: `Bearer ${wx.getStorageSync('token')}` },
//         data: {
//           order_id: order.order_id,
//           reason
//         },
//         success: res2 => {
//           if (res2.data.status === 0) {
//             wx.showToast({ title: '已提交退款申请' })
//             this.loadOrderDetail(order.order_id)
//           } else {
//             wx.showToast({ title: res2.data.message, icon: 'none' })
//           }
//         }
//       })
//     }
//   })
// },
// // 继续支付（未支付订单）
// onContinuePay() {
//   const { order } = this.data;
//   if (!order.order_id) return;

//   wx.showModal({
//     title: '继续支付',
//     content: '确认继续支付该订单吗？',
//     confirmText: '确认',
//     cancelText: '取消',
//     success: (r) => {
//       if (!r.confirm) return;

//       wx.request({
//         url: "http://localhost:3000/api/order/pay",
//         method: "POST",
//         header: { Authorization: `Bearer ${wx.getStorageSync("token")}` },
//         data: { order_id: order.order_id, pay_method: "wechat" },
//         success: (res) => {
//           if (res.data.status === 0) {
//             wx.redirectTo({
//               url: `/pages/pay-success/pay-success?id=${order.order_id}`
//             });
//           } else {
//             wx.showToast({ title: res.data.message || "支付失败", icon: "none" });
//           }
//         }
//       });
//     }
//   });
// },

// // 取消订单（未支付订单）
// onCancelOrder() {
//   const { order } = this.data;
//   if (!order.order_id) return;

//   wx.showModal({
//     title: '取消订单',
//     content: '取消后座位/库存将释放，确认取消吗？',
//     confirmText: '确认取消',
//     cancelText: '返回',
//     success: (r) => {
//       if (!r.confirm) return;

//       wx.request({
//         url: "http://localhost:3000/api/order/cancel",
//         method: "POST",
//         header: { Authorization: `Bearer ${wx.getStorageSync("token")}` },
//         data: { order_id: order.order_id },
//         success: (res) => {
//           if (res.data.status === 0) {
//             wx.showToast({ title: "订单已取消", icon: "success" });
//             // ✅ 刷新详情（或你想直接回列表也行）
//             this.loadOrderDetail(order.order_id);
//           } else {
//             wx.showToast({ title: res.data.message || "取消失败", icon: "none" });
//           }
//         }
//       });
//     }
//   });
// },

//   // 时间格式化
//   formatDateTime(t) {
//     if (!t) return '';
//     const d = new Date(t);
//     const y = d.getFullYear();
//     const m = String(d.getMonth() + 1).padStart(2, '0');
//     const day = String(d.getDate()).padStart(2, '0');
//     const hh = String(d.getHours()).padStart(2, '0');
//     const mm = String(d.getMinutes()).padStart(2, '0');
//     return `${y}.${m}.${day} ${hh}:${mm}`;
//   }
// });
// pages/order-detail/order-detail.js
Page({
  data: {
    order: {}
  },

  onLoad(options) {
    const orderId = options.id;
    this.loadOrderDetail(orderId);
  },

  // ✅ 页面卸载/隐藏：清理定时器（防止后台一直跑）
  onUnload() {
    if (this._timer) clearInterval(this._timer);
    this._timer = null;
  },
  onHide() {
    if (this._timer) clearInterval(this._timer);
    this._timer = null;
  },

  // 获取订单详情
  loadOrderDetail(orderId) {
    const token = wx.getStorageSync('token');
    if (!token) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }

    wx.request({
      url: `http://localhost:3000/api/order/detail/${orderId}`,
      method: 'GET',
      header: { Authorization: `Bearer ${token}` },
      success: (res) => {
        if (res.data.status === 0) {
          let order = res.data.data;

          // 追加退款字段（如果后端没有，会自动给默认值）
          order.refundable = order.refundable || 0;
          order.refund_status = order.refund_status || 'none';

          // 格式化时间
          order.schedule_time_fmt = this.formatDateTime(order.schedule_time);
          order.created_at_fmt = this.formatDateTime(order.created_at);
          order.now = Date.now();
          order.schedule_timestamp = new Date(order.schedule_time).getTime();

          // -------- 可选座 seat_list（接口已返回结构化） --------
          if (order.seat_list && order.seat_list.length > 0) {
            order.seat_list = order.seat_list.map(s => ({
              text: `${s.area_name}区-${s.row_no}排${s.seat_no}座`
            }));
          } else {
            order.seat_list = [];
          }

          // -------- 不可选座 ticket_list（结构化） --------
          if (!order.ticket_list) order.ticket_list = [];

          // ✅ 先把 order 放进 data
          this.setData({ order }, () => {
            // ✅ 未支付订单：启动倒计时（需要后端返回 expire_at）
            if (order.status === 'unpaid' && order.expire_at) {
              const expireTs = new Date(order.expire_at).getTime();
              this.startCountdown(expireTs, order.order_id);
            } else {
              // 其他状态：确保停止倒计时，防止残留
              if (this._timer) clearInterval(this._timer);
              this._timer = null;
            }
          });

        } else {
          wx.showToast({ title: res.data.message || '获取订单失败', icon: 'none' });
        }
      },
      fail: () => wx.showToast({ title: '网络异常', icon: 'none' })
    });
  },

  // ✅ 倒计时：每秒更新 order.leftSeconds / order.leftText
  startCountdown(expireTs, orderId) {
    if (this._timer) clearInterval(this._timer);

    const tick = () => {
      const left = Math.max(0, Math.floor((expireTs - Date.now()) / 1000));
      this.setData({
        'order.leftSeconds': left,
        'order.leftText': this.formatLeft(left)
      });

      // 到期：停止 + 刷新（后端会自动取消订单并释放 locked）
      if (left <= 0) {
        clearInterval(this._timer);
        this._timer = null;

        wx.showToast({ title: '订单已超时', icon: 'none' });
        this.loadOrderDetail(orderId);
      }
    };

    tick();
    this._timer = setInterval(tick, 1000);
  },

  // ✅ 秒数转 mm:ss
  formatLeft(sec) {
    const m = String(Math.floor(sec / 60)).padStart(2, '0');
    const s = String(sec % 60).padStart(2, '0');
    return `${m}:${s}`;
  },

  // 申请退款
  onApplyRefund() {
    const { order } = this.data

    wx.showModal({
      title: '申请退款',
      content: '请输入退款原因（可选）',
      editable: true,
      placeholderText: '例如：行程冲突/临时有事/买错场次…',
      confirmText: '提交申请',
      success: (res) => {
        if (!res.confirm) return

        const reason = (res.content || '').trim()

        wx.request({
          url: 'http://localhost:3000/api/order/apply-refund',
          method: 'POST',
          header: { Authorization: `Bearer ${wx.getStorageSync('token')}` },
          data: {
            order_id: order.order_id,
            reason
          },
          success: res2 => {
            if (res2.data.status === 0) {
              wx.showToast({ title: '已提交退款申请' })
              this.loadOrderDetail(order.order_id)
            } else {
              wx.showToast({ title: res2.data.message, icon: 'none' })
            }
          }
        })
      }
    })
  },

  // 继续支付（未支付订单）
  onContinuePay() {
    const { order } = this.data;
    if (!order.order_id) return;

    wx.showModal({
      title: '继续支付',
      content: '确认继续支付该订单吗？',
      confirmText: '确认',
      cancelText: '取消',
      success: (r) => {
        if (!r.confirm) return;

        wx.request({
          url: "http://localhost:3000/api/order/pay",
          method: "POST",
          header: { Authorization: `Bearer ${wx.getStorageSync("token")}` },
          data: { order_id: order.order_id, pay_method: "wechat" },
          success: (res) => {
            if (res.data.status === 0) {
              wx.redirectTo({
                url: `/pages/pay-success/pay-success?id=${order.order_id}`
              });
            } else {
              wx.showToast({ title: res.data.message || "支付失败", icon: "none" });
            }
          }
        });
      }
    });
  },

  // 取消订单（未支付订单）
  onCancelOrder() {
    const { order } = this.data;
    if (!order.order_id) return;

    wx.showModal({
      title: '取消订单',
      content: '取消后座位/库存将释放，确认取消吗？',
      confirmText: '确认取消',
      cancelText: '返回',
      success: (r) => {
        if (!r.confirm) return;

        wx.request({
          url: "http://localhost:3000/api/order/cancel",
          method: "POST",
          header: { Authorization: `Bearer ${wx.getStorageSync("token")}` },
          data: { order_id: order.order_id },
          success: (res) => {
            if (res.data.status === 0) {
              wx.showToast({ title: "订单已取消", icon: "success" });
              this.loadOrderDetail(order.order_id);
            } else {
              wx.showToast({ title: res.data.message || "取消失败", icon: "none" });
            }
          }
        });
      }
    });
  },

  // 时间格式化
  formatDateTime(t) {
    if (!t) return '';
    const d = new Date(t);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${y}.${m}.${day} ${hh}:${mm}`;
  }
});
