<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import ToolLayout from '../components/ToolLayout.vue'
import { useClipboard } from '../composables/useClipboard'

const { copied, copy } = useClipboard()

const colorCount = ref(8)
const dotRadius = ref(1.4)
const minCoverage = ref(1)

const imageSrc = ref('')
const imageName = ref('')
const naturalSize = ref(null)
const colors = ref([])
const processing = ref(false)
const errorMsg = ref('')
const justCopied = ref('')

const hasImage = computed(() => Boolean(imageSrc.value))
const hasResult = computed(() => colors.value.length > 0)

const minPixelCount = computed(() =>
  Math.max(4, Math.round((minCoverage.value / 100) * 40000))
)

onMounted(() => window.addEventListener('paste', onPaste))
onBeforeUnmount(() => window.removeEventListener('paste', onPaste))

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
  if (!file.type.startsWith('image/')) {
    errorMsg.value = '请选择图片文件'
    return
  }
  errorMsg.value = ''
  colors.value = []
  imageName.value = file.name || '粘贴的图片'
  const reader = new FileReader()
  reader.onload = () => {
    imageSrc.value = reader.result
    probeSize(reader.result)
  }
  reader.readAsDataURL(file)
}

function probeSize(src) {
  const img = new Image()
  img.onload = () => (naturalSize.value = { width: img.naturalWidth, height: img.naturalHeight })
  img.src = src
}

function onDrop(event) {
  const file = event.dataTransfer?.files?.[0]
  if (file) loadFile(file)
}

function reset() {
  imageSrc.value = ''
  imageName.value = ''
  naturalSize.value = null
  colors.value = []
  errorMsg.value = ''
}

