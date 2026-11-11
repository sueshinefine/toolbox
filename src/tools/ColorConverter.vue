<script setup>
import { computed, ref } from 'vue'
import ToolLayout from '../components/ToolLayout.vue'
import { useClipboard } from '../composables/useClipboard'

const input = ref('#4f46e5')
const { copied, copy } = useClipboard()

function hexToRgb(value) {
  let hex = value.replace('#', '').trim()
  if (hex.length === 3) {
    hex = hex
      .split('')
      .map((char) => char + char)
      .join('')
  }
  if (!/^[0-9a-f]{6}$/i.test(hex)) return null
  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16)
  }
}

function rgbToHex({ r, g, b }) {
  const toHex = (value) => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0')
  return '#' + [r, g, b].map(toHex).join('')
}

function rgbToHsl({ r, g, b }) {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  let h = 0
  let s = 0

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0)
    else if (max === gn) h = (bn - rn) / d + 2
    else h = (rn - gn) / d + 4
    h *= 60
  }

  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) }
}

function hslToRgb(h, s, l) {
  const sn = s / 100
  const ln = l / 100
  const k = (n) => (n + h / 30) % 12
  const a = sn * Math.min(ln, 1 - ln)
  const f = (n) => ln - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return {
    r: Math.round(f(0) * 255),
    g: Math.round(f(8) * 255),
    b: Math.round(f(4) * 255)
  }
}

const rgb = computed(() => {
  const value = input.value.trim()

  const hex = hexToRgb(value)
  if (hex) return hex

  const rgbMatch = value.match(/^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i)
  if (rgbMatch) {
    return { r: +rgbMatch[1], g: +rgbMatch[2], b: +rgbMatch[3] }
  }

  const hslMatch = value.match(/^hsla?\(\s*([\d.]+)[,\s]+([\d.]+)%[,\s]+([\d.]+)%/i)
  if (hslMatch) {
    return hslToRgb(+hslMatch[1], +hslMatch[2], +hslMatch[3])
  }

  return null
})

const result = computed(() => {
  if (!rgb.value) return null
  const { r, g, b } = rgb.value
  const hsl = rgbToHsl(rgb.value)
  return [
    { label: 'HEX', value: rgbToHex(rgb.value) },
    { label: 'RGB', value: `rgb(${r}, ${g}, ${b})` },
    { label: 'HSL', value: `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)` }
  ]
})

const palette = ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6', '#111827']

function pick(color) {
  input.value = color
}
</script>

<template>
  <ToolLayout>
    <div class="stack">
      <div class="row">
        <input
          v-model="input"
          class="field color-input"
          type="text"
          placeholder="#4f46e5 / rgb(79, 70, 229) / hsl(243, 75%, 59%)"
        />
        <input
          class="picker"
          type="color"
          :value="rgb ? rgbToHex(rgb) : '#000000'"
          @input="input = $event.target.value"
        />
      </div>

      <div v-if="result" class="preview" :style="{ background: result[0].value }"></div>
      <p v-else class="error">无法识别该颜色值，支持 HEX、RGB、HSL 三种格式</p>

      <ul v-if="result" class="result-list">
        <li v-for="item in result" :key="item.label">
          <span class="label">{{ item.label }}</span>
          <code class="code">{{ item.value }}</code>
          <button class="btn small" type="button" @click="copy(item.value)">
            {{ copied ? '✓' : '复制' }}
          </button>
        </li>
      </ul>

      <div class="palette">
        <button
          v-for="color in palette"
          :key="color"
          class="swatch"
          type="button"
          :style="{ background: color }"
          :title="color"
          @click="pick(color)"
        ></button>
      </div>
    </div>
  </ToolLayout>
</template>

<style scoped>
.color-input {
  flex: 1;
  min-width: 220px;
}

.picker {
  width: 46px;
  height: 40px;
  padding: 2px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface);
  cursor: pointer;
}

.preview {
  height: 96px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.result-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.result-list li {
  display: flex;
  align-items: center;
  gap: 10px;
}

.label {
  min-width: 44px;
  color: var(--muted);
  font-size: 13px;
}

.code {
  flex: 1;
  padding: 5px 10px;
  border-radius: 8px;
  background: var(--surface-soft);
  font-family: var(--font-mono);
  font-size: 13px;
}

.palette {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.swatch {
  width: 30px;
  height: 30px;
  border: 1px solid var(--border);
  border-radius: 8px;
  cursor: pointer;
}
</style>
