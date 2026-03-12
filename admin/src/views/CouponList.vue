<template>
  <div class="page">
    <h2>优惠券管理</h2>

    <div class="toolbar">
      <button @click="startCreate">新增优惠券</button>
    </div>

    <table class="data-table" v-if="list.length">
      <thead>
        <tr>
          <th>ID</th>
          <th>名称</th>
          <th>类型</th>
          <th>面值/折扣</th>
          <th>门槛</th>
          <th>有效期</th>
          <th>库存</th>
          <th>状态</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="c in list" :key="c.id">
          <td>{{ c.id }}</td>
          <td>{{ c.title }}</td>
          <td>{{ c.discount_type === 1 ? '满减券' : '折扣券' }}</td>
          <td>
            <span v-if="c.discount_type === 1">
              减 {{ c.discount_value }}
            </span>
            <span v-else>
              {{ Number(c.discount_value) * 10 }} 折
            </span>
          </td>
          <td>{{ c.min_amount }}</td>
          <td>{{ format(c.start_time) }} ~ {{ format(c.end_time) }}</td>
          <td>{{ c.stock }}</td>
          <td>
            <span :class="c.status ? 'tag-on' : 'tag-off'">
              {{ c.status ? '上架' : '下架' }}
            </span>
          </td>
          <td>
            <button @click="startEdit(c)">编辑</button>
            <button class="danger" @click="remove(c)">删除</button>
          </td>
        </tr>
      </tbody>
    </table>

    <p v-else>暂无优惠券</p>

    <div v-if="editing" class="edit-panel">
      <h3>{{ editing.id ? '编辑优惠券' : '新增优惠券' }}</h3>

      <div class="form-row">
        <label>名称：</label>
        <input v-model="editing.title" />
      </div>
      <div class="form-row">
        <label>类型：</label>
        <select v-model.number="editing.discount_type">
          <option :value="1">满减券</option>
          <option :value="2">折扣券</option>
        </select>
      </div>
      <div class="form-row">
        <label>面值/折扣：</label>
        <input v-model.number="editing.discount_value" type="number" step="0.01" />
      </div>
      <div class="form-row">
        <label>满减门槛：</label>
        <input v-model.number="editing.min_amount" type="number" step="0.01" />
      </div>
      <div class="form-row">
        <label>开始时间：</label>
        <input v-model="editing.start_time" type="datetime-local" />
      </div>
      <div class="form-row">
        <label>结束时间：</label>
        <input v-model="editing.end_time" type="datetime-local" />
      </div>
      <div class="form-row">
        <label>库存：</label>
        <input v-model.number="editing.stock" type="number" />
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
  const res = await fetch('http://localhost:3000/admin/coupons/list', {
    headers: {
      Authorization: 'Bearer ' + localStorage.getItem('admin_token')
    }
  })
  const data = await res.json()
  if (data.status === 0) {
    list.value = data.data
  }
}

function startCreate() {
  editing.value = {
    id: null,
    title: '',
    discount_type: 1,
    discount_value: 0,
    min_amount: 0,
    start_time: '',
    end_time: '',
    stock: 0,
    status: 1
  }
}

function startEdit(c) {
  editing.value = { ...c }
}

function cancelEdit() {
  editing.value = null
}

async function save() {
  const url = editing.value.id
    ? `http://localhost:3000/admin/coupons/update/${editing.value.id}`
    : 'http://localhost:3000/admin/coupons/create'

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

async function remove(c) {
  if (!confirm(`确认删除优惠券「${c.title}」？`)) return
  const res = await fetch(
    `http://localhost:3000/admin/coupons/delete/${c.id}`,
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
