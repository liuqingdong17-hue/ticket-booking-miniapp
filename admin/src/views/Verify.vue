<template>
  <div class="verify-page">
    <h2>扫码核销</h2>

    <div class="actions">
      <button @click="startScan" :disabled="scanning">开始扫码（摄像头）</button>
      <button @click="stopCamera" :disabled="!scanning">停止摄像头</button>

      <!-- ✅ 上传二维码截图识别 -->
      <label class="upload-btn">
        上传二维码图片识别
        <input
          type="file"
          accept="image/*"
          @change="onPickImage"
          style="display:none"
        />
      </label>
    </div>

    <!-- 摄像头预览 -->
    <video ref="video" autoplay playsinline class="camera"></video>

    <!-- 可选：展示上传的图片预览 -->
    <img v-if="previewUrl" :src="previewUrl" class="preview" />

    <div class="result" v-if="message">
      <p :class="success ? 'success' : 'error'">{{ message }}</p>
      <p class="hint" v-if="rawText">识别内容：{{ rawText }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onBeforeUnmount } from 'vue'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { NotFoundException } from '@zxing/library'

const video = ref(null)
const message = ref('')
const success = ref(false)
const scanning = ref(false)

const previewUrl = ref('')
const rawText = ref('')

let codeReader = null

function initReader() {
  if (!codeReader) {
    codeReader = new BrowserMultiFormatReader()
  }
}

/** ✅ 摄像头扫码 */
async function startScan() {
  if (scanning.value) return
  initReader()

  message.value = '请将二维码置于镜头中央...'
  success.value = false
  rawText.value = ''
  previewUrl.value = ''

  try {
    scanning.value = true
    await codeReader.decodeFromVideoDevice(
      null,
      video.value,
      (result, err) => {
        if (!scanning.value) return
        if (result?.getText) {
          handleScanResult(result.getText())
        } else if (err && !(err instanceof NotFoundException)) {
          // 非 NotFound 才打印
          console.warn('decode error:', err)
        }
      }
    )
  } catch (e) {
    console.error(e)
    message.value = '无法打开摄像头（可能未授权或设备占用）'
    success.value = false
    scanning.value = false
  }
}

/** ✅ 停止摄像头 */
function stopCamera() {
  scanning.value = false
  if (codeReader) {
    try { codeReader.reset() } catch (e) {}
  }
  if (video.value) {
    try { video.value.srcObject = null } catch (e) {}
  }
}

/** ✅ 上传图片识别 */
async function onPickImage(e) {
  const file = e.target.files?.[0]
  if (!file) return

  stopCamera()
  initReader()

  success.value = false
  rawText.value = ''
  message.value = '正在识别图片中的二维码...'

  // 预览
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  previewUrl.value = URL.createObjectURL(file)

  try {
    // ✅ 最兼容：直接用图片 URL 让 ZXing 解码
    const result = await codeReader.decodeFromImageUrl(previewUrl.value)
    const text = result?.getText?.() || ''
    if (!text) {
      message.value = '未识别到二维码（请换更清晰的截图）'
      success.value = false
      return
    }
    handleScanResult(text)
  } catch (err) {
    console.error(err)
    message.value = '未识别到二维码（请换更清晰的截图）'
    success.value = false
  } finally {
    e.target.value = ''
  }
}

async function handleScanResult(text) {
  stopCamera()
  rawText.value = text

  const s = String(text)

  let orderId = ''
  const m1 = s.match(/id=(\d+)/)
  if (m1) orderId = m1[1]

  const m2 = s.match(/\/order\/(\d+)/)
  if (!orderId && m2) orderId = m2[1]

  if (!orderId && /^\d+$/.test(s.trim())) orderId = s.trim()

  if (!orderId) {
    message.value = '无效二维码（未解析到订单ID）'
    success.value = false
    return
  }

  message.value = `识别成功：订单ID=${orderId}，正在核销...`
  success.value = false

  try {
    const res = await fetch('http://localhost:3000/api/order/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + localStorage.getItem('admin_token')
      },
      body: JSON.stringify({ order_id: orderId })
    })
    const data = await res.json()
    if (data.status === 0) {
      message.value = '核销成功 ✅'
      success.value = true
    } else {
      message.value = data.message || '核销失败'
      success.value = false
    }
  } catch (e) {
    console.error(e)
    message.value = '请求失败'
    success.value = false
  }
}

onBeforeUnmount(() => {
  stopCamera()
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
})
</script>

<style scoped>
.verify-page {
  padding: 24px;
}

.actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}

/* ✅ 统一三者的“高度/内边距/字体/对齐” */
.actions button,
.actions .upload-btn {
  height: 40px;
  padding: 0 14px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  font-size: 14px;
  font-weight: 500;
  box-sizing: border-box;
  white-space: nowrap;
}

/* ✅ 修复“按钮文字不显示”：强制给颜色 */
.actions button {
  border: 1px solid #d1d5db;
  background: #fff;
  color: #111827;           /* 关键：别再继承到白色/透明 */
  cursor: pointer;
  appearance: none;
  -webkit-appearance: none;
}

.actions button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* ✅ 上传按钮（label）外观和 button 对齐 */
.upload-btn {
  margin-top: 19px;
  border: 1px dashed #94a3b8;
  background: #f8fafc;
  color: #111827;          /* 关键：文字颜色 */
  cursor: pointer;
  user-select: none;
}

/* 可选：hover效果（不影响功能） */
.actions button:hover:not(:disabled),
.upload-btn:hover {
  background: #f3f4f6;
}


.camera {
  width: 100%;
  max-width: 420px;
  border-radius: 12px;
  border: 2px solid #e5e7eb;
  background: #000;
  display: block;
}

.preview {
  margin-top: 12px;
  width: 100%;
  max-width: 420px;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
}

.result {
  margin-top: 16px;
  font-size: 16px;
  font-weight: 600;
}

.hint {
  margin-top: 6px;
  font-size: 12px;
  font-weight: 400;
  color: #64748b;
  word-break: break-all;
}

.success {
  color: #16a34a;
}

.error {
  color: #dc2626;
}
</style>
