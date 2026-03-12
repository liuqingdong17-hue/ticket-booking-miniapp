<template>
  <div class="page">
    <h2>新增艺人</h2>

    <div class="form">
      <label>艺人名称</label>
      <input v-model="form.name" placeholder="请输入艺人名称" />

      <label>头像</label>
      <input type="file" @change="uploadAvatar" />
      <img v-if="form.avatar" :src="form.avatar" class="preview" />

      <label>简介</label>
      <textarea v-model="form.description" rows="4"></textarea>

      <button class="submit-btn" @click="submit">提交</button>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();

const form = ref({
  name: "",
  avatar: "",
  description: ""
});

async function uploadAvatar(e) {
  const file = e.target.files[0];
  if (!file) return;

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
}


async function submit() {
  if (!form.value.name) return alert("请填写艺人名称");

  await fetch("http://localhost:3000/admin/artists", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(form.value)
  });

  alert("新增成功！");
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
