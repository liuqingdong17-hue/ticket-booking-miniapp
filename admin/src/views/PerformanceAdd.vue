<template>
  <div class="page">
    <h2>新增演出</h2>

    <div class="form">

      <!-- 名称 -->
      <label>演出名称</label>
      <input v-model="form.name" placeholder="填写演出名称" />

      <!-- 分类 -->
      <label>分类</label>
      <input v-model="form.category" placeholder="如：演唱会 / 音乐会 / 话剧" />

      <!-- 城市 -->
      <label>城市</label>
      <input v-model="form.city" placeholder="如：上海、北京" />

      <!-- 场馆 -->
      <label>场馆</label>
      <select v-model="form.venue_id">
        <option disabled value="">请选择场馆</option>
        <option v-for="v in venues" :key="v.id" :value="v.id">{{ v.name }}</option>
      </select>

      <!-- 艺人选择 -->
      <label>艺人（可多选）</label>
      <select v-model="form.artist_ids" multiple>
        <option v-for="a in artistList" :key="a.id" :value="a.id">
          {{ a.name }}
        </option>
      </select>

      <!-- 封面上传 -->
      <label>封面图</label>
      <input type="file" @change="uploadCover" />
      <img v-if="form.cover_url" :src="form.cover_url" class="preview" />

      <!-- 简介 -->
      <label>简介</label>
      <textarea v-model="form.description" rows="4"></textarea>

      <button class="submit-btn" @click="submit">提交</button>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();

const form = ref({
  name: "",
  category: "",
  city: "",
  venue_id: "",
  cover_url: "",
  description: "",
  artist_ids: [] // ⭐支持多艺人
});

const venues = ref([]);
const artistList = ref([]);

onMounted(() => {
  loadVenues();
  loadArtists();
});

// 加载场馆
async function loadVenues() {
  const res = await fetch("http://localhost:3000/admin/venues");
  const data = await res.json();
  venues.value = data.data || [];
}

// 加载艺人
async function loadArtists() {
  const res = await fetch("http://localhost:3000/admin/artists/simple/list");
  const data = await res.json();
  artistList.value = data.data || [];
}

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


// 提交
async function submit() {
  if (!form.value.name) return alert("请填写演出名称");

  // ① 新增演出
  const res = await fetch("http://localhost:3000/admin/performances", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(form.value)
  });

  const data = await res.json();
  if (data.status !== 0) return alert("新增失败");

  // 演出ID
  const newId = data.insertId || data.id || data.data?.id;

  // ② 绑定艺人
  await fetch(`http://localhost:3000/admin/performances/${newId}/artists`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ artist_ids: form.value.artist_ids })
  });

  alert("新增成功！");
  router.push("/performance/list");
}
</script>

<style scoped>
.page { padding: 20px; }
.form { display: flex; flex-direction: column; gap: 12px; }
input, select, textarea {
  padding: 8px;
  font-size: 14px;
}
.preview {
  width: 160px;
  border-radius: 6px;
  margin-top: 8px;
}
.submit-btn {
  width: 120px;
  padding: 10px;
  background: #409eff;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
</style>
