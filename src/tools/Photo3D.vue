<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import ToolLayout from '../components/ToolLayout.vue'

const imageSrc = ref('')
const imageName = ref('')
const fileSize = ref(0)
const naturalSize = ref(null)
const errorMsg = ref('')
const previewing = ref(false)

const rotX = ref(0)
const rotY = ref(0)
const zoom = ref(1)
const dragging = ref(false)
const autoRotate = ref(false)
const autoSpeed = ref(28)

const hasImage = computed(() => Boolean(imageSrc.value))

// 卡片宽高比跟随图片，限制在 0.5 ~ 2.2 之间，避免极端比例撑破舞台
const cardAspect = computed(() => {
  if (!naturalSize.value) return 1
  const ratio = naturalSize.value.width / naturalSize.value.height
  return Math.min(2.2, Math.max(0.5, Number(ratio.toFixed(3))))
})

const cardStyle = computed(() => ({ '--aspect': cardAspect.value }))

const sceneStyle = computed(() => ({
  transform: `rotateX(${rotX.value.toFixed(2)}deg) rotateY(${rotY.value.toFixed(2)}deg)`,
  transition: dragging.value || autoRotate.value ? 'none' : 'transform 0.55s cubic-bezier(0.22, 0.68, 0.36, 1)'
}))

const sizeLabel = computed(() => {
  if (!fileSize.value) return ''
  const kb = fileSize.value / 1024
  return kb >= 1024 ? `${(kb / 1024).toFixed(2)} MB` : `${Math.max(1, Math.round(kb))} KB`
})

const angleLabel = computed(() => {
  const y = Math.round(((rotY.value % 360) + 360) % 360)
  return `X ${Math.round(rotX.value)}° · Y ${y}°`
})

let lastPoint = null
let rafId = 0
let lastTs = 0

onMounted(() => {
  window.addEventListener('paste', onPaste)
  window.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('paste', onPaste)
  window.removeEventListener('keydown', onKeydown)
  stopDrag()
  stopLoop()
})

function onPaste(event) {
  const items = event.clipboardData?.items
  if (!items) return
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      const file = item.getAsFile()
      if (file) {
        event.preventDefault()
        loadFile(file)
      }
      return
    }
  }
}

function loadFile(file) {
  if (!file) return
  if (!file.type.startsWith('image/')) {
    errorMsg.value = '请选择图片文件'
    return
  }
  errorMsg.value = ''
  imageName.value = file.name || '粘贴的图片'
  fileSize.value = file.size || 0

  const reader = new FileReader()
  reader.onload = () => {
    imageSrc.value = reader.result
    resetView()
    probeSize(reader.result)
  }
  reader.readAsDataURL(file)
}

function probeSize(src) {
  const img = new Image()
  img.onload = () => {
    naturalSize.value = { width: img.naturalWidth, height: img.naturalHeight }
  }
  img.src = src
}

function onFileChange(event) {
  loadFile(event.target.files?.[0])
  event.target.value = ''
}

function onDrop(event) {
  const file = event.dataTransfer?.files?.[0]
  if (file) loadFile(file)
}

function clearImage() {
  exitPreview()
  imageSrc.value = ''
  imageName.value = ''
  fileSize.value = 0
  naturalSize.value = null
  errorMsg.value = ''
}

function startPreview() {
  if (!hasImage.value) return
  resetView()
  previewing.value = true
}

function exitPreview() {
  previewing.value = false
  autoRotate.value = false
  stopLoop()
  resetView()
}

