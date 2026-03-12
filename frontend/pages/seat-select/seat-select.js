// pages/seat-select/seat-select.js
const app = getApp();

// 绘制虚线框（区域边框）
function drawDashedRect(ctx, x, y, w, h, dash = 6, gap = 4) {
  const drawDash = (x1, y1, x2, y2) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    const nx = dx / len;
    const ny = dy / len;
    let progress = 0;

    while (progress < len) {
      const seg = Math.min(dash, len - progress);
      const sx = x1 + nx * progress;
      const sy = y1 + ny * progress;
      const ex = x1 + nx * (progress + seg);
      const ey = y1 + ny * (progress + seg);

      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(ex, ey);
      ctx.stroke();

      progress += seg + gap;
    }
  };

  ctx.save();
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(0,0,0,0.2)";

  drawDash(x, y, x + w, y);
  drawDash(x + w, y, x + w, y + h);
  drawDash(x + w, y + h, x, y + h);
  drawDash(x, y + h, x, y);

  ctx.restore();
}

Page({
  data: {
    // Canvas
    ctx: null,
    canvasNode: null,
    dpr: 1,
    canvasWidth: 0,
    canvasHeight: 0,

    // 参数
    performance_id: null,
    schedule_id: null,

    // 数据
    areas: [],
    selectedSeats: [],
    totalPrice: "0.00",

    // 手势
    scale: 1,
    translateX: 0,
    translateY: 0,
    lastTouches: []
  },

  onLoad(options) {
    console.log("seat-select onLoad options:", options);

    const performance_id = options.performance_id;
    const schedule_id = options.schedule_id;

    if (!performance_id || !schedule_id) {
      wx.showToast({ title: "参数缺失", icon: "none" });
      wx.navigateBack();
      return;
    }

    this.setData({ performance_id, schedule_id });

    // 初始化 Canvas
    const query = wx.createSelectorQuery();
    query
      .select("#seatCanvas")
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res[0]) return;

        const canvas = res[0].node;
        const width = res[0].width;
        const height = res[0].height;

        const dpr = wx.getSystemInfoSync().pixelRatio;

        canvas.width = width * dpr;
        canvas.height = height * dpr;

        const ctx = canvas.getContext("2d");
        ctx.scale(dpr, dpr);

        this.setData(
          {
            ctx,
            canvasNode: canvas,
            dpr,
            canvasWidth: width,
            canvasHeight: height
          },
          () => {
            this.loadSeats();
          }
        );
      });
  },

  // ============================
  // 加载数据
  // ============================
  loadSeats() {
    wx.request({
      url: `http://localhost:3000/api/schedules/${this.data.schedule_id}/seats`,
      success: (res) => {
        console.log("loadSeats res:", res.data);

        if (res.data.status !== 0) {
          wx.showToast({ title: "加载失败", icon: "none" });
          return;
        }

        this.setData({ areas: res.data.data }, () => {
          this.drawSeats();
        });
      }
    });
  },

  // ============================
  // 绘制整个座位图
  // ============================
  drawSeats() {
    const {
      ctx,
      canvasWidth,
      canvasHeight,
      dpr,
      areas,
      scale,
      translateX,
      translateY,
      selectedSeats
    } = this.data;

    if (!ctx) return;

    ctx.clearRect(0, 0, canvasWidth * dpr, canvasHeight * dpr);

    ctx.save();

    ctx.translate(translateX, translateY);
    ctx.scale(scale, scale);

    // 绘制舞台
    const stageW = canvasWidth * 0.7;
    const stageX = (canvasWidth - stageW) / 2;
    const stageY = 20;

    ctx.fillStyle = "#202020";
    ctx.fillRect(stageX, stageY, stageW, 30);

    ctx.fillStyle = "#fff";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("舞台 / STAGE", stageX + stageW / 2, stageY + 20);

    // 绘制区域
    areas.forEach((area, idx) => {
      const {
        area_id,
        area_name,
        position_x,
        position_y,
        width,
        height,
        seats
      } = area;

      // 渐变背景
      const baseHue = (idx * 60) % 360;
      const grad = ctx.createLinearGradient(
        position_x,
        position_y,
        position_x + width,
        position_y + height
      );
      grad.addColorStop(0, `hsla(${baseHue},70%,85%,0.45)`);
      grad.addColorStop(1, `hsla(${(baseHue + 20) % 360},70%,90%,0.45)`);

      ctx.fillStyle = grad;
      ctx.fillRect(position_x, position_y, width, height);

      ctx.strokeStyle = "rgba(0,0,0,0.15)";
      drawDashedRect(
        ctx,
        position_x,
        position_y,
        width,
        height
      );

      // 绘制座位
      seats.forEach((seat) => {
        const isSelected = selectedSeats.some((s) => s.id === seat.id);

        let fill = seat.status === "sold" ? "#bdbdbd" : "#ff4081";
        if (isSelected) fill = "#00c853";

        ctx.beginPath();
        ctx.arc(seat.position_x, seat.position_y, 12, 0, Math.PI * 2);
        ctx.fillStyle = fill;
        ctx.fill();

        ctx.lineWidth = isSelected ? 3 : 1;
        ctx.strokeStyle = isSelected ? "#00695c" : "#444";
        ctx.stroke();
      });

      // 区域标签
      ctx.fillStyle = "#333";
      ctx.font = "bold 16px sans-serif";
      ctx.fillText(
        area_name,
        position_x + width / 2,
        position_y + 25
      );
    });

    ctx.restore();
  },

  // ============================
  // 触摸操作
  // ============================
  onTouchStart(e) {
    this.setData({ lastTouches: e.touches });
  },

  onTouchMove(e) {
    const touches = e.touches;
    const last = this.data.lastTouches;

    if (touches.length === 1 && last.length === 1) {
      // 拖拽
      const dx = touches[0].x - last[0].x;
      const dy = touches[0].y - last[0].y;

      this.setData(
        {
          translateX: this.data.translateX + dx,
          translateY: this.data.translateY + dy,
          lastTouches: touches
        },
        () => this.drawSeats()
      );

      return;
    }

    // 双指缩放
    if (touches.length === 2 && last.length === 2) {
      const dist = Math.hypot(
        touches[0].x - touches[1].x,
        touches[0].y - touches[1].y
      );
      const lastDist = Math.hypot(
        last[0].x - last[1].x,
        last[0].y - last[1].y
      );

      let newScale = this.data.scale * (dist / lastDist);
      newScale = Math.max(0.6, Math.min(newScale, 2.5));

      this.setData({ scale: newScale, lastTouches: touches }, () =>
        this.drawSeats()
      );
    }
  },

  onTouchEnd() {
    this.setData({ lastTouches: [] });
  },

  // ============================
  // 点击选座
  // ============================
  onCanvasTap(e) {
    const { x, y } = e.detail;
    const { translateX, translateY, scale, areas, selectedSeats } = this.data;
  
    const tx = (x - translateX) / scale;
    const ty = (y - translateY) / scale;
  
    for (const area of areas) {
      const areaName = area.area_name;   // ⭐ 明确使用数据库返回值
  
      for (const seat of (area.seats || [])) {
        const sx = seat.position_x;
        const sy = seat.position_y;
        const r = 12;
  
        if (Math.hypot(tx - sx, ty - sy) <= r && seat.status !== 'sold') {
  
          const exists = selectedSeats.some(s => s.id === seat.id);
          let newSelected = [];
  
          if (exists) {
            // 取消选中
            newSelected = selectedSeats.filter(s => s.id !== seat.id);
          } else {
            // 新增选中 — ⭐ 把 area_name 放进去
            newSelected = [
              ...selectedSeats,
              {
                ...seat,
                area_name: areaName   // ⭐ 关键修复
              }
            ];
  
            if (newSelected.length > 3) {
              wx.showToast({ title: "最多可选 3 个座位", icon: "none" });
              return;
            }
          }
  
          const total = newSelected.reduce((sum, s) => sum + s.price, 0);
  
          this.setData({
            selectedSeats: newSelected,
            totalPrice: total.toFixed(2)
          }, () => this.drawSeats());
  
          return;
        }
      }
    }
  },  

  // ============================
  // 确认选座
  // ============================
  onConfirm() {
    if (this.data.selectedSeats.length === 0) {
      wx.showToast({ title: "请选择座位", icon: "none" });
      return;
    }

    const data = {
      schedule_id: this.data.schedule_id,
      performance_id: this.data.performance_id,
      selectedSeats: this.data.selectedSeats
    };

    wx.navigateTo({
      url:
        "/pages/order-confirm/order-confirm?data=" +
        encodeURIComponent(JSON.stringify(data))
    });
  }
});
