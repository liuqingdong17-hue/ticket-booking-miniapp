<template>
  <div class="page">
    <h2>场馆管理</h2>

    <div class="toolbar">
      <button class="add-btn" @click="goAdd">＋ 新增场馆</button>
    </div>

    <table class="table">
      <thead>
        <tr>
          <th>ID</th>
          <th>名称</th>
          <th>城市</th>
          <th>地址</th>
          <th>是否支持选座</th>
          <th>操作</th>
        </tr>
      </thead>

      <tbody>
        <tr v-for="v in venues" :key="v.id">
          <td>{{ v.id }}</td>
          <td>{{ v.name }}</td>
          <td>{{ v.city }}</td>
          <td>{{ v.address }}</td>
          <td style="color:green" v-if="v.has_seat_map">支持</td>
          <td style="color:gray" v-else>不支持</td>
          <td>
            <button @click="edit(v.id)">编辑</button>
            <button class="del-btn" @click="del(v.id)">删除</button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue"
import { useRouter } from "vue-router"

const venues = ref([])
const router = useRouter()

onMounted(() => load())

async function load() {
  const res = await fetch("http://localhost:3000/admin/venues")
  const data = await res.json()
  venues.value = data.data
}

function goAdd() {
  router.push("/venues/add")
}

function edit(id) {
  router.push(`/venues/edit/${id}`)
}

async function del(id) {
  if (!confirm("确定删除该场馆？")) return
  await fetch(`http://localhost:3000/admin/venues/${id}`, { method: "DELETE" })
  load()
}
</script>

<style scoped>
.page { padding:20px; }
.table { width:100%; border-collapse:collapse; }
.table th, .table td { padding:10px; border-bottom:1px solid #eee; text-align:center; }
.add-btn { background:#67c23a; color:white; padding:8px 14px; border-radius:4px; }
.del-btn { background:#f56c6c; color:white; }
</style>
