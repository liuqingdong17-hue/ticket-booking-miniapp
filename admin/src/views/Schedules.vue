<template>
  <div class="page">
    <h2>场次管理</h2>

    <div class="toolbar">
      <input v-model="keyword" placeholder="搜索演出名称…" class="search-input" />
      <button @click="search">搜索</button>
      <button class="add-btn" @click="goAdd">＋ 新增场次</button>
    </div>

    <table class="table">
      <thead>
        <tr>
          <th>ID</th>
          <th>演出名称</th>
          <th>日期</th>
          <th>时间</th>
          <th>场馆</th>
          <th>库存</th>
          <th>已售</th>
          <th>是否可售</th>
          <th>操作</th>
        </tr>
      </thead>

      <tbody>
        <tr v-for="item in list" :key="item.id">
          <td>{{ item.id }}</td>
          <td>{{ item.performance_name }}</td>
          <td>{{ item.date }}</td>
          <td>{{ item.time }}</td>
          <td>{{ item.venue_name }}</td>

          <td>{{ item.total_stock }}</td>
          <td>{{ item.sold }}</td>

          <td>
            <span :style="{ color: item.status ? 'green' : 'gray' }">
              {{ item.status ? "可售" : "停售" }}
            </span>

            <button class="status-btn" @click="toggle(item)">
              {{ item.status ? "下架" : "上架" }}
            </button>
          </td>

          <td>
            <button @click="edit(item.id)">编辑</button>
            <button class="del-btn" @click="del(item.id)">删除</button>
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
const list = ref([]);
const keyword = ref("");

onMounted(() => load());

async function load() {
  const res = await fetch(
    `http://localhost:3000/admin/schedules?keyword=${keyword.value}`
  );
  const data = await res.json();
  list.value = data.data;
}

function search() {
  load();
}

function goAdd() {
  router.push("/schedules/add");
}

function edit(id) {
  router.push(`/schedules/edit/${id}`);
}

async function del(id) {
  if (!confirm("确定删除该场次？")) return;
  await fetch(`http://localhost:3000/admin/schedules/${id}`, {
    method: "DELETE",
  });
  load();
}

async function toggle(item) {
  await fetch(`http://localhost:3000/admin/schedules/status/${item.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: item.status ? 0 : 1 }),
  });
  load();
}
</script>


<style scoped>
.page {
  padding: 20px;
}

/* 工具栏布局一致 */
.toolbar {
  margin-bottom: 14px;
  display: flex;
  align-items: center;
  gap: 10px;
}

/* 输入框：跟艺人页一致*/
.search-input {
  margin-bottom: -10px;
  height: 30px;
  padding: 0 10px;
  width: 200px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

/* ✅ 关键：只改工具栏里的按钮，不要全局 button */
button {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  background: #409eff;
  color: #fff;
}

.add-btn { background: #67c23a; }
.del-btn { background: #f56c6c; }
.status-btn { background: #909399; }

/* 表格 */
.table {
  width: 100%;
  background: #fff;
  border-collapse: collapse;
  font-size: 14px; /* 统一字号 */
}

.table th,
.table td {
  padding: 10px;
  border-bottom: 1px solid #eee;
  text-align: center;
}

/* 表格里操作列不换行 */
.table td {
  white-space: nowrap;
}

/* ✅ 表格内按钮单独控制（保持紧凑，不被工具栏影响） */
.table td button {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  color: #fff;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  display: inline-block;
  margin-left: 6px;
}
</style>
