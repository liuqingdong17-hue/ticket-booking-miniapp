<template>
  <div class="page">
    <h2>轮播图管理</h2>

    <div class="toolbar">
      <button @click="startCreate">新增 Banner</button>
    </div>

    <table class="data-table" v-if="list.length">
      <thead>
        <tr>
          <th>ID</th>
          <th>图片</th>
          <th>类型</th>
          <th>跳转值</th>
          <th>排序</th>
          <th>状态</th>
          <th>创建时间</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="b in list" :key="b.id">
          <td>{{ b.id }}</td>
          <td>
            <img :src="b.image_url" class="thumb" />
          </td>
          <td>{{ b.link_type }}</td>
          <td>{{ b.link_value }}</td>
          <td>{{ b.sort_order }}</td>
          <td>
            <span :class="b.status ? 'tag-on' : 'tag-off'">
              {{ b.status ? '上架' : '下架' }}
            </span>
          </td>
          <td>{{ format(b.created_at) }}</td>
          <td>
            <button @click="startEdit(b)">编辑</button>
            <button class="danger" @click="remove(b)">删除</button>
          </td>
        </tr>
      </tbody>
    </table>

    <p v-else>暂无 Banner</p>

    <div v-if="editing" class="edit-panel">
      <h3>{{ editing.id ? '编辑 Banner' : '新增 Banner' }}</h3>

      <div class="form-row">
        <label>图片</label>
        <input type="file" @change="uploadBanner" />
        <img
          v-if="editing.image_url"
          :src="editing.image_url"
          class="thumb"
        />

      </div>
      <div class="form-row">
        <label>跳转类型：</label>
        <select v-model="editing.link_type">
          <option value="performance">演出详情</option>
          <option value="activity">活动详情</option>
        </select>
      </div>
      <div class="form-row">
        <label>跳转值：</label>
        <input
          v-model="editing.link_value"
          placeholder="对应的演出ID / 活动ID"
        />
      </div>
      <div class="form-row">
        <label>排序：</label>
        <input v-model.number="editing.sort_order" type="number" />
      </div>
      <div class="form-row">
        <label>状态：</label>
        <select v-model.number="editing.status">
          <option :value="1">上架</option>
          <option :value="0">下架</option>
        </select>
      </div>
      <div class="form-actions">
        <button @click="save">保存</button>
        <button @click="cancelEdit">取消</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const list = ref([])
const editing = ref(null)

function format(t) {
  if (!t) return ''
  return t.slice(0, 16).replace('T', ' ')
}

async function loadList() {
  const res = await fetch('http://localhost:3000/admin/banners/list', {
    headers: {
      Authorization: 'Bearer ' + localStorage.getItem('admin_token')
    }
  })
  const data = await res.json()
  if (data.status === 0) {
    list.value = data.data
  }
}

async function uploadBanner(e) {
  const file = e.target.files[0]
  if (!file) return

  const fd = new FormData()
  fd.append('file', file)

  const res = await fetch(
    'http://localhost:3000/admin/banners/upload',
    {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + localStorage.getItem('admin_token')
      },
      body: fd
    }
  )

  const data = await res.json()

  if (data.status === 0) {
    editing.value.image_url = data.url
    alert('上传成功')
  } else {
    alert(data.message || '上传失败')
  }
}

function startCreate() {
  editing.value = {
    id: null,
    image_url: '',
    link_type: 'performance',
    link_value: '',
    sort_order: 0,
    status: 1
  }
}

function startEdit(b) {
  editing.value = { ...b }
}

function cancelEdit() {
  editing.value = null
}

async function save() {
  const url = editing.value.id
    ? `http://localhost:3000/admin/banners/update/${editing.value.id}`
    : 'http://localhost:3000/admin/banners/create'

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + localStorage.getItem('admin_token')
    },
    body: JSON.stringify(editing.value)
  })
  const data = await res.json()
  if (data.status === 0) {
    alert('保存成功')
    editing.value = null
    loadList()
  } else {
    alert(data.message || '保存失败')
  }
}

async function remove(b) {
  if (!confirm('确认删除该 Banner？')) return
  const res = await fetch(
    `http://localhost:3000/admin/banners/delete/${b.id}`,
    {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + localStorage.getItem('admin_token')
      }
    }
  )
  const data = await res.json()
  if (data.status === 0) {
    alert('删除成功')
    loadList()
  } else {
    alert(data.message || '删除失败')
  }
}

onMounted(loadList)
</script>

<style scoped>
.page {
  padding: 20px;
}
.toolbar {
  margin-bottom: 10px;
}
.data-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 16px;
}
.data-table th,
.data-table td {
  border: 1px solid #ddd;
  padding: 8px;
  font-size: 14px;
}
.thumb {
  width: 100px;
  height: 50px;
  object-fit: cover;
}
.tag-on {
  color: #16a34a;
}
.tag-off {
  color: #999;
}
.edit-panel {
  margin-top: 16px;
  padding: 12px;
  background: #fff;
  border-radius: 6px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
}
.form-row {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}
.form-row label {
  width: 90px;
}
.form-row input,
.form-row select {
  flex: 1;
  padding: 6px 8px;
  font-size: 14px;
}
.form-actions {
  display: flex;
  gap: 10px;
  margin-top: 8px;
}
button {
  padding: 6px 12px;
  font-size: 13px;
  cursor: pointer;
}
button.danger {
  color: #b91c1c;
}
</style>
