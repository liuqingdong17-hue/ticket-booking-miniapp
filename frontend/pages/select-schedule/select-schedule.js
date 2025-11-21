// pages/select-schedule/select-schedule.js
const app = getApp()

Page({
  data: {
    performance_id: null,
    schedules: [],
    selectedScheduleId: null
  },

  onLoad(options) {
    const { performance_id } = options
    if (!performance_id) {
      wx.showToast({ title: '演出ID缺失', icon: 'none' });
      wx.navigateBack();
      return;
    }
    this.setData({ performance_id })
    this.getSchedules()
  },

  // 获取场次数据
  getSchedules() {
    wx.request({
      url: `http://localhost:3000/api/schedules/${this.data.performance_id}`,
      method: 'GET',
      success: (res) => {
        console.log('getSchedules res', res.data);  // 加日志调试
        if (res.data.status === 0) {
          this.setData({ schedules: res.data.data })
        } else {
          wx.showToast({ title: res.data.message || '获取场次失败', icon: 'none' })
        }
      },
      fail: (err) => {
        console.error('getSchedules fail', err);  // 加日志
        wx.showToast({ title: '请求失败', icon: 'none' })
      }
    })
  },

  // 点击选中某个场次
  onSelectSchedule(e) {
    const { id } = e.currentTarget.dataset
    this.setData({ selectedScheduleId: id })
  },

  // 点击“确定”按钮，传 performance_id + schedule_id 到座位选择页
  onConfirm() {
    const { selectedScheduleId, performance_id } = this.data
    if (!selectedScheduleId) {
      wx.showToast({ title: '请选择一个场次', icon: 'none' })
      return
    }

    wx.navigateTo({
      url: `/pages/seat-select/seat-select?performance_id=${performance_id}&schedule_id=${selectedScheduleId}`  // 加 performance_id
    })
  }
})