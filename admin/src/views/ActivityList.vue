<template>
  <div class="page">
    <h2>活动管理</h2>

    <div class="toolbar">
      <button @click="startCreate">新增活动</button>
    </div>

    <!-- 活动列表 -->
    <table class="data-table" v-if="list.length">
      <thead>
        <tr>
          <th>ID</th>
          <th>标题</th>
          <th>封面</th>
          <th>时间</th>
          <th>状态</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="act in list" :key="act.id">
          <td>{{ act.id }}</td>
          <td>{{ act.title }}</td>
          <td>
            <img v-if="act.cover_image" :src="act.cover_image" class="thumb" />
          </td>
          <td>
            {{ format(act.start_time) }} ~ {{ format(act.end_time) }}
          </td>
          <td>
            <span :class="act.status ? 'tag-on' : 'tag-off'">
              {{ act.status ? '上架' : '下架' }}
            </span>
          </td>
          <td>
            <button @click="startEdit(act)">编辑</button>
            <button @click="openCouponDialog(act)">绑定优惠券</button>
            <button class="danger" @click="remove(act)">删除</button>
          </td>
        </tr>
      </tbody>
    </table>

    <p v-else>暂无活动</p>

    <!-- 编辑区域 -->
    <div v-if="editing" class="edit-panel">
      <h3>{{ editing.id ? '编辑活动' : '新增活动' }}</h3>
      <div class="form-row">
        <label>标题：</label>
        <input v-model="editing.title" />
      </div>
      <div class="form-row">
        <label>封面</label>
        <input type="file" @change="uploadCover" />
        <img
          v-if="editing.cover_image"
          :src="editing.cover_image"
          class="thumb"
        />
        <!-- ⭐ 上传按钮
        <input type="file" @change="uploadCover" style="width:150px" /> -->
      </div>

      <div class="form-row">
        <label>简介：</label>
        <textarea v-model="editing.description" rows="2" />
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
        <label>状态：</label>
        <select v-model.number="editing.status">
          <option :value="1">上架</option>
          <option :value="0">下架</option>
        </select>
      </div>
      <div class="form-row">
        <label>详情 HTML：</label>
        <textarea v-model="editing.detail_content" rows="5" />
      </div>
      <div class="form-actions">
        <button @click="save">保存</button>
        <button @click="cancelEdit">取消</button>
      </div>
    </div>

    <!-- 绑定优惠券弹层 -->
    <div v-if="couponDialog.visible" class="dialog-mask">
      <div class="dialog">
        <h3>活动 {{ couponDialog.activity?.title }} - 绑定优惠券</h3>

        <div v-if="allCoupons.length">
          <label
            v-for="c in allCoupons"
            :key="c.id"
            class="checkbox-row"
          >
            <input
              type="checkbox"
              :value="c.id"
              v-model="couponDialog.selectedIds"
            />
            {{ c.title }}（{{ couponText(c) }}）
          </label>
        </div>
        <p v-else>暂无可用优惠券</p>

        <div class="dialog-actions">
          <button @click="saveActivityCoupons">保存</button>
          <button @click="closeCouponDialog">关闭</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'

const list = ref([])
const editing = ref(null)

const couponDialog = reactive({
  visible: false,
  activity: null,
  selectedIds: []
})
const allCoupons = ref([])

function format(t) {
  if (!t) return ''
  return t.slice(0, 16).replace('T', ' ')
}

async function loadList() {
  const res = await fetch('http://localhost:3000/admin/activities/list', {
    headers: {
      Authorization: 'Bearer ' + localStorage.getItem('admin_token')
    }
  })
  const data = await res.json()
  if (data.status === 0) {
    list.value = data.data
  }
}

async function uploadCover(e) {
  const file = e.target.files[0]
  if (!file) return

  const fd = new FormData()
  fd.append('file', file)

  const res = await fetch(
    'http://localhost:3000/admin/activities/upload',
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
    editing.value.cover_image = data.url
    alert('上传成功')
  } else {
    alert(data.message || '上传失败')
  }
}

function startCreate() {
  editing.value = {
    id: null,
    title: '',
    cover_image: '',
    description: '',
    start_time: '',
    end_time: '',
    status: 1,
    detail_content: ''
  }
}

function startEdit(act) {
  editing.value = { ...act, detail_content: act.detail_content || '' }
}

function cancelEdit() {
  editing.value = null
}

async function save() {
  const url = editing.value.id
    ? `http://localhost:3000/admin/activities/update/${editing.value.id}`
    : 'http://localhost:3000/admin/activities/create'

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

async function remove(act) {
  if (!confirm(`确认删除活动「${act.title}」？`)) return
  const res = await fetch(
    `http://localhost:3000/admin/activities/delete/${act.id}`,
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

// ========= 绑定优惠券 =========
function couponText(c) {
  if (c.discount_type === 1) {
    return `满${c.min_amount}减${c.discount_value}`
  }
  if (c.discount_type === 2) {
    return `${Number(c.discount_value) * 10}折`
  }
  return ''
}

async function openCouponDialog(act) {
  couponDialog.visible = true
  couponDialog.activity = act
  couponDialog.selectedIds = []

  // 取所有优惠券
  const res1 = await fetch('http://localhost:3000/admin/coupons/list', {
    headers: {
      Authorization: 'Bearer ' + localStorage.getItem('admin_token')
    }
  })
  const data1 = await res1.json()
  if (data1.status === 0) {
    allCoupons.value = data1.data
  }

  // 取当前活动已绑定的 coupon_ids
  const res2 = await fetch(
    `http://localhost:3000/admin/activities/${act.id}/coupons`,
    {
      headers: {
        Authorization: 'Bearer ' + localStorage.getItem('admin_token')
      }
    }
  )
  const data2 = await res2.json()
  if (data2.status === 0) {
    couponDialog.selectedIds = data2.data
  }
}

function closeCouponDialog() {
  couponDialog.visible = false
  couponDialog.activity = null
  couponDialog.selectedIds = []
}

async function saveActivityCoupons() {
  const actId = couponDialog.activity.id
  const res = await fetch(
    `http://localhost:3000/admin/activities/${actId}/coupons/save`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + localStorage.getItem('admin_token')
      },
      body: JSON.stringify({
        coupon_ids: couponDialog.selectedIds
      })
    }
  )
  const data = await res.json()
  if (data.status === 0) {
    alert('保存成功')
    closeCouponDialog()
  } else {
    alert(data.message || '保存失败')
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
  width: 80px;
  height: 40px;
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
.form-row textarea,
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
.dialog-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
}
.dialog {
  background: #fff;
  padding: 16px;
  border-radius: 6px;
  width: 400px;
  max-height: 500px;
  overflow-y: auto;
}
.checkbox-row {
  display: block;
  margin-bottom: 6px;
}
.dialog-actions {
  margin-top: 12px;
  text-align: right;
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}
</style>
