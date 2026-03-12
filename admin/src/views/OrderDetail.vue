<template>
  <div class="page">
    <h2>订单详情</h2>

    <!-- ========== 订单基本信息 ========== -->
    <div class="card">
      <h3>订单信息</h3>
      <table class="info-table">
        <tbody>
          <tr><td>订单号</td><td>{{ order.order_number }}</td></tr>
          <tr><td>订单状态</td><td>{{ statusText(order.status) }}</td></tr>
          <tr>
            <td>退款状态</td>
            <td :style="{ color: refundColor(order.refund_status) }">
              {{ refundText(order.refund_status) }}
            </td>
          </tr>
          <tr><td>下单时间</td><td>{{ format(order.created_at) }}</td></tr>
          <tr v-if="order.paid_at"><td>支付时间</td><td>{{ format(order.paid_at) }}</td></tr>
        </tbody>
      </table>
    </div>

    <!-- ========== 用户信息 ========== -->
    <div class="card">
      <h3>用户信息</h3>
      <table class="info-table">
        <tbody>
          <tr><td>用户 ID</td><td>{{ order.user_id }}</td></tr>
          <tr><td>用户名</td><td>{{ order.username }}</td></tr>
          <tr><td>手机号</td><td>{{ order.phone }}</td></tr>
        </tbody>
      </table>
    </div>

    <!-- ========== 演出信息 ========== -->
    <div class="card">
      <h3>演出信息</h3>
      <table class="info-table">
        <tbody>
          <tr><td>演出名称</td><td>{{ order.performance_name }}</td></tr>
          <tr><td>场馆</td><td>{{ order.venue_name }}</td></tr>
          <tr><td>演出时间</td><td>{{ format(order.schedule_time) }}</td></tr>
        </tbody>
      </table>
    </div>

    <!-- ========== 座位列表 ========== -->
    <div class="card" v-if="seatList.length">
      <h3>座位信息（可选座）</h3>
      <table class="data-table">
        <thead>
          <tr>
            <th>区域</th>
            <th>排</th>
            <th>座</th>
            <th>单价</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(s, idx) in seatList" :key="idx">
            <td>{{ s.area_name }}</td>
            <td>{{ s.row_no }}</td>
            <td>{{ s.seat_no }}</td>
            <td>￥{{ s.price }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ========== 票档列表 ========== -->
    <div class="card" v-if="ticketList.length">
      <h3>票档信息（不可选座）</h3>
      <table class="data-table">
        <thead>
          <tr>
            <th>票档</th>
            <th>数量</th>
            <th>单价</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(t, idx) in ticketList" :key="idx">
            <td>{{ t.ticket_name }}</td>
            <td>{{ t.count }}</td>
            <td>￥{{ t.price }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ========== 金额信息 ========== -->
    <div class="card">
      <h3>金额信息</h3>
      <table class="info-table">
        <tbody>
          <tr><td>原价金额</td><td>￥{{ order.total_price }}</td></tr>
          <tr><td>优惠金额</td><td>-￥{{ order.discount_price }}</td></tr>
          <tr><td>实付金额</td><td style="color:red">￥{{ order.pay_price }}</td></tr>
        </tbody>
      </table>
    </div>

    <!-- ========== 退款信息 ========== -->
    <div class="card">
      <h3>退款信息</h3>
      <table class="info-table">
        <tbody>
          <tr><td>退款状态</td><td>{{ refundText(order.refund_status) }}</td></tr>
          <tr v-if="order.refund_apply_reason">
            <td>申请原因</td>
            <td>{{ order.refund_apply_reason }}</td>
          </tr>

          <tr v-if="order.refund_status === 'rejected'">
            <td>拒绝原因</td>
            <td style="color:#f56c6c">
              {{ order.refund_reject_reason || '管理员未填写原因' }}
            </td>
          </tr>

          <tr v-if="order.refund_applied_at"><td>申请时间</td><td>{{ format(order.refund_applied_at) }}</td></tr>
          <tr v-if="order.refund_processed_at"><td>处理时间</td><td>{{ format(order.refund_processed_at) }}</td></tr>
        </tbody>
      </table>

      <!-- 审核按钮 -->
      <div class="btn-row" v-if="order.refund_status === 'pending'">
        <button class="ok-btn" @click="approve">同意退款</button>
        <button class="reject-btn" @click="reject">拒绝退款</button>
      </div>
    </div>

  </div>
</template>


<script setup>
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";

const route = useRoute();
const router = useRouter();
const orderId = route.params.id;

const order = ref({});
const seatList = ref([]);
const ticketList = ref([]);

onMounted(loadDetail);

async function loadDetail() {
  const res = await fetch(`http://localhost:3000/admin/orders/${orderId}`);
  const data = await res.json();

  order.value = data.order;
  seatList.value = data.seat_list || [];
  ticketList.value = data.ticket_list || [];
}

/* ========= 状态文本 ========= */
function statusText(s) {
  return s === "paid" ? "已支付" : "未支付";
}
function refundText(s) {
  return {
    none: "未申请",
    pending: "审核中",
    approved: "已退款",
    rejected: "已拒绝",
  }[s] || "未知";
}
function refundColor(s) {
  return {
    pending: "#e6a23c",
    approved: "green",
    rejected: "#f56c6c",
  }[s] || "#666";
}

/* ========= 同意退款 ========= */
async function approve() {
  if (!confirm("确定要同意退款吗？\n操作后不可撤销！")) return;

  const res = await fetch(`http://localhost:3000/admin/orders/${orderId}/approve-refund`, {
    method: "POST",
  });
  const data = await res.json();

  alert(data.message);
  loadDetail();
}

/* ========= 拒绝退款 ========= */
async function reject() {
  const reason = prompt("请输入拒绝理由：");
  if (!reason) return;

  const res = await fetch(`http://localhost:3000/admin/orders/${orderId}/reject-refund`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason }),
  });

  const data = await res.json();
  alert(data.message);
  loadDetail();
}

/* 时间格式化 */
function format(t) {
  return t?.slice(0, 16);
}
</script>

<style scoped>
.page {
  padding: 20px;
}
.card {
  background: white;
  padding: 16px;
  margin-bottom: 20px;
  border: 1px solid #eee;
  border-radius: 6px;
}
.card h3 {
  margin-bottom: 10px;
}

/* 信息表格 */
.info-table {
  width: 100%;
  border-collapse: collapse;
}
.info-table td {
  padding: 8px;
  border: 1px solid #f0f0f0;
  background: #fafafa;
}

/* 票档/座位表格 */
.data-table {
  width: 100%;
  border-collapse: collapse;
}
.data-table th,
.data-table td {
  padding: 10px;
  border: 1px solid #eee;
  text-align: center;
}

.btn-row {
  margin-top: 15px;
  display: flex;
  gap: 12px;
}

.ok-btn {
  background: #67c23a;
  color: #fff;
  padding: 8px 16px;
  border-radius: 4px;
}
.reject-btn {
  background: #f56c6c;
  color: #fff;
  padding: 8px 16px;
  border-radius: 4px;
}
</style>
