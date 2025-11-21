// pages/seat-select/seat-select.js
const app = getApp()

// ---------- 辅助函数：手动绘制虚线矩形 ----------
function drawDashedRect(ctx, x, y, w, h, dash = 6, gap = 4) {
  const drawDashLine = (x1, y1, x2, y2) => {
    const dx = x2 - x1
    const dy = y2 - y1
    const len = Math.hypot(dx, dy)
    const nx = dx / len
    const ny = dy / len
    let drawn = 0
    while (drawn < len) {
      const seg = Math.min(dash, len - drawn)
      const sx = x1 + nx * drawn
      const sy = y1 + ny * drawn
      const ex = x1 + nx * (drawn + seg)
      const ey = y1 + ny * (drawn + seg)
      ctx.beginPath()
      ctx.moveTo(sx, sy)
      ctx.lineTo(ex, ey)
      ctx.stroke()
      drawn += seg + gap
    }
  }

  const oldWidth = ctx.lineWidth
  const oldStyle = ctx.strokeStyle
  ctx.lineWidth = 1
  ctx.strokeStyle = ctx.strokeStyle || 'rgba(0,0,0,0.12)'

  // 四边
  drawDashLine(x, y, x + w, y)
  drawDashLine(x + w, y, x + w, y + h)
  drawDashLine(x + w, y + h, x, y + h)
  drawDashLine(x, y + h, x, y)

  ctx.lineWidth = oldWidth
  ctx.strokeStyle = oldStyle
}