function resetView() {
  rotX.value = 0
  rotY.value = 0
  zoom.value = 1
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function turn(deg) {
  rotY.value += deg
}

function flip() {
  rotY.value += 180
}

function setAngle(x, y) {
  rotX.value = x
  rotY.value = y
}

function onWheel(event) {
  zoom.value = clamp(zoom.value * (event.deltaY > 0 ? 0.92 : 1.08), 0.45, 2.4)
}

function onPointerDown(event) {
  if (event.pointerType === 'mouse' && event.button !== 0) return
  dragging.value = true
  lastPoint = { x: event.clientX, y: event.clientY, rotX: rotX.value, rotY: rotY.value }
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', stopDrag)
  window.addEventListener('pointercancel', stopDrag)
}

function onPointerMove(event) {
  if (!lastPoint) return
  rotY.value = lastPoint.rotY + (event.clientX - lastPoint.x) * 0.45
  rotX.value = clamp(lastPoint.rotX - (event.clientY - lastPoint.y) * 0.45, -90, 90)
}

function stopDrag() {
  dragging.value = false
  lastPoint = null
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', stopDrag)
  window.removeEventListener('pointercancel', stopDrag)
}

function step(ts) {
  if (!lastTs) lastTs = ts
  const dt = Math.min(0.1, (ts - lastTs) / 1000)
  lastTs = ts
  if (!dragging.value) rotY.value += autoSpeed.value * dt
  rafId = requestAnimationFrame(step)
}

function startLoop() {
  stopLoop()
  lastTs = 0
  rafId = requestAnimationFrame(step)
}

function stopLoop() {
  if (rafId) cancelAnimationFrame(rafId)
  rafId = 0
}

watch(autoRotate, (on) => {
  if (on && previewing.value) startLoop()
  else stopLoop()
})

function onKeydown(event) {
  if (event.key === 'Escape' && previewing.value) exitPreview()
}
</script>

<template>
  <ToolLayout>
    <div class="stack">
      <input ref="fileInput" type="file" accept="image/*" hidden @change="onFileChange" />

      <div
        v-if="!hasImage"
        class="drop-zone"
        tabindex="0"
        role="button"
        @click="$refs.fileInput.click()"
        @keydown.enter="$refs.fileInput.click()"
        @dragover.prevent
        @drop.prevent="onDrop"
      >
        <span class="drop-icon">🧊</span>
        <p>点击选择本地照片，或将照片拖拽到此处</p>
        <p class="muted small">也可以直接 Ctrl / ⌘ + V 粘贴剪贴板中的图片</p>
      </div>

      <template v-else>
        <div class="row source-bar">
          <span class="source-name" :title="imageName">{{ imageName }}</span>
          <span v-if="naturalSize" class="muted small">
            {{ naturalSize.width }} × {{ naturalSize.height }}
          </span>
          <span v-if="sizeLabel" class="muted small">{{ sizeLabel }}</span>
          <span class="spacer"></span>
          <button class="btn small" type="button" @click="$refs.fileInput.click()">
            更换照片
          </button>
          <button v-if="!previewing" class="btn small" type="button" @click="startPreview">
            预览
          </button>
          <button class="btn small" type="button" @click="clearImage">清除</button>
        </div>

        <p v-if="errorMsg" class="error">{{ errorMsg }}</p>

        <div v-if="!previewing" class="entry">
          <div class="entry-thumb">
            <img :src="imageSrc" alt="照片预览" />
          </div>
          <div class="entry-text">
            <p class="entry-title">照片已就绪</p>
            <p class="muted small">
              点击预览进入 3D 空间：拖拽旋转到任意角度、滚轮缩放、一键翻面查看照片背面。
            </p>
          </div>
          <button class="btn primary preview-btn" type="button" @click="startPreview">预览</button>
        </div>

        <template v-else>
          <div class="stage" @wheel.prevent="onWheel">
            <div class="zoom" :style="{ transform: `scale(${zoom})` }">
              <div
                class="scene"
                :class="{ dragging }"
                :style="[sceneStyle, cardStyle]"
                @pointerdown="onPointerDown"
                @dblclick="resetView"
              >
                <div class="face front">
                  <img :src="imageSrc" alt="照片正面" draggable="false" />
                </div>
                <div class="face back">
                  <img :src="imageSrc" alt="照片背面" draggable="false" />
                  <span class="face-tag">背面</span>
                </div>
              </div>
            </div>
            <span class="angle mono">{{ angleLabel }}</span>
          </div>

          <p class="muted small hint">拖拽旋转 · 滚轮缩放 · 双击复位 · Esc 退出预览</p>

          <div class="row controls">
            <button class="btn small" type="button" @click="turn(-90)">↺ 左转 90°</button>
            <button class="btn small" type="button" @click="turn(90)">↻ 右转 90°</button>
            <button class="btn small" type="button" @click="flip">⇄ 翻面 180°</button>
            <button class="btn small" type="button" @click="setAngle(-55, 0)">俯视</button>
            <button class="btn small" type="button" @click="setAngle(0, 0)">正面</button>
            <button class="btn small" type="button" @click="resetView">重置</button>
            <span class="spacer"></span>
            <label class="check">
              <input v-model="autoRotate" type="checkbox" />
              自动旋转
            </label>
            <label class="speed">
              <span class="muted small">速度</span>
              <input v-model.number="autoSpeed" type="range" min="6" max="90" step="2" />
            </label>
            <button class="btn small" type="button" @click="exitPreview">退出预览</button>
          </div>
        </template>
      </template>
    </div>
  </ToolLayout>
</template>

<style scoped>
.drop-zone {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 52px 20px;
  border: 2px dashed var(--border);
  border-radius: var(--radius);
  background: var(--surface-soft);
  text-align: center;
  cursor: pointer;
  transition: border-color 0.15s ease, background-color 0.15s ease;
}

.drop-zone:hover,
.drop-zone:focus-visible {
  border-color: var(--primary);
  background: var(--primary-weak);
  outline: none;
}

.drop-zone p {
  margin: 0;
}

.drop-icon {
  font-size: 34px;
}

.small {
  font-size: 13px;
}

.source-bar {
  align-items: center;
}

.source-name {
  max-width: 260px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
  font-weight: 600;
}

.spacer {
  flex: 1;
}

.entry {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface-soft);
}

