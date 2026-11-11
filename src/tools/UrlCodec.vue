<script setup>
import { ref } from 'vue'
import ToolLayout from '../components/ToolLayout.vue'
import { useClipboard } from '../composables/useClipboard'

const modes = [
  { value: 'encodeURIComponent', label: 'encodeURIComponent（组件编码）' },
  { value: 'encodeURI', label: 'encodeURI（整段 URL 编码）' },
  { value: 'decodeURIComponent', label: 'decodeURIComponent（组件解码）' },
  { value: 'decodeURI', label: 'decodeURI（整段 URL 解码）' }
]

const mode = ref('encodeURIComponent')
const input = ref('')
const output = ref('')
const error = ref('')
const { copied, copy } = useClipboard()

function run() {
  error.value = ''
  try {
    output.value = window[mode.value](input.value)
  } catch (e) {
    output.value = ''
    error.value = '转换失败：输入内容不是该模式下合法的字符串'
  }
}

function swap() {
  input.value = output.value
  mode.value = mode.value.startsWith('encode')
    ? mode.value.replace('encode', 'decode')
    : mode.value.replace('decode', 'encode')
  run()
}
</script>

<template>
  <ToolLayout>
    <div class="stack">
      <div class="row">
        <select v-model="mode" class="field">
          <option v-for="item in modes" :key="item.value" :value="item.value">{{ item.label }}</option>
        </select>
        <button class="btn primary" type="button" @click="run">转换</button>
        <button class="btn" type="button" :disabled="!output" @click="swap">结果 ↕ 输入</button>
        <button class="btn small" type="button" :disabled="!output" @click="copy(output)">
          {{ copied ? '✓ 已复制' : '复制结果' }}
        </button>
      </div>

      <div class="panes">
        <div>
          <label class="field-label" for="url-input">输入</label>
          <textarea
            id="url-input"
            v-model="input"
            class="field mono"
            spellcheck="false"
            placeholder="https://example.com/search?q=你好 世界"
          ></textarea>
        </div>
        <div>
          <label class="field-label" for="url-output">结果</label>
          <textarea
            id="url-output"
            class="field mono"
            readonly
            spellcheck="false"
            :value="output"
            placeholder="结果会显示在这里"
          ></textarea>
        </div>
      </div>

      <p v-if="error" class="error">{{ error }}</p>
    </div>
  </ToolLayout>
</template>