async function analyze() {
  if (!imageSrc.value || processing.value) return
  processing.value = true
  errorMsg.value = ''
  try {
    colors.value = await extractColors(imageSrc.value, colorCount.value)
    if (!colors.value.length) {
      errorMsg.value = '未能识别出有效颜色，请更换图片或调低占比阈值'
    }
  } catch (error) {
    console.error('识别失败', error)
    errorMsg.value = '图片解析失败，请更换图片重试'
  } finally {
    processing.value = false
  }
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

function rgbToHex({ r, g, b }) {
  const toHex = (value) =>
    Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0')
  return '#' + [r, g, b].map(toHex).join('')
}

function luminance({ r, g, b }) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

async function extractColors(src, count) {
  const img = await loadImage(src)
  const maxSide = 200
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight))
  const width = Math.max(1, Math.round(img.naturalWidth * scale))
  const height = Math.max(1, Math.round(img.naturalHeight * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(img, 0, 0, width, height)
  const data = ctx.getImageData(0, 0, width, height).data

  // 按 5bit 量化聚合像素，记录出现次数与位置累计
  const buckets = new Map()
  let opaqueCount = 0
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      if (data[i + 3] < 128) continue
      opaqueCount++
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3)
      let bucket = buckets.get(key)
      if (!bucket) {
        bucket = { count: 0, r: 0, g: 0, b: 0, x: 0, y: 0 }
        buckets.set(key, bucket)
      }
      bucket.count++
      bucket.r += r
      bucket.g += g
      bucket.b += b
      bucket.x += x
      bucket.y += y
    }
  }
  if (!opaqueCount) return []

  // 以出现次数最多的桶作为初始中心，做 k-means 聚类
  const seeds = [...buckets.values()].sort((a, b) => b.count - a.count)
  let centers = seeds
    .slice(0, count)
    .map((s) => ({ r: s.r / s.count, g: s.g / s.count, b: s.b / s.count }))
  if (!centers.length) return []

  let clusters = []
  for (let iter = 0; iter < 8; iter++) {
    clusters = centers.map((center) => ({ ...center, count: 0, sumX: 0, sumY: 0 }))
    for (const bucket of buckets.values()) {
      const br = bucket.r / bucket.count
      const bg = bucket.g / bucket.count
      const bb = bucket.b / bucket.count
      let best = 0
      let bestDist = Infinity
      for (let c = 0; c < clusters.length; c++) {
        const center = clusters[c]
        const dist = (br - center.r) ** 2 + (bg - center.g) ** 2 + (bb - center.b) ** 2
        if (dist < bestDist) {
          bestDist = dist
          best = c
        }
      }
      const cluster = clusters[best]
      cluster.count += bucket.count
      cluster.sumX += bucket.x
      cluster.sumY += bucket.y
      cluster.r = (cluster.r * (cluster.count - bucket.count) + br * bucket.count) / cluster.count
      cluster.g = (cluster.g * (cluster.count - bucket.count) + bg * bucket.count) / cluster.count
      cluster.b = (cluster.b * (cluster.count - bucket.count) + bb * bucket.count) / cluster.count
    }
    const nextCenters = clusters
      .filter((cluster) => cluster.count > 0)
      .map((cluster) => ({ r: cluster.r, g: cluster.g, b: cluster.b }))
    if (!nextCenters.length) break
    const converged =
      nextCenters.length === centers.length &&
      nextCenters.every(
        (center, index) => Math.abs(center.r - centers[index].r) < 0.5 &&
          Math.abs(center.g - centers[index].g) < 0.5 &&
          Math.abs(center.b - centers[index].b) < 0.5
      )
    centers = nextCenters
    if (converged) break
  }

  const results = clusters
    .filter((cluster) => cluster.count >= minPixelCount.value)
    .map((cluster) => {
      const rgb = {
        r: Math.round(cluster.r),
        g: Math.round(cluster.g),
        b: Math.round(cluster.b)
      }
      return {
        hex: rgbToHex(rgb),
        rgb,
        percent: ((cluster.count / opaqueCount) * 100).toFixed(1),
        left: ((cluster.sumX / cluster.count / width) * 100).toFixed(2),
        top: ((cluster.sumY / cluster.count / height) * 100).toFixed(2),
        textOnColor: luminance(rgb) > 150 ? '#171a20' : '#ffffff'
      }
    })
    .sort((a, b) => b.percent - a.percent)

  // 让标注点在图上分布更开：与已保留点过近的丢弃
  const kept = []
  for (const item of results) {
    const tooClose = kept.some(
      (k) => Math.hypot(k.left - item.left, k.top - item.top) < 6 && k.hex === item.hex
    )
    if (!tooClose) kept.push(item)
  }
  return kept
}

async function copyColor(hex) {
  await copy(hex)
  justCopied.value = hex
  setTimeout(() => {
    if (justCopied.value === hex) justCopied.value = ''
  }, 1200)
}
</script>

