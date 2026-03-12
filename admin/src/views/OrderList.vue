<template>
  <div class="page">
    <h2>订单管理</h2>

    <!-- 搜索 -->
    <div class="toolbar">
      <input v-model="keyword" class="search-input" placeholder="搜索订单号 / 演出名 / 用户名…" />
      <select v-model="refundFilter">
        <option value="">全部退款状态</option>
        <option value="none">未申请</option>
        <option value="pending">审核中</option>
        <option value="approved">已退款</option>
        <option value="rejected">已拒绝</option>
      </select>
      <button @click="search">搜索</button>
    </div>

    <table class="order-table">
      <thead>
        <tr>
          <th>ID</th>
          <th>订单号</th>
          <th>演出名称</th>
          <th>用户</th>
          <th>金额</th>
          <th>状态</th>
          <th>退款状态</th>
          <th>下单时间</th>
          <th>操作</th>
        </tr>
      </thead>

      <tbody>
        <tr v-for="item in list" :key="item.id">
          <td>{{ item.order_id }}</td>
          <td>{{ item.order_number }}</td>
          <td>{{ item.performance_name }}</td>
          <td>{{ item.username }}</td>
          <td>￥{{ item.pay_price }}</td>

          <td :style="{ color: item.status === 'paid' ? 'green' : 'gray' }">
            {{ item.status === 'paid' ? 'unpaid' ? '已支付' : '未支付' :'已取消'}}
          </td>

          <td :style="{ color: refundColor(item.refund_status) }">
            {{ refundText(item.refund_status) }}
          </td>

          <td>{{ format(item.created_at) }}</td>

          <td>
            <button @click="detail(item.order_id)">详情</button>
            <button 
              v-if="item.refund_status === 'pending'" 
              class="review-btn"
              @click="detail(item.order_id)"
            >
              审核退款
            </button>
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

const list = ref([]);
const page = ref(1);
const pageSize = ref(10);
const total = ref(0);
const keyword = ref("");
const refundFilter = ref("");

const totalPage = computed(() => Math.ceil(total.value / pageSize.value));

onMounted(loadList);

async function loadList() {
  const res = await fetch(
    `http://localhost:3000/admin/orders/list?page=${page.value}&size=${pageSize.value}&refund_status=${refundFilter.value}&keyword=${keyword.value}`,
    {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("admin_token")
      }
    }
  );

  const data = await res.json();

  list.value = data.data;
  total.value = data.total || 0;
}


function refundText(v) {
  return {
    none: "未申请",
    pending: "审核中",
    approved: "已退款",
    rejected: "已拒绝"
  }[v] || "未知";
}

function refundColor(v) {
  return {
    none: "#666",
    pending: "#e6a23c",
    approved: "green",
    rejected: "#f56c6c"
  }[v];
}

function search() {
  page.value = 1;
  loadList();
}

function detail(id) {
  router.push(`/order/detail/${id}`);
}

function prevPage() {
  page.value--;
  loadList();
}
function nextPage() {
  page.value++;
  loadList();
}

function format(t) {
  return t?.replace('T', ' ').slice(0, 16);
}
</script>

<style scoped>
.page {
  padding: 20px;
}

.toolbar {
  display: flex;
  align-items: center; 
  gap: 10px;
  margin-bottom: 16px;
}

/* 搜索输入框 */
.search-input {
  height: 36px;         /* ⭐ 与按钮同高 */
  padding: 0 10px;
  border-radius: 4px;
  border: 1px solid #ccc;
  width: 220px;         /* 略大一点更美观 */
  box-sizing: border-box;
}
/* 下拉选择框 */
.toolbar select {
  margin-bottom: -10px;
  height: 36px;         /* ⭐ 同高度 */
  padding: 0 10px;
  border-radius: 4px;
  border: 1px solid #ccc;
  background: #fff;
  box-sizing: border-box;
}
/* 搜索按钮 */
.toolbar button {
  height: 36px;         /* ⭐ 同高度 */
  padding: 0 16px;
  border-radius: 4px;
  border: none;
  background: #409eff;
  color: #fff;
  cursor: pointer;
}

.order-table {
  width: 100%;
  border-collapse: collapse;
  background: #fff;
}

.order-table th,
.order-table td {
  padding: 10px;
  border: 1px solid #eee;
  text-align: center;
}

.review-btn {
  background: #e6a23c;
  margin-left: 4px;
  color: #fff;
}

.pagination {
  margin-top: 20px;
  display: flex;
  gap: 16px;
}
</style>
