<template>
  <div class="page">
    <h2>编辑场次</h2>

    <div class="form" v-if="loaded">
      <label>选择演出</label>
      <select v-model="form.performance_id">
        <option v-for="p in performances" :key="p.id" :value="p.id">
          {{ p.name }}
        </option>
      </select>

      <label>场次时间</label>
      <input type="datetime-local" v-model="form.schedule_time" />

      <label>时长（分钟）</label>
      <input v-model="form.duration" type="number" />

      <button class="submit-btn" @click="save">保存修改</button>
    </div>

    <!-- ⭐⭐⭐ 仅不可选座时显示票档管理 -->
    <div class="ticket-section" v-if="loaded && !selectableSeats">
      <h3>票档管理</h3>

      <table class="table">
        <thead>
          <tr>
            <th>名称</th>
            <th>价格</th>
            <th>库存（总票数）</th>
            <th>操作</th>
          </tr>
        </thead>

        <tbody>
          <tr v-for="t in tickets" :key="t.id">
            <td>{{ t.name }}</td>
            <td>{{ t.price }}</td>
            <td>{{ t.stock }}</td>
            <td>
              <!-- <button @click="editTicket(t)">编辑</button> -->
              <button class="del-btn" @click="delTicket(t.id)">删除</button>
            </td>
          </tr>

          <tr>
            <td><input v-model="newTicket.name" /></td>
            <td><input v-model="newTicket.price" type="number" /></td>
            <td><input v-model="newTicket.stock" type="number" /></td>
            <td><button @click="addTicket">新增</button></td>
          </tr>
        </tbody>
      </table>

      <!-- <div class="modal" v-if="editDialog">
        <div class="modal-content">
          <h4>编辑票档</h4>

          <label>名称</label>
          <input v-model="editForm.name" />

          <label>价格</label>
          <input v-model="editForm.price" type="number" />

          <label>库存</label>
          <input v-model="editForm.stock" type="number" />

          <div class="modal-actions">
            <button @click="updateTicket">保存</button>
            <button @click="editDialog = false">取消</button>
          </div>
        </div>
      </div> -->

    </div>

    <!-- ⭐⭐⭐ 可选座时显示按钮 -->
    <div v-if="loaded && selectableSeats" class="area-link">
      <h3>该场次为：可选座模式</h3>
      <button class="area-btn" @click="goAreaPrice">进入区域价格设置</button>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";

const route = useRoute();
const router = useRouter();
const id = route.params.id;

// 基础数据
const form = ref({});
const performances = ref([]);
const loaded = ref(false);

// 是否可选座
const selectableSeats = ref(false);

// 票档
const tickets = ref([]);
const newTicket = ref({ name: "", price: "", stock: "" });

// 编辑弹窗
// const editDialog = ref(false);
// const editForm = ref({});

onMounted(() => {
  loadPerformances();
  loadDetail();
  loadSelectable();
});

/* 加载场次基本信息 */
async function loadDetail() {
  const res = await fetch(`http://localhost:3000/admin/schedules/${id}`);
  const data = await res.json();
  form.value = data.data;
  loaded.value = true;
}

/* 加载演出列表 */
async function loadPerformances() {
  const res = await fetch("http://localhost:3000/admin/performances");
  const data = await res.json();
  performances.value = data.data;
}

/* 加载是否可选座 */
async function loadSelectable() {
  const res = await fetch(`http://localhost:3000/admin/schedules/service/${id}`);
  const data = await res.json();
  selectableSeats.value = !!data.selectable_seats;

  if (!selectableSeats.value) {
    loadTickets();
  }
}

/* 保存基础信息 */
async function save() {
  await fetch(`http://localhost:3000/admin/schedules/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(form.value),
  });

  alert("修改成功！");
  router.push("/schedules");
}

/* ===================== 票档管理模块 ===================== */

/* 获取票档列表（✔ 路径已修正） */
async function loadTickets() {
  const res = await fetch(
    `http://localhost:3000/admin/schedules/ticket-types?schedule_id=${id}`
  );
  const data = await res.json();
  tickets.value = data.data;
}

/* 新增票档（✔ 路径已修正） */
async function addTicket() {
  if (!newTicket.value.name) return alert("请填写票档名称");

  const body = {
    schedule_id: id,
    performance_id: form.value.performance_id,
    name: newTicket.value.name,
    price: newTicket.value.price,
    stock: newTicket.value.stock
  };

  await fetch("http://localhost:3000/admin/schedules/ticket-types", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  newTicket.value = { name: "", price: "", stock: "" };
  loadTickets();
}

/* 删除票档（✔ 路径已修正） */
async function delTicket(tid) {
  if (!confirm("确定删除该票档？")) return;

  await fetch(`http://localhost:3000/admin/schedules/ticket-types/${tid}`, {
    method: "DELETE",
  });

  loadTickets();
}

// /* 打开编辑 */
// function editTicket(t) {
//   editForm.value = { ...t };
//   editDialog.value = true;
// }

// /* 更新票档（✔ 路径已修正） */
// async function updateTicket() {
//   await fetch(
//     `http://localhost:3000/admin/schedules/ticket-types/${editForm.value.id}`,
//     {
//       method: "PUT",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify(editForm.value),
//     }
//   );

//   editDialog.value = false;
//   loadTickets();
// }

/* 可选座：进入区域价格设置页 */
function goAreaPrice() {
  router.push(`/schedules/${id}/area-price`);
}
</script>

<style scoped>
.page {
  padding: 20px;
}
.form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.table {
  width: 100%;
  background: white;
  border-collapse: collapse;
  margin-top: 20px;
}
.table th,
.table td {
  padding: 10px;
  border-bottom: 1px solid #eee;
  text-align: center;
}
.del-btn {
  background: #f56c6c;
  color: white;
}
.area-link {
  margin-top: 30px;
}
.area-btn {
  background: #409eff;
  color: white;
  padding: 10px 20px;
  border-radius: 4px;
}
</style>