<template>
  <ToolLayout>
    <div class="stack">
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
        <span class="drop-icon">🖼️</span>
        <p>点击选择本地图片，或将图片拖拽到此处</p>
        <p class="muted small">也可以直接 Ctrl / ⌘ + V 粘贴剪贴板中的图片</p>
        <input
          ref="fileInput"
          type="file"
          accept="image/*"
          hidden
          @change="loadFile($event.target.files[0])"
        />
      </div>

      <template v-else>
        <div class="row source-bar">
          <span class="source-name" :title="imageName">{{ imageName }}</span>
          <span v-if="naturalSize" class="muted small">
            {{ naturalSize.width }} × {{ naturalSize.height }}
          </span>
          <span class="spacer"></span>
          <button class="btn small" type="button" @click="$refs.fileInput.click()">更换图片</button>
          <button class="btn small" type="button" @click="reset">清除</button>
          <input
            ref="fileInput"
            type="file"
            accept="image/*"
            hidden
            @change="loadFile($event.target.files[0])"
          />
        </div>

        <div class="row options">
          <label class="option">
            <span class="field-label">标注数量</span>
            <input v-model.number="colorCount" class="field num" type="number" min="2" max="16" />
          </label>
          <label class="option">
            <span class="field-label">标注点大小（%）</span>
            <input v-model.number="dotRadius" class="field num" type="number" min="0.6" max="4" step="0.2" />
          </label>
          <label class="option">
            <span class="field-label">最小占比（%）</span>
            <input v-model.number="minCoverage" class="field num" type="number" min="0" max="20" step="0.5" />
          </label>
          <button class="btn primary identify" type="button" :disabled="processing" @click="analyze">
            {{ processing ? '识别中…' : '识别' }}
          </button>
        </div>

        <p v-if="errorMsg" class="error">{{ errorMsg }}</p>

        <div v-if="hasResult" class="result-wrap">
          <div class="canvas-frame">
            <img class="result-img" :src="imageSrc" alt="识别结果" />
            <button
              v-for="item in colors"
              :key="item.hex + item.left + item.top"
              class="marker"
              type="button"
              :style="{
                left: item.left + '%',
                top: item.top + '%',
                width: dotRadius * 2 + '%',
                paddingBottom: dotRadius * 2 + '%',
                background: item.hex,
                borderColor: item.textOnColor
              }"
              :title="`点击复制 ${item.hex}`"
              @click="copyColor(item.hex)"
            >
              <span class="marker-label" :style="{ background: item.hex, color: item.textOnColor }">
                {{ justCopied === item.hex ? '✓ 已复制' : item.hex }}
              </span>
            </button>
          </div>

          <ul class="color-list">
            <li v-for="item in colors" :key="item.hex + item.percent">
              <button
                class="color-chip"
                type="button"
                :style="{ background: item.hex }"
                :title="`点击复制 ${item.hex}`"
                @click="copyColor(item.hex)"
              ></button>
              <code class="mono">{{ item.hex }}</code>
              <span class="muted small">rgb({{ item.rgb.r }}, {{ item.rgb.g }}, {{ item.rgb.b }})</span>
              <span class="muted small percent">{{ item.percent }}%</span>
              <button class="btn small" type="button" @click="copyColor(item.hex)">
                {{ justCopied === item.hex ? '✓' : '复制' }}
              </button>
            </li>
          </ul>
          <p v-if="copied" class="muted small">已复制到剪贴板</p>
        </div>
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

.options {
  align-items: flex-end;
}

.option {
  display: flex;
  flex-direction: column;
}

.option .field-label {
  margin-bottom: 4px;
}

.num {
  width: 110px;
  padding: 7px 10px;
}

.identify {
  margin-left: auto;
  padding: 9px 26px;
}

.result-wrap {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.canvas-frame {
  position: relative;
  display: inline-block;
  align-self: flex-start;
  max-width: 100%;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  line-height: 0;
}

.result-img {
  display: block;
  max-width: 100%;
  height: auto;
}

.marker {
  position: absolute;
  height: 0;
  padding: 0;
  border: 2px solid;
  border-radius: 50%;
  cursor: pointer;
  transform: translate(-50%, -50%);
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.35);
  transition: transform 0.12s ease;
}

.marker:hover {
  transform: translate(-50%, -50%) scale(1.15);
  z-index: 2;
}

.marker-label {
  position: absolute;
  left: 50%;
  bottom: calc(100% + 6px);
  transform: translateX(-50%);
  padding: 2px 8px;
  border-radius: 6px;
  font-family: var(--font-mono);
  font-size: 12px;
  line-height: 1.5;
  white-space: nowrap;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
}

.color-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.color-list li {
  display: flex;
  align-items: center;
  gap: 10px;
}

.color-chip {
  width: 26px;
  height: 26px;
  flex-shrink: 0;
  border: 1px solid var(--border);
  border-radius: 7px;
  cursor: pointer;
}

.color-list code {
  font-size: 13px;
  min-width: 66px;
}

.percent {
  margin-left: auto;
}

@media (max-width: 720px) {
  .identify {
    margin-left: 0;
  }
}
</style>
