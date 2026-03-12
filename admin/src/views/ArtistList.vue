<template>
  <div class="page">
    <h2>艺人管理</h2>

    <!-- 搜索 + 新增 -->
    <div class="toolbar">
      <input v-model="keyword" placeholder="搜索艺人名称" class="search-input" />
      <button @click="search">搜索</button>
      <button class="add-btn" @click="goAdd">＋ 新增艺人</button>
    </div>

    <!-- 表格 -->
    <table class="table">
      <thead>
        <tr>
          <th>ID</th>
          <th>头像</th>
          <th>名字</th>
          <th>简介</th>
          <th>创建时间</th>
          <th>操作</th>
        </tr>
      </thead>

      <tbody>
        <tr v-for="a in list" :key="a.id">
          <td>{{ a.id }}</td>
          <td><img :src="a.avatar" class="photo" /></td>
          <td>{{ a.name }}</td>
          <td>{{ a.description }}</td>
          <td>{{ a.created_at?.replace('T', ' ').slice(0, 16) }}</td>
          <td>
            <button @click="edit(a.id)">编辑</button>
            <button class="del-btn" @click="del(a.id)">删除</button>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- 分页 -->
    <div class="pagination">
      <button :disabled="page <= 1" @click="prev">上一页</button>
      <span>{{ page }} / {{ totalPage }}</span>
      <button :disabled="page >= totalPage" @click="next">下一页</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();
const list = ref([]);
const page = ref(1);
const pageSize = ref(6);
const total = ref(0);
const keyword = ref("");

const totalPage = computed(() =>
  Math.ceil(total.value / pageSize.value)
);

onMounted(load);

async function load() {
  const res = await fetch(
    `http://localhost:3000/admin/artists?page=${page.value}&pageSize=${pageSize.value}&keyword=${keyword.value}`
  );
  const data = await res.json();
  list.value = data.data;
  total.value = data.total;
}

function search() {
  page.value = 1;
  load();
}

function prev() {
  page.value--;
  load();
}

function next() {
  page.value++;
  load();
}

function goAdd() {
  router.push("/artist/add");
}

function edit(id) {
  router.push(`/artist/edit/${id}`);
}

async function del(id) {
  if (!confirm("确定要删除此艺人？")) return;
  await fetch(`http://localhost:3000/admin/artists/${id}`, {
    method: "DELETE",
  });
  load();
}
</script>

<style scoped>
.page { padding: 20px; }

.toolbar {
  margin-bottom: 14px;
  display: flex;
  align-items: center; 
  gap: 10px;
}

.search-input {
  margin-bottom: -10px;
  height: 30px; 
  padding: 0 10px;
  width: 200px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

/* 表格 */
.table {
  width: 100%;
  border-collapse: collapse;
}
.table td, .table th {
  border: 1px solid #eee;
  padding: 10px;
  text-align: center;
}

.photo {
  width: 50px;
  height: 50px;
  border-radius: 50%;
}

/* 按钮 */
button {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  background: #409eff;
  color: #fff;
}

.add-btn { background: #67c23a; }
.del-btn { background: #f56c6c; }

.pagination {
  margin-top: 16px;
  display: flex;
  align-items: center;
  gap: 16px;
}
</style>
