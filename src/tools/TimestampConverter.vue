<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import ToolLayout from '../components/ToolLayout.vue'
import { useClipboard } from '../composables/useClipboard'

const pad = (value) => String(value).padStart(2, '0')

function formatDate(date) {
  const y = date.getFullYear()
  const m = pad(date.getMonth() + 1)
  const d = pad(date.getDate())
  const hh = pad(date.getHours())
  const mm = pad(date.getMinutes())
  const ss = pad(date.getSeconds())
  return `${y}-${m}-${d} ${hh}:${mm}:${ss}`
}

function toLocalInput(date) {
  const y = date.getFullYear()
  const m = pad(date.getMonth() + 1)
  const d = pad(date.getDate())
  const hh = pad(date.getHours())
  const mm = pad(date.getMinutes())
  return `${y}-${m}-${d}T${hh}:${mm}`
}

const now = ref(Date.now())
let timer = null

onMounted(() => {
  timer = setInterval(() => (now.value = Date.now()), 1000)
})

onBeforeUnmount(() => clearInterval(timer))

const nowSeconds = computed(() => Math.floor(now.value / 1000))
const nowText = computed(() => formatDate(new Date(now.value)))

const tsInput = ref(String(Math.floor(Date.now() / 1000)))
const tsResult = computed(() => {
  const raw = tsInput.value.trim()
  if (!raw) return null
  const num = Number(raw)
  if (!Number.isFinite(num)) return { error: '请输入数字时间戳' }
  const ms = Math.abs(num) < 1e12 ? num * 1000 : num
  const date = new Date(ms)
  if (Number.isNaN(date.getTime())) return { error: '时间戳超出可解析范围' }
  return {
    local: formatDate(date),
    utc: date.toUTCString(),
    iso: date.toISOString()
  }
})

const dateInput = ref(toLocalInput(new Date()))
const dateResult = computed(() => {
  if (!dateInput.value) return null
  const date = new Date(dateInput.value)
  if (Number.isNaN(date.getTime())) return null
  return {
    seconds: Math.floor(date.getTime() / 1000),
    milliseconds: date.getTime()
  }
})

const { copied, copy } = useClipboard()
</script>

<template>
  <ToolLayout>
    <div class="stack">
      <section class="block">
        <h3 class="block-title">当前时间</h3>
        <div class="row">
          <code class="code">{{ nowText }}</code>
          <button class="btn small" type="button" @click="copy(String(nowSeconds))">
            {{ copied ? '✓ 秒：' + nowSeconds : '秒：' + nowSeconds }}
          </button>
          <button class="btn small" type="button" @click="copy(String(now))">
            毫秒：{{ now }}
          </button>
        </div>
      </section>

      <section class="block">
        <h3 class="block-title">时间戳 → 日期</h3>
        <input
          v-model="tsInput"
          class="field"
          type="text"
          inputmode="numeric"
          placeholder="例如 1700000000，自动识别秒 / 毫秒"
        />
        <template v-if="tsResult">
          <p v-if="tsResult.error" class="error">{{ tsResult.error }}</p>
          <ul v-else class="result-list">
            <li><span class="label">本地时间</span><code class="code">{{ tsResult.local }}</code></li>
            <li><span class="label">UTC</span><code class="code">{{ tsResult.utc }}</code></li>
            <li><span class="label">ISO 8601</span><code class="code">{{ tsResult.iso }}</code></li>
          </ul>
        </template>
      </section>

      <section class="block">
        <h3 class="block-title">日期 → 时间戳</h3>
        <input v-model="dateInput" class="field" type="datetime-local" step="1" />
        <ul v-if="dateResult" class="result-list">
          <li><span class="label">秒级</span><code class="code">{{ dateResult.seconds }}</code></li>
          <li><span class="label">毫秒级</span><code class="code">{{ dateResult.milliseconds }}</code></li>
        </ul>
      </section>
    </div>
  </ToolLayout>
</template>

<style scoped>
.block {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-bottom: 18px;
  border-bottom: 1px dashed var(--border);
}

.block:last-child {
  padding-bottom: 0;
  border-bottom: none;
}

.block-title {
  font-size: 14px;
  color: var(--muted);
}

.code {
  padding: 3px 8px;
  border-radius: 6px;
  background: var(--surface-soft);
  font-family: var(--font-mono);
  font-size: 13px;
}

.result-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.result-list li {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.label {
  min-width: 72px;
  color: var(--muted);
  font-size: 13px;
}
</style>
