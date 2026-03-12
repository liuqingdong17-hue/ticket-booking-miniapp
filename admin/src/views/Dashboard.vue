<!-- src/views/Dashboard.vue -->
<template>
  <div class="dashboard">

    <!-- ====== 顶部统计卡片 ====== -->
    <div class="stats-grid">
      <div class="stat-card">
        <h3>{{ stats.new_users }}</h3>
        <p>今日新增用户</p>
      </div>

      <div class="stat-card">
        <h3>{{ stats.new_orders }}</h3>
        <p>今日订单数</p>
      </div>

      <div class="stat-card">
        <h3>¥ {{ stats.today_amount }}</h3>
        <p>今日销售额</p>
      </div>

      <div class="stat-card">
        <h3>{{ stats.online_performances }}</h3>
        <p>上架演出数</p>
      </div>
    </div>

    <!-- ====== 图表区域 ====== -->
    <div class="chart-box">
      <h3>过去 7 天订单趋势</h3>
      <canvas id="orderChart"></canvas>
    </div>

    <div class="chart-box">
      <h3>过去 7 天销售额趋势</h3>
      <canvas id="amountChart"></canvas>
    </div>


    <!-- ====== 热门演出 ====== -->
    <div class="panel">
      <h3>热门演出 Top5</h3>
      <table class="data-table">
        <thead>
          <tr>
            <th>排名</th>
            <th>演出名称</th>
            <th>城市</th>
            <th>热度</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, idx) in hotPerformances" :key="item.id">
            <td>{{ idx + 1 }}</td>
            <td>{{ item.name }}</td>
            <td>{{ item.city }}</td>
            <td>{{ item.popularity }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ====== 最新反馈 ====== -->
    <div class="panel">
      <h3>最新用户反馈</h3>
      <table class="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>用户</th>
            <th>内容</th>
            <th>时间</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="f in feedbacks" :key="f.id">
            <td>{{ f.id }}</td>
            <td>{{ f.username }}</td>
            <td>{{ f.content }}</td>
            <td>{{ f.created_at.slice(0, 16) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import Chart from 'chart.js/auto'

const stats = ref({
  new_users: 0,
  new_orders: 0,
  today_amount: 0,
  online_performances: 0
})

const hotPerformances = ref([])
const feedbacks = ref([])

async function loadDashboard() {
  const res = await fetch("http://localhost:3000/admin/dashboard/data", {
    headers: { Authorization: "Bearer " + localStorage.getItem("admin_token") }
  })
  const data = await res.json()
  if (data.status === 0) {
    Object.assign(stats.value, data.stats)
    hotPerformances.value = data.hot
    feedbacks.value = data.feedbacks
    drawChart(data.chart)
    drawAmountChart(data.chart)
  }
}

// 折线图
function drawChart(chartData) {
  const ctx = document.getElementById('orderChart')
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: chartData.days,
      datasets: [{
        label: '订单量',
        data: chartData.counts,
        borderColor: '#3b82f6',
        tension: 0.3
      }]
    }
  })
}

function drawAmountChart(chartData) {
  const ctx = document.getElementById('amountChart');
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: chartData.days,
      datasets: [
        {
          label: '销售额（元）',
          data: chartData.amountCounts,
          borderColor: '#10b981',
          backgroundColor: 'rgba(16,185,129,0.3)',
          tension: 0.3
        }
      ]
    }
  });
}



onMounted(loadDashboard)
</script>

<style scoped>
.dashboard {
  padding: 20px;
}

/* 统计卡片布局 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}
.stat-card {
  background: white;
  padding: 20px;
  border-radius: 6px;
  box-shadow: 0 2px 5px rgba(0,0,0,0.05);
  text-align: center;
}
.stat-card h3 {
  font-size: 26px;
  margin: 0;
}

/* 图表模块 */
.chart-box {
  background: white;
  margin-top: 20px;
  padding: 20px;
  border-radius: 6px;
}

/* 表格模块 */
.panel {
  background: white;
  margin-top: 20px;
  padding: 20px;
  border-radius: 6px;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 10px;
}

.data-table th,
.data-table td {
  padding: 8px;
  border: 1px solid #ddd;
}
</style>
