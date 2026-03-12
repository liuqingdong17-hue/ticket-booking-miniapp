<template>
  <div class="page">
    <h2>{{ isNew ? "新增区域" : "编辑区域" }}</h2>

    <div class="container">
      <!-- 左侧表单 -->
      <div class="form">
        <label>区域名称</label>
        <input v-model="form.name" />

        <label>X 坐标</label>
        <input v-model.number="form.position_x" type="number" />

        <label>Y 坐标</label>
        <input v-model.number="form.position_y" type="number" />

        <label>宽度</label>
        <input v-model.number="form.width" type="number" />

        <label>高度</label>
        <input v-model.number="form.height" type="number" />

        <button class="save-btn" @click="save">保存</button>
      </div>

      <!-- 右侧可视化画布 -->
      <div class="canvas-wrap">
        <canvas
          id="areaCanvas"
          ref="canvasRef"
          width="800"
          height="500"
          @mousedown="startDrag"
          @mousemove="onDrag"
          @mouseup="endDrag"
        ></canvas>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, reactive, computed } from "vue";
import { useRoute, useRouter } from "vue-router";

const router = useRouter();
const route = useRoute();

const id = route.params.id;
const isNew = computed(() => id === "new");

// 新增时可能从 ?venue_id=1 进来
const queryVenueId = route.query.venue_id
  ? Number(route.query.venue_id)
  : null;

// 区域表单数据（字段名和数据库一一对应）
const form = reactive({
  id: null,
  name: "",
  venue_id: queryVenueId,
  position_x: 50,
  position_y: 50,
  width: 200,
  height: 220,
});

// 画布
const canvasRef = ref(null);
let ctx = null;

// 拖拽控制
let dragging = false;
let dragOffsetX = 0;
let dragOffsetY = 0;

// 场馆座位图
let seatMapImg = null;

/** 安全加载场馆座位图：失败也不会卡住 */
async function loadVenueSeatMap(venueId) {
  // 如果没有场馆 id，就只初始化空画布
  if (!venueId) {
    initCanvas();
    return;
  }

  try {
    const res = await fetch(`http://localhost:3000/admin/venues/${venueId}`);
    const data = await res.json();

    if (data.status !== 0 || !data.data || !data.data.seat_map_url) {
      // 没有配置座位图，直接空白画布
      initCanvas();
      return;
    }

    return new Promise((resolve) => {
      seatMapImg = new Image();
      seatMapImg.src = data.data.seat_map_url;

      seatMapImg.onload = () => {
        initCanvas();
        resolve();
      };

      seatMapImg.onerror = () => {
        // 图片加载失败也不要卡住
        seatMapImg = null;
        initCanvas();
        resolve();
      };
    });
  } catch (e) {
    console.error("加载场馆座位图失败：", e);
    initCanvas();
  }
}

/** 加载区域详情（编辑模式用） */
async function loadDetail() {
  const res = await fetch(`http://localhost:3000/admin/areas/${id}`);
  const data = await res.json();

  if (data.status !== 0 || !data.data) {
    alert(data.message || "区域不存在");
    return;
  }

  // 用数据库里的值覆盖 form
  Object.assign(form, data.data);
}

/** 初始化画布 */
function initCanvas() {
  const canvas = canvasRef.value;
  if (!canvas) return;
  ctx = canvas.getContext("2d");
  draw();
}

/** 绘制整个画布 */
function draw() {
  if (!ctx) return;

  ctx.clearRect(0, 0, 800, 500);

  // 有场馆图就先画底图
  if (seatMapImg) {
    ctx.drawImage(seatMapImg, 0, 0, 800, 500);
  } else {
    // 没有图片就画一个浅色背景，方便看到区域
    ctx.fillStyle = "#fafafa";
    ctx.fillRect(0, 0, 800, 500);
  }

  // 区域矩形
  ctx.strokeStyle = "#ff4d4f";
  ctx.lineWidth = 2;
  ctx.strokeRect(form.position_x, form.position_y, form.width, form.height);

  // 区域名称
  ctx.fillStyle = "#ff4d4f";
  ctx.font = "14px Arial";
  ctx.fillText(
    form.name || "未命名区域",
    form.position_x + 5,
    form.position_y - 5
  );
}

/** 鼠标按下：准备拖拽 */
function startDrag(e) {
  const x = e.offsetX;
  const y = e.offsetY;

  if (
    x >= form.position_x &&
    x <= form.position_x + form.width &&
    y >= form.position_y &&
    y <= form.position_y + form.height
  ) {
    dragging = true;
    dragOffsetX = x - form.position_x;
    dragOffsetY = y - form.position_y;
  }
}

/** 拖拽移动 */
function onDrag(e) {
  if (!dragging) return;

  form.position_x = e.offsetX - dragOffsetX;
  form.position_y = e.offsetY - dragOffsetY;

  draw();
}

/** 结束拖拽 */
function endDrag() {
  dragging = false;
}

/** 保存区域 */
async function save() {
  const url = isNew.value
    ? "http://localhost:3000/admin/areas"
    : `http://localhost:3000/admin/areas/${id}`;

  const method = isNew.value ? "POST" : "PUT";

  await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(form),
  });

  alert("保存成功！");
  // 你的路由里是 path: 'areas'，所以跳回 /areas
  router.push("/areas");
}

/** 挂载逻辑 */
onMounted(async () => {
  if (isNew.value) {
    // 新增：直接用 query 里的 venue_id 加载场馆图
    await loadVenueSeatMap(form.venue_id);
  } else {
    // 编辑：先查区域 -> 拿到 venue_id -> 再加载座位图
    await loadDetail();
    await loadVenueSeatMap(form.venue_id);
  }
});
</script>

<style scoped>
.page {
  padding: 20px;
}
.container {
  display: flex;
  gap: 20px;
}
.form {
  width: 260px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.canvas-wrap {
  border: 1px solid #ddd;
}
.save-btn {
  background: #409eff;
  padding: 10px;
  width: 120px;
  color: white;
  border: none;
  border-radius: 4px;
}
</style>
