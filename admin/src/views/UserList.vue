<template>
  <div class="page">
    <h2>用户管理</h2>

    <table class="user-table">
      <thead>
        <tr>
          <th>ID</th>
          <th>用户昵称</th>
          <th>手机号</th>
          <th>注册时间</th>
          <th>反馈数</th>
          <th>未读消息</th>
          <th>操作</th>
        </tr>
      </thead>

      <tbody>
        <tr v-for="u in list" :key="u.id">
          <td>{{ u.id }}</td>
          <td>{{ u.username }}</td>
          <td>{{ u.phone }}</td>
          <td>{{ format(u.created_at) }}</td>
          <td>{{ u.feedback_count }}</td>

          <td :style="{ color: u.unread_messages > 0 ? 'red' : '#666' }">
            {{ u.unread_messages }}
          </td>

          <td>
            <button @click="detail(u.id)">详情</button>
            <button @click="chat(u.id)" class="chat-btn">客服聊天</button>
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

onMounted(loadList);

async function loadList() {
  const res = await fetch("http://localhost:3000/admin/users/list", {
    headers: { Authorization: "Bearer " + localStorage.getItem("admin_token") },
  });

  const data = await res.json();
  list.value = data.data || [];
}

function detail(id) {
  router.push(`/user/detail/${id}`);
}

function chat(id) {
  router.push(`/user/chat/${id}`);
}

function format(t) {
  return t?.replace('T', ' ').slice(0, 16);
}
</script>

<style scoped>
.page {
  padding: 20px;
}

.user-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
}

.user-table th,
.user-table td {
  padding: 10px;
  border: 1px solid #eee;
  text-align: center;
}

.chat-btn {
  margin-left: 8px;
  background: #4b8df8;
  color: white;
}
</style>
