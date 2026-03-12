<template>
  <div class="page">
    <h2>编辑艺人</h2>

    <div class="form" v-if="loaded">
      <label>艺人名称</label>
      <input v-model="form.name" />

      <label>头像</label>
      <input type="file" @change="uploadAvatar" />
      <img v-if="form.avatar" :src="form.avatar" class="preview" />

      <label>简介</label>
      <textarea v-model="form.description" rows="4"></textarea>

      <button class="submit-btn" @click="save">保存</button>
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
const loaded = ref(false);
const uploading = ref(false);

onMounted(loadDetail);

async function loadDetail() {
  const res = await fetch(`http://localhost:3000/admin/artists/${id}`);
  const data = await res.json();
  form.value = data.data;
  loaded.value = true;
}

async function uploadAvatar(e) {
  const file = e.target.files[0];
  if (!file) return;

  uploading.value = true;

  const fd = new FormData();
  fd.append("file", file);

  const res = await fetch("http://localhost:3000/admin/artists/upload", {
    method: "POST",
    body: fd
  });

  const data = await res.json();

  if (data.status === 0) {
    form.value.avatar = data.url;
  } else {
    alert("上传失败");
  }

  uploading.value = false;
}

async function save() {
  if (uploading.value) {
    alert("图片正在上传，请稍等");
    return;
  }

  await fetch(`http://localhost:3000/admin/artists/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(form.value)
  });

  alert("保存成功！");
  router.push("/artist/list");
}

</script>

<style scoped>
.page { padding: 20px; }
.form { display: flex; flex-direction: column; gap: 12px; }

input, textarea {
  padding: 8px;
  font-size: 14px;
}

.preview {
  width: 120px;
  margin-top: 8px;
  border-radius: 8px;
}

.submit-btn {
  width: 120px;
  padding: 10px;
  background: #409eff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
</style>
