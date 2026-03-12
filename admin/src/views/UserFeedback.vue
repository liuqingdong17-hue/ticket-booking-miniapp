<template>
  <div class="feedback-page">
    <h2 class="title">用户反馈列表</h2>

    <div class="back-btn" @click="router.back()">← 返回</div>

    <!-- 列表 -->
    <div v-for="item in list" :key="item.id" class="card">

      <div class="row">
        <span class="label">反馈类型：</span>
        <span class="value">{{ item.type }}</span>
      </div>

      <div class="row">
        <span class="label">内容：</span>
        <span class="value">{{ item.content }}</span>
      </div>

      <div class="row">
        <span class="label">联系方式：</span>
        <span class="value">{{ item.phone }}</span>
      </div>

      <div class="row">
        <span class="label">提交时间：</span>
        <span class="value">{{ formatDate(item.created_at) }}</span>
      </div>

      <div v-if="item.images.length" class="imgs">
        <image
          v-for="src in item.images"
          :key="src"
          :src="src"
          class="img"
          @click="preview(src, item.images)"
        />
      </div>

    </div>

    <div v-if="list.length === 0" class="empty">暂无反馈记录</div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue"
import { useRoute, useRouter } from "vue-router"
import axios from "../utils/axios"

const route = useRoute()
const router = useRouter()

const list = ref([])

// 加载反馈记录
onMounted(() => {
  const userId = route.params.id
  axios.get(`/admin/user/${userId}/feedback`)
    .then(res => {
      if (res.data.status === 0) {
        list.value = res.data.data
      }
    })
})

function formatDate(t) {
  return t ? new Date(t).toLocaleString() : ""
}

// 图片预览
function preview(src, urls) {
  // 仅浏览器端
  window.open(src, "_blank")
}
</script>

<style scoped>
.title {
  font-size: 20px;
  font-weight: bold;
  margin-bottom: 16px;
}

.back-btn {
  margin-bottom: 16px;
  color: #2563eb;
  cursor: pointer;
  font-size: 14px;
}

.card {
  background: #fff;
  padding: 16px;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.08);
  margin-bottom: 16px;
}

.row {
  margin-bottom: 8px;
  font-size: 14px;
}

.label {
  color: #555;
  font-weight: 600;
}

.imgs {
  margin-top: 10px;
  display: flex;
  gap: 10px;
}

.img {
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: 6px;
  cursor: pointer;
}

.empty {
  text-align: center;
  margin-top: 40px;
  color: #999;
}
</style>
