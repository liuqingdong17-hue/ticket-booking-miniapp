<template>
  <div class="page">
    <h2>座位管理（区域：{{ areaName }}）</h2>

    <div class="top-bar">
      <button class="back-btn" @click="goBack">返回区域列表</button>
      <button class="add-btn" @click="openBatchPanel">＋ 批量生成座位</button>
    </div>

    <div class="container">
      <div class="canvas-group">
        <canvas
          ref="canvasRef"
          width="1000"
          height="600"
          @click="selectSeat"
        ></canvas>
      </div>

      <div class="editor" v-if="selectedSeat">
        <h3>编辑座位</h3>

        <label>行号</label>
        <input v-model.number="selectedSeat.row_no" type="number" />

        <label>座号</label>
        <input v-model.number="selectedSeat.seat_no" type="number" />

        <label>X 坐标</label>
        <input v-model.number="selectedSeat.position_x" type="number" />

        <label>Y 坐标</label>
        <input v-model.number="selectedSeat.position_y" type="number" />

        <button class="save-btn" @click="saveSeat">保存</button>
        <button class="del-btn" @click="deleteSeat">删除</button>
      </div>
    </div>

    <!-- 批量生成 -->
    <div v-if="batchVisible" class="batch-panel">
      <h3>批量生成座位</h3>

      <label>起始行号</label>
      <input v-model.number="batch.startRow" type="number" />

      <label>生成行数</label>
      <input v-model.number="batch.rows" type="number" />

      <label>每行座位数</label>
      <input v-model.number="batch.seatsPerRow" type="number" />

      <label>起点 X</label>
      <input v-model.number="batch.startX" type="number" />

      <label>起点 Y</label>
      <input v-model.number="batch.startY" type="number" />

      <label>横向间距</label>
      <input v-model.number="batch.gapX" type="number" />

      <label>纵向间距</label>
      <input v-model.number="batch.gapY" type="number" />

      <button class="save-btn" @click="batchCreate">生成</button>
      <button @click="batchVisible = false">关闭</button>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";

const route = useRoute();
const router = useRouter();
const area_id = route.params.id;

const areaName = ref("");
const seats = ref([]);
const selectedSeat = ref(null);

// 区域矩形
const areaRect = reactive({
  position_x: 80,
  position_y: 60,
  width: 250,
  height: 300,
});

// canvas
const canvasRef = ref(null);
let ctx = null;

onMounted(async () => {
  initCanvas();
  await loadArea();
  await loadSeats();
  draw();
});

// 加载区域
async function loadArea() {
  const res = await fetch(`http://localhost:3000/admin/areas/${area_id}`);
  const data = await res.json();

  areaName.value = data.data.name;

  areaRect.position_x = data.data.position_x;
  areaRect.position_y = data.data.position_y;
  areaRect.width = data.data.width;
  areaRect.height = data.data.height;
}

// 加载座位
async function loadSeats() {
  const res = await fetch(
    `http://localhost:3000/admin/seats/areas/${area_id}/seats`
  );
  const data = await res.json();
  seats.value = data.data || [];
  draw();
}

// 初始化 canvas
function initCanvas() {
  ctx = canvasRef.value.getContext("2d");
}

// 绘制总函数
function draw() {
  if (!ctx) return;
  ctx.clearRect(0, 0, 1000, 600);

  drawArea();
  drawSeats();
}

// 绘制区域矩形
function drawArea() {
  ctx.fillStyle = "rgba(100,150,255,0.08)";
  ctx.fillRect(
    areaRect.position_x,
    areaRect.position_y,
    areaRect.width,
    areaRect.height
  );

  ctx.strokeStyle = "#888";
  ctx.lineWidth = 2;
  ctx.strokeRect(
    areaRect.position_x,
    areaRect.position_y,
    areaRect.width,
    areaRect.height
  );

  ctx.fillStyle = "#000";
  ctx.font = "14px Arial";
  ctx.fillText(areaName.value, areaRect.position_x, areaRect.position_y - 5);
}

// ✅ 绘制座位（绝对坐标）
function drawSeats() {
  seats.value.forEach((seat) => {
    const realX = seat.position_x; // 使用绝对坐标
    const realY = seat.position_y;

    ctx.beginPath();
    ctx.arc(realX, realY, 8, 0, Math.PI * 2);

    ctx.fillStyle =
      selectedSeat.value?.id === seat.id ? "#00c853" : "#ff4081";
    ctx.fill();

    ctx.strokeStyle = "#fff";
    ctx.stroke();
  });
}

// ✅ 点击选座（绝对坐标）
function selectSeat(e) {
  const rect = canvasRef.value.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  for (const seat of seats.value) {
    const realX = seat.position_x;
    const realY = seat.position_y;

    if (Math.hypot(x - realX, y - realY) <= 10) {
      selectedSeat.value = { ...seat };
      draw();
      return;
    }
  }

  selectedSeat.value = null;
  draw();
}

// 保存
async function saveSeat() {
  await fetch(
    `http://localhost:3000/admin/seats/seats/${selectedSeat.value.id}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(selectedSeat.value),
    }
  );

  alert("保存成功！");
  selectedSeat.value = null;
  await loadSeats();
}

// 删除
async function deleteSeat() {
  if (!confirm("确定删除该座位？")) return;

  await fetch(
    `http://localhost:3000/admin/seats/seats/${selectedSeat.value.id}`,
    {
      method: "DELETE",
    }
  );

  alert("删除成功！");
  selectedSeat.value = null;
  await loadSeats();
}

// 批量生成
const batchVisible = ref(false);
const batch = reactive({
  startRow: 1,
  rows: 5,
  seatsPerRow: 10,
  startX: 20,
  startY: 20,
  gapX: 40,
  gapY: 40,
});

function openBatchPanel() {
  batchVisible.value = true;
}

async function batchCreate() {
  await fetch(
    `http://localhost:3000/admin/seats/areas/${area_id}/seats/batch-generate`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(batch),
    }
  );

  alert("生成成功！");
  batchVisible.value = false;
  await loadSeats();
}

function goBack() {
  router.push("/areas");
}
</script>

<style scoped>
.page {
  padding: 20px;
  min-height: 100vh;
  overflow-y: auto;
}

.top-bar {
  margin-bottom: 20px;
  display: flex;
  gap: 14px;
}

.canvas-group {
  border: 1px solid #ddd;
}

.container {
  display: flex;
  gap: 40px;
}

.editor {
  width: 240px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.batch-panel {
  position: fixed;
  right: 20px;
  top: 120px;
  width: 280px;
  padding: 20px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 6px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  gap: 10px;

  max-height: calc(100vh - 160px);
  overflow-y: auto;
}

.save-btn {
  background: #409eff;
  padding: 8px;
  color: #fff;
}

.del-btn {
  background: #e53935;
  padding: 8px;
  color: #fff;
}

.add-btn {
  background: #67c23a;
  padding: 8px 14px;
  color: #fff;
}
</style>