.entry-thumb {
  flex-shrink: 0;
  width: 84px;
  height: 84px;
  border-radius: 10px;
  overflow: hidden;
  background: var(--surface);
}

.entry-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.entry-text {
  flex: 1;
  min-width: 0;
}

.entry-title {
  margin: 0 0 2px;
  font-size: 15px;
  font-weight: 600;
}

.entry-text p:last-child {
  margin: 0;
}

.preview-btn {
  flex-shrink: 0;
  padding: 10px 30px;
}

.stage {
  position: relative;
  display: grid;
  place-items: center;
  min-height: 340px;
  height: min(56vh, 520px);
  padding: 18px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: radial-gradient(circle at 50% 45%, var(--surface-soft) 0%, transparent 72%);
  perspective: 1300px;
  overflow: hidden;
  touch-action: none;
  user-select: none;
}

.zoom {
  transform-style: preserve-3d;
  transition: transform 0.2s ease;
}

.scene {
  position: relative;
  width: min(86vw, 460px, calc(400px * var(--aspect)), calc(46vh * var(--aspect)));
  aspect-ratio: var(--aspect);
  transform-style: preserve-3d;
  cursor: grab;
}

.scene.dragging {
  cursor: grabbing;
}

.face {
  position: absolute;
  inset: 0;
  overflow: hidden;
  border-radius: 10px;
  background: var(--surface);
  backface-visibility: hidden;
  box-shadow: 0 24px 50px -26px rgba(0, 0, 0, 0.65);
}

.face img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  pointer-events: none;
}

.face::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    118deg,
    rgba(255, 255, 255, 0.3) 0%,
    rgba(255, 255, 255, 0) 42%,
    rgba(0, 0, 0, 0.14) 100%
  );
  pointer-events: none;
}

.face.back {
  transform: rotateY(180deg);
}

.face.back img {
  transform: scaleX(-1);
}

.face-tag {
  position: absolute;
  right: 8px;
  bottom: 8px;
  padding: 1px 8px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: 12px;
  line-height: 1.6;
}

.angle {
  position: absolute;
  left: 12px;
  bottom: 10px;
  font-size: 12px;
  color: var(--muted);
}

.hint {
  margin: 0;
}

.controls {
  align-items: center;
  gap: 8px;
}

.speed {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.speed input[type='range'] {
  width: 96px;
  accent-color: var(--primary);
}

@media (max-width: 720px) {
  .entry {
    flex-wrap: wrap;
  }

  .preview-btn {
    width: 100%;
  }

  .controls {
    row-gap: 10px;
  }
}
</style>
