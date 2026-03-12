<template>
  <div class="page">
    <h2>新增场馆</h2>

    <div class="form">
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

      <label>座位图上传（可选）</label>
      <input type="file" @change="upload" />
      <img v-if="form.seat_map_url" :src="form.seat_map_url" class="preview"/>

      <button class="submit-btn" @click="submit">提交</button>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue"
import { useRouter } from "vue-router"

const router = useRouter()
const form = ref({
  name:"", province:"", city:"", address:"",
  has_seat_map:0,
  seat_map_url:""
})

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


async function submit() {
  if (!form.value.name) return alert("请填写场馆名称")
  if (!form.value.city) return alert("请填写城市")

  const res = await fetch("http://localhost:3000/admin/venues", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: 'Bearer ' + localStorage.getItem('admin_token')
    },
    body: JSON.stringify(form.value)
  })

  const data = await res.json()
  if (data.status === 0) {
    alert("新增成功")
    router.push("/venues")
  } else {
    alert(data.message || "新增失败")
  }
}

</script>

<style scoped>
.page { padding:20px; }
.form { display:flex; flex-direction:column; gap:12px; }
.preview { width:200px; margin-top:10px; border-radius:6px; }
.submit-btn { background:#409eff; color:white; padding:10px; width:120px; border-radius:4px; }
</style>
