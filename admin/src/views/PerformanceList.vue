<!-- src/views/PerformanceList.vue -->
<template>
  <div class="page">
    <h2>演出管理</h2>

    <!-- 搜索 & 新增 -->
    <div class="toolbar">
      <input v-model="keyword" placeholder="搜索名称/分类/城市…" class="search-input" />
      <button @click="search">搜索</button>
      <button class="add-btn" @click="goAdd">＋ 新增演出</button>
    </div>

    <!-- 表格 -->
    <table class="perf-table">
      <thead>
        <tr>
          <th>ID</th>
          <th>名称</th>
          <th>分类</th>
          <th>城市</th>
          <th>场馆</th>
          <th>艺人</th>
          <th>热度</th>
          <th>状态</th>
          <th>创建时间</th>
          <th>操作</th>
        </tr>
      </thead>

      <tbody>
        <tr v-for="item in list" :key="item.id">
          <td>{{ item.id }}</td>
          <td>{{ item.name }}</td>
          <td>{{ item.category }}</td>
          <td>{{ item.city }}</td>
          <td>{{ item.venue_name }}</td>
          <td>
            <span v-if="item.artists && item.artists.length">
              {{ item.artists.join('、') }}
            </span>
            <span v-else>暂无</span>
          </td>
          <td>{{ item.popularity }}</td>

          <td>
            <span :style="{ color: item.status ? 'green' : 'gray' }">
              {{ item.status ? "已上架" : "已下架" }}
            </span>
            <button class="status-btn" @click="toggleStatus(item)">
              {{ item.status ? "下架" : "上架" }}
            </button>
          </td>

          <td>{{ format(item.created_at) }}</td>

          <td>
            <button @click="edit(item.id)">编辑</button>
            <button class="del-btn" @click="del(item.id)">删除</button>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- 分页 -->
    <div class="pagination">
      <button :disabled="page <= 1" @click="prevPage">上一页</button>
      <span>{{ page }} / {{ totalPage }}</span>
      <button :disabled="page >= totalPage" @click="nextPage">下一页</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();

// 列表数据
const list = ref([]);

// 分页 + 搜索
const page = ref(1);
const pageSize = ref(5);
const total = ref(0);
const keyword = ref("");

// 总页数
const totalPage = computed(() => Math.ceil(total.value / pageSize.value));

onMounted(() => {
  loadList();
});

/* 加载列表 + 分页 + 搜索 */
async function loadList() {
  const res = await fetch(
    `http://localhost:3000/admin/performances?page=${page.value}&pageSize=${pageSize.value}&keyword=${keyword.value}`
  );
  const data = await res.json();

  list.value = data.data;
  total.value = data.total;
}

/* 搜索 */
function search() {
  page.value = 1;
  loadList();
}

/* 上架 / 下架 */
async function toggleStatus(item) {
  await fetch(`http://localhost:3000/admin/performances/status/${item.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: item.status ? 0 : 1 }),
  });

  loadList();
}

/* 编辑 */
function edit(id) {
  router.push(`/performance/edit/${id}`);
}

/* 删除 */
async function del(id) {
  if (!confirm("确定删除该演出？")) return;

  await fetch(`http://localhost:3000/admin/performances/${id}`, {
    method: "DELETE",
  });

  loadList();
}

/* 添加 */
function goAdd() {
  router.push("/performance/add");
}

/* 分页按钮 */
function prevPage() {
  if (page.value > 1) {
    page.value--;
    loadList();
  }
}

function nextPage() {
  if (page.value < totalPage.value) {
    page.value++;
    loadList();
  }
}

/* 格式化时间 */
function format(t) {
  return t ? t.replace('T', ' ').slice(0, 16) : '';
}
</script>

<style scoped>
.page {
  padding: 20px;
  background: #fff;
}

/* 搜索栏 */
.toolbar {
  margin-bottom: 14px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.search-input {
  padding: 6px 10px;
  width: 200px;
  border: 1px solid #ddd;
  border-radius: 4px;
  margin-bottom: -10px;
}

/* 表格 */
.perf-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 10px;
  background: white;
}

.perf-table th,
.perf-table td {
  padding: 10px;
  border: 1px solid #eee;
  text-align: center;
}

/* 按钮 */
button {
  padding: 6px 12px;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  background: #409eff;
  color: white;
}

.add-btn {
  background: #67c23a;
}

.status-btn {
  margin-left: 5px;
  background: #909399;
}

.del-btn {
  background: #f56c6c;
}

/* 分页 */
.pagination {
  margin-top: 16px;
  display: flex;
  align-items: center;
  gap: 16px;
}

.pagination button {
  background: #409eff;
}
</style>
