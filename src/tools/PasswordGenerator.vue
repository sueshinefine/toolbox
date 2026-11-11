<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import ToolLayout from '../components/ToolLayout.vue'
import { useClipboard } from '../composables/useClipboard'

const SETS = {
  upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lower: 'abcdefghijklmnopqrstuvwxyz',
  number: '0123456789',
  symbol: '!@#$%^&*()-_=+[]{};:,.?/'
}
const SIMILAR = /[il1Lo0O]/g

const length = ref(16)
const useUpper = ref(true)
const useLower = ref(true)
const useNumber = ref(true)
const useSymbol = ref(false)
const excludeSimilar = ref(true)
const passwords = ref([])
const { copied, copy } = useClipboard()

function randomInt(max) {
  const buffer = new Uint32Array(1)
  crypto.getRandomValues(buffer)
  return buffer[0] % max
}

const pool = computed(() => {
  let chars = ''
  if (useUpper.value) chars += SETS.upper
  if (useLower.value) chars += SETS.lower
  if (useNumber.value) chars += SETS.number
  if (useSymbol.value) chars += SETS.symbol
  if (excludeSimilar.value) chars = chars.replace(SIMILAR, '')
  return chars
})

const strength = computed(() => {
  const size = pool.value.length
  if (size < 2) return { label: '无法生成', level: 0 }
  const entropy = length.value * Math.log2(size)
  if (entropy < 40) return { label: '较弱', level: 1 }
  if (entropy < 60) return { label: '一般', level: 2 }
  if (entropy < 80) return { label: '较强', level: 3 }
  return { label: '很强', level: 4 }
})

function generate() {
  if (!pool.value) {
    passwords.value = []
    return
  }
  passwords.value = Array.from({ length: 3 }, () =>
    Array.from({ length: length.value }, () => pool.value[randomInt(pool.value.length)]).join('')
  )
}

watch([length, useUpper, useLower, useNumber, useSymbol, excludeSimilar], generate)
onMounted(generate)
</script>

<template>
  <ToolLayout>
    <div class="stack">
      <div class="row">
        <label class="check">
          长度
          <input v-model.number="length" class="field length" type="range" min="4" max="64" />
          <strong class="length-value">{{ length }}</strong>
        </label>
        <span class="strength" :data-level="strength.level">强度：{{ strength.label }}</span>
      </div>

      <div class="options">
        <label class="check"><input v-model="useUpper" type="checkbox" />大写字母</label>
        <label class="check"><input v-model="useLower" type="checkbox" />小写字母</label>
        <label class="check"><input v-model="useNumber" type="checkbox" />数字</label>
        <label class="check"><input v-model="useSymbol" type="checkbox" />特殊符号</label>
        <label class="check"><input v-model="excludeSimilar" type="checkbox" />排除易混淆字符 il1Lo0O</label>
      </div>

      <button class="btn primary" type="button" @click="generate">重新生成</button>

      <ul v-if="passwords.length" class="list">
        <li v-for="item in passwords" :key="item" class="item">
          <code class="mono">{{ item }}</code>
          <button class="btn small" type="button" @click="copy(item)">复制</button>
        </li>
      </ul>
      <p v-else class="error">请至少选择一种字符类型</p>

      <p class="muted tip">{{ copied ? '已复制到剪贴板' : '密码仅在本地生成，不会被保存或上传' }}</p>
    </div>
  </ToolLayout>
</template>

<style scoped>
.length {
  width: 180px;
  padding: 0;
  border: none;
  background: transparent;
  accent-color: var(--primary);
}

.length-value {
  min-width: 22px;
  color: var(--primary);
}

.strength {
  padding: 2px 10px;
  border-radius: 999px;
  background: var(--surface-soft);
  font-size: 13px;
}

.strength[data-level='1'] {
  color: var(--danger);
}

.strength[data-level='2'] {
  color: #d97706;
}

.strength[data-level='3'],
.strength[data-level='4'] {
  color: var(--success);
}

.options {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface-soft);
  font-size: 13px;
  word-break: break-all;
}

.tip {
  margin: 0;
  font-size: 13px;
}
</style>
