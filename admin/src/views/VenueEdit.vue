<template>
  <div class="page">
    <h2>编辑场馆</h2>

    <div class="form" v-if="loaded">
      <label>场馆名称</label>
      <input v-model="form.name" />

      <label>省份</label>
      <input v-model="form.province" />

      <label>城市</label>
      <input v-model="form.city" />

      <label>地址</label>
      <input v-model="form.address" />

      <label>是否支持选座</label>
      <select v-model="form.has_seat_map">
        <option :value="1">支持</option>
        <option :value="0">不支持</option>
      </select>

      <label>座位图（可修改）</label>
      <input type="file" @change="upload" />
      <img v-if="form.seat_map_url" :src="form.seat_map_url" class="preview" />

      <button class="save-btn" @click="save">保存修改</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue"
import { useRoute, useRouter } from "vue-router"

const route = useRoute()
const router = useRouter()
const id = route.params.id

const form = ref({})
const loaded = ref(false)

// 载入场馆详情
onMounted(() => loadDetail())

async function loadDetail() {
  const res = await fetch(`http://localhost:3000/admin/venues/${id}`)
  const data = await res.json()
  form.value = data.data
  loaded.value = true
}

// 上传图片
async function upload(e) {
  const file = e.target.files[0]
  if (!file) return

  const fd = new FormData()
  fd.append("file", file)

  const res = await fetch("http://localhost:3000/admin/venues/upload", {
    method: "POST",
    headers: {
      Authorization: 'Bearer ' + localStorage.getItem('admin_token')
    },
    body: fd
  })

  const data = await res.json()
  if (data.status === 0) {
    form.value.seat_map_url = data.url
  } else {
    alert(data.message || "上传失败")
  }
}


// 保存修改
async function save() {
  const res = await fetch(`http://localhost:3000/admin/venues/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: 'Bearer ' + localStorage.getItem('admin_token')
    },
    body: JSON.stringify(form.value)
  })

  const data = await res.json()
  if (data.status === 0) {
    alert("保存成功！")
    router.push("/venues")
  } else {
    alert(data.message || "保存失败")
  }
}
</script>

<style scoped>
.page { padding: 20px; }
.form { display: flex; flex-direction: column; gap: 12px; }

.preview {
  width: 200px;
  margin-top: 10px;
  border-radius: 6px;
}

.save-btn {
  padding: 10px;
  width: 140px;
  color: white;
  background: #409eff;
  border: none;
  border-radius: 4px;
}
</style>
