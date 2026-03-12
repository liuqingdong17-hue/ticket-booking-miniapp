// pages/ticket-types/ticket-types.js
Page({
  data: {
    performance_id: null,
    schedule_id: null,

    performanceInfo: {},  // 演出信息
    scheduleInfo: {},     // 场次信息
    ticketTypes: [],      // 票档列表

    selectedTicketId: null,
    selectedPrice: 0,
    count: 1,
    totalPrice: 0,

    tapAnim: false
  },

  onLoad(options) {
    this.setData({
      performance_id: options.performance_id,
      schedule_id: options.schedule_id
    });

    // 加载必需的数据
    this.loadPerformanceInfo();
    this.loadScheduleInfo();
    this.loadTickets();
  },

  // ⭐ 获取演出信息
  loadPerformanceInfo() {
    wx.request({
      url: `http://localhost:3000/api/performance-details/detail/${this.data.performance_id}`,
      success: res => {
        if (res.data.status === 0) {
          this.setData({ performanceInfo: res.data.data });
        } else {
          wx.showToast({ title: "演出信息加载失败", icon: "none" });
        }
      },
      fail: () => wx.showToast({ title: "网络错误", icon: "none" })
    });
  },

  // ⭐ 获取场次信息
  loadScheduleInfo() {
    wx.request({
      url: `http://localhost:3000/api/schedules/detail/${this.data.schedule_id}`,
      success: res => {
        if (res.data.status === 0) {
          this.setData({ scheduleInfo: res.data.data });
        } else {
          wx.showToast({ title: "场次信息加载失败", icon: "none" });
        }
      },
      fail: () => wx.showToast({ title: "网络错误", icon: "none" })
    });
  },

  // ⭐ 获取票档列表
  loadTickets() {
    wx.request({
      url: `http://localhost:3000/api/tickets/${this.data.schedule_id}`,
      success: res => {
        if (res.data.status === 0) {
          this.setData({ ticketTypes: res.data.data });
        } else {
          wx.showToast({ title: "票档加载失败", icon: "none" });
        }
      },
      fail: () => wx.showToast({ title: "网络错误", icon: "none" })
    });
  },

  // ⭐ 取票档名称（跳转订单页时需要）
  getTicketName(id) {
    const t = this.data.ticketTypes.find(item => item.id == id);
    return t ? t.name : "";
  },

  // ⭐ 选择某票档
  onSelectTicket(e) {
    const id = e.currentTarget.dataset.id;
    const price = e.currentTarget.dataset.price;
    const stock = e.currentTarget.dataset.stock;

    if (stock == 0) return;

    this.setData({
      tapAnim: true,
      selectedTicketId: id,
      selectedPrice: price,
      totalPrice: price * this.data.count
    });

    setTimeout(() => {
      this.setData({ tapAnim: false });
    }, 150);
  },

  // ⭐ 数量增加
  incCount() {
    if (this.data.count >= 4) return;

    const newCount = this.data.count + 1;
    this.setData({
      count: newCount,
      totalPrice: this.data.selectedPrice * newCount
    });
  },

  // ⭐ 数量减少
  decCount() {
    if (this.data.count <= 1) return;

    const newCount = this.data.count - 1;
    this.setData({
      count: newCount,
      totalPrice: this.data.selectedPrice * newCount
    });
  },

  // ⭐ 确认选择 → 跳转订单确认页（不可选座模式）
  onConfirm() {
    if (!this.data.selectedTicketId) {
      wx.showToast({ title: "请选择票档", icon: "none" });
      return;
    }

    const ticketName = this.getTicketName(this.data.selectedTicketId);

    wx.navigateTo({
      url:
        `/pages/order-confirm/order-confirm` +
        `?performance_id=${this.data.performance_id}` +
        `&schedule_id=${this.data.schedule_id}` +
        `&ticket_id=${this.data.selectedTicketId}` +
        `&price=${this.data.selectedPrice}` +
        `&ticket_name=${encodeURIComponent(ticketName)}` +
        `&count=${this.data.count}`
    });
  }
});
