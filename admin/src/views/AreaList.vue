<template>
  <div class="page">
    <h2>区域管理</h2>

    <!-- 场馆选择 -->
    <div class="toolbar" >
      <select v-model="venueId" @change="loadAreas">
        <option value="">请选择场馆</option>
        <option
          v-for="v in venues"
          :key="v.id"
          :value="v.id"
        >
          {{ v.name }}
        </option>
      </select>

      <button class="add-btn" @click="addArea">＋ 新增区域</button>
    </div>

    <!-- 区域表格 -->
    <table class="table">
      <thead>
        <tr>
          <th>ID</th>
          <th>区域名称</th>
          <th>位置</th>
          <th>宽 × 高</th>
          <th>所属场馆</th>
          <th>操作</th>
        </tr>
      </thead>

      <tbody>
        <tr v-for="item in list" :key="item.id">
          <td>{{ item.id }}</td>
          <td>{{ item.name }}</td>

          <td>
            X: {{ item.position_x }}  
            <br />
            Y: {{ item.position_y }}
          </td>

          <td>{{ item.width }} × {{ item.height }}</td>

          <td>{{ item.venue_name }}</td>

          <td>
            <button @click="editArea(item.id)">编辑</button>
            <button @click="manageSeats(item.id)">座位管理</button>
            <button class="del-btn" @click="delArea(item.id)">删除</button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();

// 下拉场馆列表
const venues = ref([]);
const venueId = ref("");

// 区域数据
const list = ref([]);

onMounted(() => {
  loadVenues();
});

// 加载所有场馆
async function loadVenues() {
  const res = await fetch("http://localhost:3000/admin/venues");
  const data = await res.json();
  venues.value = data.data || [];
}

// 加载某场馆的区域
async function loadAreas() {
  if (!venueId.value) {
    list.value = [];
    return;
  }

  const res = await fetch(`http://localhost:3000/admin/areas/venue/${venueId.value}`);
  const data = await res.json();
  list.value = data.data || [];
}

// 新增区域
function addArea() {
  if (!venueId.value) {
    alert("请先选择场馆！");
    return;
  }
  router.push(`/areas/edit/new?venue_id=${venueId.value}`);
}

// 编辑区域（可视化编辑）
function editArea(id) {
  router.push(`/areas/edit/${id}`);
}

// 跳转到座位管理页面
function manageSeats(id) {
  router.push(`/areas/${id}/seats`);
}

// 删除区域
async function delArea(id) {
  if (!confirm("确定删除该区域？（删除后座位也会全部删除）")) return;

  await fetch(`http://localhost:3000/admin/areas/${id}`, {
    method: "DELETE",
  });

  loadAreas();
}
</script>

<style scoped>
.page {
  padding: 20px;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 2px;
}
.toolbar select {
  height: 36px;
  padding: 0 14px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  font-size: 14px;
}

.table {
  width: 100%;
  background: white;
  border-collapse: collapse;
}

.table th,
.table td {
  padding: 10px;
  border-bottom: 1px solid #eee;
  text-align: center;
}

.add-btn {
  background: #67c23a;
  color: white;
  padding: 8px 14px;
  border-radius: 4px;
  margin-bottom: 20px;
}

.del-btn {
  background: #f56c6c;
  color: white;
}
</style>
