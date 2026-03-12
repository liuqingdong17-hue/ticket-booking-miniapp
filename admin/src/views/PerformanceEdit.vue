<template>
  <div class="page">
    <h2>编辑演出</h2>

    <div class="form" v-if="loaded">

      <label>演出名称</label>
      <input v-model="form.name" />

      <label>分类</label>
      <input v-model="form.category" />

      <label>城市</label>
      <input v-model="form.city" />

      <label>场馆</label>
      <select v-model="form.venue_id">
        <option v-for="v in venues" :key="v.id" :value="v.id">{{ v.name }}</option>
      </select>

      <!-- 艺人选择 -->
      <label>艺人（可多选）</label>
      <select v-model="form.artist_ids" multiple>
        <option v-for="a in artistList" :key="a.id" :value="a.id">
          {{ a.name }}
        </option>
      </select>

      <label>封面图</label>
      <input type="file" @change="uploadCover" />
      <img v-if="form.cover_url" :src="form.cover_url" class="preview" />

      <label>简介</label>
      <textarea v-model="form.description" rows="4"></textarea>

      <!-- 服务配置 -->
      <h3>服务项目</h3>
      <div class="service-group">
        <label><input type="checkbox" v-model="services.refundable" /> 支持退票</label>
        <label><input type="checkbox" v-model="services.selectable_seats" /> 支持选座</label>
        <label><input type="checkbox" v-model="services.real_name_required" /> 实名入场</label>
        <label><input type="checkbox" v-model="services.ticket_exchangeable" /> 支持换票</label>
        <label><input type="checkbox" v-model="services.electronic_ticket" /> 电子票</label>
      </div>

      <button class="submit-btn" @click="save">保存修改</button>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";

const route = useRoute();
const router = useRouter();

const id = route.params.id;

const form = ref({});
const venues = ref([]);
const artistList = ref([]);
const loaded = ref(false);

// 服务项
const services = ref({
  refundable: false,
  selectable_seats: false,
  real_name_required: false,
  ticket_exchangeable: false,
  electronic_ticket: false
});

onMounted(() => {
  loadVenues();
  loadArtists();
  loadDetail();
  loadBindArtists();
  loadServices();
});

// 场馆
async function loadVenues() {
  const res = await fetch("http://localhost:3000/admin/venues");
  const data = await res.json();
  venues.value = data.data;
}

// 艺人
async function loadArtists() {
  const res = await fetch("http://localhost:3000/admin/artists/simple/list");
  const data = await res.json();
  artistList.value = data.data;
}

// 加载演出基本信息
async function loadDetail() {
  const res = await fetch(`http://localhost:3000/admin/performances/${id}`);
  const data = await res.json();
  form.value = {
  ...form.value,
  ...data.data
};
  loaded.value = true;
}

// 加载演出绑定艺人
async function loadBindArtists() {
  const res = await fetch(`http://localhost:3000/admin/performances/${id}/artists`);
  const data = await res.json();
  form.value.artist_ids = data.data; // array
}

// 加载服务配置
async function loadServices() {
  const res = await fetch(`http://localhost:3000/admin/performances/${id}/services`);
  const data = await res.json();

  services.value = {
    refundable: Boolean(data.data.refundable),
    selectable_seats: Boolean(data.data.selectable_seats),
    real_name_required: Boolean(data.data.real_name_required),
    ticket_exchangeable: Boolean(data.data.ticket_exchangeable),
    electronic_ticket: Boolean(data.data.electronic_ticket)
  };
}

// 上传封面
// 上传封面
async function uploadCover(e) {
  const file = e.target.files[0];
  if (!file) return;

  const fd = new FormData();
  fd.append("file", file);

  const res = await fetch("http://localhost:3000/admin/performances/upload", {
    method: "POST",
    body: fd
  });

  const data = await res.json();
  if (data.status !== 0) {
    alert("封面上传失败");
    return;
  }

  form.value.cover_url = data.url;
}

// 保存
async function save() {
  // 1. 基本信息
  await fetch(`http://localhost:3000/admin/performances/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(form.value)
  });

  // 2. 艺人
  await fetch(`http://localhost:3000/admin/performances/${id}/artists`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ artist_ids: form.value.artist_ids })
  });

  // 3. 服务
  await fetch(`http://localhost:3000/admin/performances/${id}/services`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      refundable: services.value.refundable ? 1 : 0,
      selectable_seats: services.value.selectable_seats ? 1 : 0,
      real_name_required: services.value.real_name_required ? 1 : 0,
      ticket_exchangeable: services.value.ticket_exchangeable ? 1 : 0,
      electronic_ticket: services.value.electronic_ticket ? 1 : 0
    })
  });

  alert("保存成功！");
  router.push("/performance/list");
}
</script>

<style scoped>
.page { padding: 20px; }
.form { display: flex; flex-direction: column; gap: 10px; }
input, select, textarea {
  padding: 8px;
  font-size: 14px;
}
.preview {
  width: 160px;
  border-radius: 4px;
  margin-top: 8px;
}

.service-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.submit-btn {
  width: 120px;
  padding: 10px;
  background: #409eff;
  color: white;
  border: none;
  border-radius: 4px;
}
</style>