Page({
  data: {
    ctx: null,
    canvasNode: null,
    dpr: 1,
    canvasWidth: 0,
    canvasHeight: 0,

    performance_id: null,  // 接收
    schedule_id: null,  // 接收

    areas: [],
    selectedSeats: [],
    totalPrice: '0.00',

    scale: 1,
    translateX: 0,
    translateY: 0,
    lastTouches: [],
    lastDistance: 0
  },

  // ---------- 页面加载 ----------
  onLoad(options) {
    console.log('seat-select onLoad options', options);  // 加日志调试
    // 解析来自上一个页面的参数
    let performance_id = options?.performance_id || null
    let schedule_id = options?.schedule_id || null

    if (options.data) {
      try {
        const parsed = JSON.parse(decodeURIComponent(options.data))
        performance_id = parsed.performance_id || performance_id
        schedule_id = parsed.schedule_id || schedule_id
      } catch (err) {
        console.warn('data 参数解析失败:', err)
      }
    }

    if (!performance_id || !schedule_id) {
      wx.showToast({ title: '场次参数缺失', icon: 'none' });
      wx.navigateBack();
      return;
    }

    this.setData({ performance_id, schedule_id })

    // 初始化 canvas
    const query = wx.createSelectorQuery()
    query.select('#seatCanvas').fields({ node: true, size: true }).exec((res) => {
      if (!res || !res[0]) {
        console.error('无法获取 canvas 节点')
        return
      }
      const canvas = res[0].node
      const { width, height } = res[0]
      const dpr = wx.getSystemInfoSync().pixelRatio || 1

      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)

      const ctx = canvas.getContext('2d')
      ctx.scale(dpr, dpr)

      this.setData({
        ctx,
        canvasNode: canvas,
        dpr,
        canvasWidth: width,
        canvasHeight: height
      }, () => {
        this.loadSeats()
      })
    })
  },

  // ---------- 加载座位 ----------
  loadSeats() {
    const scheduleId = this.data.schedule_id || 1
    console.log('loadSeats scheduleId', scheduleId);  // 加日志
    wx.request({
      url: `http://localhost:3000/api/schedules/${scheduleId}/seats`,
      method: 'GET',
      success: (res) => {
        console.log('loadSeats res', res.data);  // 加日志
        if (res.data && res.data.status === 0) {
          const areas = res.data.data || []
          this.setData({ areas }, () => this.drawSeats())
        } else {
          wx.showToast({ title: res.data?.message || '获取座位失败', icon: 'none' })
        }
      },
      fail: (err) => {
        console.error('loadSeats fail', err);  // 加日志
        wx.showToast({ title: '请求失败', icon: 'none' })
      }
    })
  },

  // ---------- 绘制座位 ----------
  drawSeats() {
    const { ctx, dpr, canvasWidth, canvasHeight, areas, scale, translateX, translateY, selectedSeats } = this.data
    if (!ctx) return

    ctx.clearRect(0, 0, canvasWidth * dpr, canvasHeight * dpr)
    ctx.save()
    ctx.translate(translateX, translateY)
    ctx.scale(scale, scale)

    // 舞台
    const stageW = Math.min(600, canvasWidth - 40)
    const stageX = (canvasWidth - stageW) / 2
    const stageY = 20
    ctx.fillStyle = '#222'
    ctx.fillRect(stageX, stageY, stageW, 28)
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 14px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('舞台 / STAGE', stageX + stageW / 2, stageY + 19)

    // 区域
    areas.forEach((area, i) => {
      const ax = area.position_x ?? area.x ?? 0
      const ay = area.position_y ?? area.y ?? 0
      const aw = area.width ?? 300
      const ah = area.height ?? 200

      // 背景
      const baseHue = (i * 50) % 360
      const grad = ctx.createLinearGradient(ax, ay, ax + aw, ay + ah)
      grad.addColorStop(0, `hsla(${baseHue},70%,80%,0.45)`)
      grad.addColorStop(1, `hsla(${(baseHue + 20) % 360},70%,85%,0.45)`)
      ctx.fillStyle = grad
      ctx.fillRect(ax, ay, aw, ah)

      // 边框
      ctx.strokeStyle = `rgba(0,0,0,0.15)`
      drawDashedRect(ctx, ax + 0.5, ay + 0.5, aw - 1, ah - 1, 6, 4)

      // 座位
      ;(area.seats || []).forEach(seat => {
        const sx = seat.x ?? seat.position_x ?? 0
        const sy = seat.y ?? seat.position_y ?? 0
        const radius = 10
        const isSelected = selectedSeats.some(s => s.id === seat.id)
        let fillColor = '#ff4d4f'
        if (seat.status === 'sold' || seat.status === 'sold_out') fillColor = '#ccc'
        if (isSelected) fillColor = '#00c853'

        ctx.beginPath()
        ctx.arc(sx, sy, radius, 0, Math.PI * 2)
        ctx.fillStyle = fillColor
        ctx.fill()

        ctx.lineWidth = isSelected ? 2.5 : 1
        ctx.strokeStyle = isSelected ? '#006b3c' : '#888'
        ctx.stroke()
      })
    })

    ctx.restore()
  },

  // ---------- 手势操作 ----------
  onTouchStart(e) {
    this.setData({ lastTouches: e.touches || [] })
  },
  onTouchMove(e) {
    const touches = e.touches || []
    const lastTouches = this.data.lastTouches || []

    if (touches.length === 1 && lastTouches.length === 1) {
      // 拖拽
      const dx = touches[0].x - lastTouches[0].x
      const dy = touches[0].y - lastTouches[0].y
      this.setData({
        translateX: this.data.translateX + dx,
        translateY: this.data.translateY + dy,
        lastTouches: touches
      }, () => this.drawSeats())
      return
    }

    // 缩放
    if (touches.length === 2 && lastTouches.length === 2) {
      const dist = Math.hypot(touches[0].x - touches[1].x, touches[0].y - touches[1].y)
      const lastDist = Math.hypot(lastTouches[0].x - lastTouches[1].x, lastTouches[0].y - lastTouches[1].y)
      if (lastDist > 0) {
        let newScale = this.data.scale * (dist / lastDist)
        newScale = Math.min(Math.max(newScale, 0.5), 2.5)
        this.setData({ scale: newScale, lastTouches: touches }, () => this.drawSeats())
      } else {
        this.setData({ lastTouches: touches })
      }
    }
  },
  onTouchEnd() {
    this.setData({ lastTouches: [], lastDistance: 0 })
  },

  // ---------- 选座 ----------
  onCanvasTap(e) {
    const { x, y } = e.detail
    const { translateX, translateY, scale, areas, selectedSeats } = this.data
    const tx = (x - translateX) / scale
    const ty = (y - translateY) / scale

    for (const area of areas) {
      const areaName = area.area_name || area.areaName || ''
      for (const seat of (area.seats || [])) {
        const sx = seat.x ?? seat.position_x ?? 0
        const sy = seat.y ?? seat.position_y ?? 0
        const r = 12
        const dist = Math.hypot(tx - sx, ty - sy)
        if (dist <= r && (seat.status !== 'sold' && seat.status !== 'sold_out')) {
          const exists = selectedSeats.some(s => s.id === seat.id)
          let newSelected
          if (exists) {
            newSelected = selectedSeats.filter(s => s.id !== seat.id)
          } else {
            newSelected = [...selectedSeats, { ...seat, area_name: areaName }]
            if (newSelected.length > 3) {
              wx.showToast({ title: '最多可选 3 个座位', icon: 'none' })
              return
            }
          }
          const total = newSelected.reduce((sum, s) => sum + parseFloat(s.price || 0), 0)
          this.setData({
            selectedSeats: newSelected,
            totalPrice: total.toFixed(2)
          }, () => this.drawSeats())
          return
        }
      }
    }
  },

  // ---------- 确认选座 ----------
  onConfirm() {
    const { selectedSeats, performance_id, schedule_id } = this.data
    if (!selectedSeats.length) {
      wx.showToast({ title: '请选择座位', icon: 'none' })
      return
    }

    const dataToPass = { 
      performance_id,
      schedule_id,
      selectedSeats  // 数组
    }

    console.log('onConfirm: 传数据到订单页', dataToPass);  // 加日志

    wx.navigateTo({
      url: `/pages/order-confirm/order-confirm?data=${encodeURIComponent(JSON.stringify(dataToPass))}`  // 改页名 + data 参数
    })
  }  
})