<template>
  <div class="chat-page">
    <h2>与用户 {{ userId }} 的客服聊天</h2>

    <!-- 聊天记录 -->
    <div class="chat-box" ref="chatBox">
      <div 
        v-for="m in messages" 
        :key="m.id"
        :class="['msg', m.sender]"
      >
        <p class="bubble">{{ m.message }}</p>
        <span class="time">{{ format(m.created_at) }}</span>
      </div>
    </div>

    <!-- 输入框 -->
    <div class="input-area">
      <input 
        v-model="inputText" 
        placeholder="输入回复..." 
        @keyup.enter="sendMessage"
      />
      <button @click="sendMessage">发送</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const userId = route.params.id;

const messages = ref([]);
const inputText = ref("");
const chatBox = ref(null);

// 加载聊天记录
async function loadMessages() {
  const res = await fetch(`http://localhost:3000/admin/chat/messages/${userId}`, {
    headers: {
      Authorization: "Bearer " + localStorage.getItem("admin_token")
    }
  });

  const data = await res.json();
  if (data.status === 0) {
    messages.value = data.data;
    scrollToBottom();
  }
}


function scrollToBottom() {
  setTimeout(() => {
    chatBox.value.scrollTop = chatBox.value.scrollHeight;
  }, 100);
}

// 发送消息
async function sendMessage() {
  if (!inputText.value.trim()) return;

  await fetch("http://localhost:3000/admin/chat/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + localStorage.getItem("admin_token")
    },
    body: JSON.stringify({
      user_id: userId,
      text: inputText.value
    })
  });

  inputText.value = "";
  loadMessages();
}

onMounted(() => {
  loadMessages();
  setInterval(loadMessages, 2000);
});

function format(t) {
  return t?.replace('T', ' ').slice(0, 16);
}
</script>

<style scoped>
.chat-page {
  padding: 20px;
}

.chat-box {
  background: #f7f7f7;
  height: 400px;
  overflow-y: auto;
  padding: 10px;
  border-radius: 6px;
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.msg {
  display: inline-flex; /* ⭐ 自动根据内容宽度 */
  flex-direction: column;
  max-width: 60%;       /* ⭐ 不超过 60% */
}

.msg.user {
  align-self: flex-start;
}

.msg.admin {
  align-self: flex-end;
  text-align: right;
}

.bubble {
  padding: 10px 14px;
  border-radius: 8px;
  background: #dcecff;
  word-break: break-word; /* ⭐ 内容过长自动换行 */
  font-size: 14px;
}

.msg.admin .bubble {
  background: #ffe4c4;
}

.time {
  font-size: 11px;
  color: #777;
  margin-top: 4px;
}
  
.input-area {
  display: flex;
  gap: 10px;
}

input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
}

button {
  padding: 8px 16px;
  background: #409eff;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}
</style>
