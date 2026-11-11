<script setup>
import { ref, watch } from 'vue'
import ToolLayout from '../components/ToolLayout.vue'
import { useClipboard } from '../composables/useClipboard'

const algorithms = ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512']

const text = ref('')
const algorithm = ref('SHA-256')
const result = ref('')
const error = ref('')
const { copied, copy } = useClipboard()

async function compute() {
  error.value = ''
  result.value = ''

  if (!text.value) return

  if (!window.crypto?.subtle) {
    error.value = '当前浏览器环境不支持 Web Crypto，请使用 HTTPS 或 localhost 访问'
    return
  }

  try {
    const data = new TextEncoder().encode(text.value)
    const buffer = await window.crypto.subtle.digest(algorithm.value, data)
    result.value = Array.from(new Uint8Array(buffer))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('')
  } catch (e) {
    error.value = '计算失败：' + e.message
  }
}

watch([text, algorithm], compute, { immediate: true })
</script>

<template>
  <ToolLayout>
    <div class="stack">
      <div class="row">
        <select v-model="algorithm" class="field">
          <option v-for="item in algorithms" :key="item" :value="item">{{ item }}</option>
        </select>
        <button class="btn small" type="button" :disabled="!result" @click="copy(result)">
          {{ copied ? '✓ 已复制' : '复制摘要' }}
        </button>
      </div>

      <div>
        <label class="field-label" for="hash-input">输入文本</label>
        <textarea
          id="hash-input"
          v-model="text"
          class="field"
          spellcheck="false"
          placeholder="输入任意文本，摘要会自动计算"
        ></textarea>
      </div>

      <div>
        <span class="field-label">摘要（十六进制）</span>
        <p class="hash mono">{{ result || '—' }}</p>
      </div>

      <p v-if="error" class="error">{{ error }}</p>
    </div>
  </ToolLayout>
</template>

<style scoped>
.hash {
  margin: 0;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface-soft);
  font-size: 13px;
  word-break: break-all;
}
</style>
