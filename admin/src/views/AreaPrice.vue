<template>
  <div class="page">
    <h2>区域价格设置</h2>

    <div class="info">
      <p>场次 ID：{{ id }}</p>
      <p>演出名称：{{ performanceName }}</p>
      <p>场馆：{{ venueName }}</p>
    </div>

    <table class="table">
      <thead>
        <tr>
          <th>区域名称</th>
          <th>价格（元）</th>
        </tr>
      </thead>

      <tbody>
        <tr v-for="area in areaList" :key="area.area_id">
          <td>{{ area.area_name }}</td>
          <td>
            <input
              v-model="area.price"
              type="number"
              class="price-input"
            />
          </td>
        </tr>
      </tbody>
    </table>

    <button class="submit-btn" @click="save">保存价格</button>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";

const route = useRoute();
const router = useRouter();

const id = route.params.id;            // schedule_id
const areaList = ref([]);              // 区域价格表
const performanceName = ref("");
const venueName = ref("");

onMounted(() => {
  loadAreaPrices();
  loadBasicInfo();
});

/* =========================================================
   ① 加载区域价格
========================================================= */
async function loadAreaPrices() {
  const res = await fetch(
    `http://localhost:3000/admin/schedules/${id}/area-prices`
  );
  const data = await res.json();
  areaList.value = data.data;
}

/* =========================================================
   ② 加载演出名称 & 场馆名（显示用）
========================================================= */
async function loadBasicInfo() {
  const res = await fetch(`http://localhost:3000/admin/schedules/${id}`);
  const data = await res.json();
  const schedule = data.data;

  // 查演出
  const res2 = await fetch(
    `http://localhost:3000/admin/performances/${schedule.performance_id}`
  );
  const data2 = await res2.json();
  performanceName.value = data2.data.name;

  // 查场馆
  const res3 = await fetch("http://localhost:3000/admin/venues");
  const data3 = await res3.json();

  const venue = data3.data.find(v => v.id === data2.data.venue_id);
  venueName.value = venue?.name || "";
}

/* =========================================================
   ③ 保存价格
========================================================= */
async function save() {
  const body = {
    prices: areaList.value.map(a => ({
      area_id: a.area_id,
      price: Number(a.price)
    }))
  };

  await fetch(`http://localhost:3000/admin/schedules/${id}/area-prices`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  alert("保存成功！");
  router.back();
}
</script>

<style scoped>
.page {
  padding: 20px;
}

.info {
  margin-bottom: 20px;
  color: #555;
}

.table {
  width: 100%;
  background: white;
  border-collapse: collapse;
  margin-bottom: 20px;
}

.table th,
.table td {
  padding: 12px;
  border-bottom: 1px solid #eee;
  text-align: center;
}

.price-input {
  width: 120px;
  padding: 5px;
}

.submit-btn {
  background: #409eff;
  color: white;
  padding: 10px 20px;
  border-radius: 4px;
}
</style>
