<script setup>
import { ref } from 'vue'
import ToolLayout from '../components/ToolLayout.vue'
import { useClipboard } from '../composables/useClipboard'

const plain = ref('')
const encoded = ref('')
const urlSafe = ref(false)
const error = ref('')
const { copied, copy } = useClipboard()

function encodeBase64(text) {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  const base64 = btoa(binary)
  if (!urlSafe.value) return base64
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function decodeBase64(text) {
  let value = text.trim().replace(/\s/g, '')
  if (urlSafe.value) value = value.replace(/-/g, '+').replace(/_/g, '/')
  const remainder = value.length % 4
  if (remainder) value += '='.repeat(4 - remainder)
  const binary = atob(value)
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

function encode() {
  error.value = ''
  try {
    encoded.value = encodeBase64(plain.value)
  } catch (e) {
    error.value = '编码失败：' + e.message
  }
}

function decode() {
  error.value = ''
  try {
    plain.value = decodeBase64(encoded.value)
  } catch (e) {
    error.value = '解码失败，请检查输入是否为合法的 Base64 字符串'
  }
}
</script>

<template>
  <ToolLayout>
    <div class="stack">
      <label class="check">
        <input v-model="urlSafe" type="checkbox" />
        使用 URL 安全字符（- 和 _，去掉末尾等号）
      </label>

      <div class="panes">
        <div>
          <label class="field-label" for="b64-plain">原始文本</label>
          <textarea
            id="b64-plain"
            v-model="plain"
            class="field"
            spellcheck="false"
            placeholder="输入要编码的文本"
          ></textarea>
        </div>
        <div>
          <label class="field-label" for="b64-encoded">Base64</label>
          <textarea
            id="b64-encoded"
            v-model="encoded"
            class="field mono"
            spellcheck="false"
            placeholder="输入要解码的 Base64"
          ></textarea>
        </div>
      </div>

      <div class="row">
        <button class="btn primary" type="button" @click="encode">文本 → Base64</button>
        <button class="btn" type="button" @click="decode">Base64 → 文本</button>
        <button class="btn small" type="button" :disabled="!encoded" @click="copy(encoded)">
          {{ copied ? '✓ 已复制' : '复制 Base64' }}
        </button>
      </div>

      <p v-if="error" class="error">{{ error }}</p>
    </div>
  </ToolLayout>
</template>
