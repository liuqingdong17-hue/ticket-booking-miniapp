// const app = getApp()

// Page({
//   data: {
//     performance_id: null,
//     schedules: [],
//     selectedScheduleId: null,
//     selectable_seats: 0  // ⭐ 是否可选座
//   },

//   onLoad(options) {
//     const { performance_id } = options
//     if (!performance_id) {
//       wx.showToast({ title: '演出ID缺失', icon: 'none' });
//       wx.navigateBack();
//       return;
//     }

//     this.setData({ performance_id })

//     this.getPerformanceSelectable()    // ⭐ 先查是否可选座
//     this.getSchedules()
//   },

//   // ⭐ 查询演出是否可选座
//   getPerformanceSelectable() {
//     wx.request({
//       url: `http://localhost:3000/api/performance-details/detail/${this.data.performance_id}`,
//       method: 'GET',
//       success: (res) => {
//         if (res.data.status === 0) {
//           this.setData({
//             selectable_seats: res.data.data.selectable_seats
//           })
//         }
//       }
//     })
//   },

//   // 获取场次列表
//   getSchedules() {
//     wx.request({
//       url: `http://localhost:3000/api/schedules/${this.data.performance_id}`,
//       method: 'GET',
//       success: (res) => {
//         if (res.data.status === 0) {
//           this.setData({ schedules: res.data.data })
//         }
//       }
//     })
//   },

//   onSelectSchedule(e) {
//     const { id } = e.currentTarget.dataset
//     this.setData({ selectedScheduleId: id })
//   },

//   onConfirm() {
//     const { selectedScheduleId, performance_id, selectable_seats } = this.data
//     if (!selectedScheduleId) {
//       wx.showToast({ title: '请选择一个场次', icon: 'none' })
//       return
//     }
  
//     if (selectable_seats == 1) {
//       // ⭐ 可选座 → 跳转选座页 seat-select
//       wx.navigateTo({
//         url: `/pages/seat-select/seat-select?performance_id=${performance_id}&schedule_id=${selectedScheduleId}`
//       })
//     } else {
//       // ⭐ 不可选座 → 跳转票类型页 ticket-types
//       wx.navigateTo({
//         url: `/pages/ticket-types/ticket-types?performance_id=${performance_id}&schedule_id=${selectedScheduleId}`
//       })
//     }  
//   }
// })

// pages/select-schedule/select-schedule.js
const app = getApp()

Page({
  data: {
    performance_id: null,
    schedules: [],
    selectedScheduleId: null,
    selectable_seats: 0 // ⭐ 是否可选座
  },

  onLoad(options) {
    const { performance_id } = options
    if (!performance_id) {
      wx.showToast({ title: '演出ID缺失', icon: 'none' })
      wx.navigateBack()
      return
    }

    this.setData({ performance_id })

    this.getPerformanceSelectable() // ⭐ 先查是否可选座
    this.getSchedules()
  },

  // ⭐ 查询演出是否可选座
  getPerformanceSelectable() {
    wx.request({
      url: `http://localhost:3000/api/performance-details/detail/${this.data.performance_id}`,
      method: 'GET',
      success: (res) => {
        if (res.data.status === 0) {
          this.setData({
            selectable_seats: res.data.data.selectable_seats
          })
        }
      }
    })
  },

  // 获取场次列表
  getSchedules() {
    wx.request({
      url: `http://localhost:3000/api/schedules/${this.data.performance_id}`,
      method: 'GET',
      success: (res) => {
        if (res.data.status === 0) {
          const now = Date.now()

          // ✅ 给每条场次加 isPast：date + time 拼成完整时间判断
          const enhanced = (res.data.data || []).map(s => {
            const dtStr = `${s.date} ${s.time}` // "YYYY-MM-DD HH:mm"
            const ts = new Date(dtStr.replace(/-/g, '/')).getTime()
            return {
              ...s,
              isPast: !isNaN(ts) && ts < now,
              _ts: ts // 可选：调试用
            }
          })

          this.setData({ schedules: enhanced })

          // ✅ 如果之前选中的场次现在变成过期了，自动取消（避免点确定报错）
          const chosen = enhanced.find(x => x.id === this.data.selectedScheduleId)
          if (chosen && chosen.isPast) {
            this.setData({ selectedScheduleId: null })
          }
        }
      }
    })
  },

  onSelectSchedule(e) {
    const { id, disabled } = e.currentTarget.dataset

    // ✅ 禁点：已结束的场次不给选
    if (disabled) {
      wx.showToast({ title: '该场次已结束', icon: 'none' })
      return
    }

    this.setData({ selectedScheduleId: id })
  },

  onConfirm() {
    const { selectedScheduleId, performance_id, selectable_seats, schedules } = this.data
    if (!selectedScheduleId) {
      wx.showToast({ title: '请选择一个场次', icon: 'none' })
      return
    }

    // ✅ 二次保险：防止过期场次被选中
    const current = (schedules || []).find(x => x.id === selectedScheduleId)
    if (current && current.isPast) {
      wx.showToast({ title: '该场次已结束，请重新选择', icon: 'none' })
      this.setData({ selectedScheduleId: null })
      return
    }

    if (selectable_seats == 1) {
      wx.navigateTo({
        url: `/pages/seat-select/seat-select?performance_id=${performance_id}&schedule_id=${selectedScheduleId}`
      })
    } else {
      wx.navigateTo({
        url: `/pages/ticket-types/ticket-types?performance_id=${performance_id}&schedule_id=${selectedScheduleId}`
      })
    }
  }
})
