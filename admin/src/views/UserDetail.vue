<template>
  <div class="page">
    <h2>用户详情</h2>

    <!-- 基本信息 -->
    <div class="card">
      <h3>基本信息</h3>
      <p><strong>ID：</strong>{{ user.id }}</p>
      <p><strong>昵称：</strong>{{ user.username }}</p>
      <p><strong>手机号：</strong>{{ user.phone }}</p>
      <p><strong>注册时间：</strong>{{ format(user.created_at) }}</p>
    </div>

    <!-- 反馈记录 -->
    <div class="card">
      <h3>反馈记录（{{ feedbacks.length }} 条）</h3>

      <table class="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>类型</th>
            <th>内容</th>
            <th>截图</th>
            <th>提交时间</th>
          </tr>
        </thead>

        <tbody>
          <tr v-for="item in feedbacks" :key="item.id">
            <td>{{ item.id }}</td>
            <td>{{ item.type }}</td>
            <td>{{ item.content }}</td>
            <td>
              <img
                v-for="img in item.images"
                :src="img"
                :key="img"
                class="thumb"
                @click="preview(img)"
              />
            </td>
            <td>{{ format(item.created_at) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 聊天记录 -->
    <div class="card">
      <h3>客服聊天记录（{{ messages.length }} 条）</h3>

      <div class="chat-box">
        <div
          v-for="msg in messages"
          :key="msg.id"
          :class="['msg', msg.sender]"
        >
          <span>{{ msg.message }}</span>
          <small>{{ format(msg.created_at) }}</small>
        </div>
      </div>
    </div>

    <button class="btn" @click="goBack">返回</button>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const user = ref({})
const feedbacks = ref([])
const messages = ref([])

onMounted(loadData)

async function loadData() {
  const res = await fetch(`http://localhost:3000/admin/users/detail/${route.params.id}`, {
    headers: {
      Authorization: 'Bearer ' + localStorage.getItem('admin_token')
    }
  })
  const data = await res.json()

  user.value = data.data.user
  feedbacks.value = data.data.feedbacks
  messages.value = data.data.messages
}

function preview(url) {
  window.open(url)
}

function goBack() {
  router.back()
}

function format(t) {
  return t?.replace('T', ' ').slice(0, 16)
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
  border-radius: 6px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.05);
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th,
.data-table td {
  padding: 8px;
  border: 1px solid #ddd;
}

.thumb {
  width: 50px;
  height: 50px;
  margin-right: 6px;
  border-radius: 4px;
  cursor: pointer;
}

.chat-box {
  background: #f8f8f8;
  padding: 12px;
  border-radius: 6px;
  max-height: 300px;
  overflow-y: auto;
}

.msg {
  margin-bottom: 10px;
  padding: 8px 12px;
  border-radius: 6px;
  max-width: 60%;
}

.msg.user {
  background: #d1e9ff;
  align-self: flex-start;
}

.msg.admin {
  background: #ffd9b3;
  align-self: flex-end;
}
</style>
