<template>
  <div class="page">
    <h2>新增场次</h2>

    <div class="form">
      <label>选择演出</label>
      <select v-model="form.performance_id">
        <option value="">请选择演出</option>
        <option v-for="p in performances" :key="p.id" :value="p.id">
          {{ p.name }}
        </option>
      </select>

      <label>场次时间</label>
      <input type="datetime-local" v-model="form.schedule_time" />

      <label>时长（分钟）</label>
      <input v-model="form.duration" type="number" />

      <button class="submit-btn" @click="submit">提交</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();
const form = ref({
  performance_id: "",
  schedule_time: "",
  duration: "",
});
const performances = ref([]);

onMounted(() => loadPerformances());

async function loadPerformances() {
  const res = await fetch("http://localhost:3000/admin/performances/all");
  const data = await res.json();
  performances.value = data.data;
}

async function submit() {
  const res = await fetch("http://localhost:3000/admin/schedules", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(form.value),
  });

  alert("新增成功");
  router.push("/schedules");
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
.submit-btn {
  background: #409eff;
  color: white;
  padding: 10px;
  width: 120px;
  border-radius: 4px;
}
</style>
