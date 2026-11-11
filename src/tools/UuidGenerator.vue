<script setup>
import { onMounted, ref } from 'vue'
import ToolLayout from '../components/ToolLayout.vue'
import { useClipboard } from '../composables/useClipboard'

const count = ref(5)
const uppercase = ref(false)
const removeDash = ref(false)
const list = ref([])
const { copied, copy } = useClipboard()

function uuidv4() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0
    const value = char === 'x' ? random : (random & 0x3) | 0x8
    return value.toString(16)
  })
}

function format(uuid) {
  let result = uuid
  if (removeDash.value) result = result.replace(/-/g, '')
  if (uppercase.value) result = result.toUpperCase()
  return result
}

function generate() {
  const total = Math.max(1, Math.min(50, Number(count.value) || 1))
  list.value = Array.from({ length: total }, () => format(uuidv4()))
}

function copyAll() {
  copy(list.value.join('\n'))
}

onMounted(generate)
</script>

<template>
  <ToolLayout>
    <div class="stack">
      <div class="row">
        <label class="check">
          数量
          <input v-model.number="count" class="field count" type="number" min="1" max="50" />
        </label>
        <label class="check"><input v-model="uppercase" type="checkbox" />大写</label>
        <label class="check"><input v-model="removeDash" type="checkbox" />去掉连字符</label>
        <button class="btn primary" type="button" @click="generate">重新生成</button>
        <button class="btn" type="button" @click="copyAll">{{ copied ? '✓ 已复制' : '复制全部' }}</button>
      </div>

      <ul class="list">
        <li v-for="item in list" :key="item" class="item">
          <code class="mono">{{ item }}</code>
          <button class="btn small" type="button" @click="copy(item)">复制</button>
        </li>
      </ul>
    </div>
  </ToolLayout>
</template>

<style scoped>
.count {
  width: 76px;
  padding: 6px 8px;
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
</style>
