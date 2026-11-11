<script setup>
import { ref } from 'vue'
import ToolLayout from '../components/ToolLayout.vue'
import { useClipboard } from '../composables/useClipboard'

const input = ref('')
const output = ref('')
const error = ref('')
const indent = ref(2)
const { copied, copy } = useClipboard()

function sortKeys(value) {
  if (Array.isArray(value)) return value.map(sortKeys)
  if (value && typeof value === 'object') {
    return Object.keys(value)
      .sort()
      .reduce((acc, key) => {
        acc[key] = sortKeys(value[key])
        return acc
      }, {})
  }
  return value
}

function run(mode) {
  error.value = ''
  if (!input.value.trim()) {
    output.value = ''
    return
  }
  try {
    const data = JSON.parse(input.value)
    if (mode === 'minify') {
      output.value = JSON.stringify(data)
    } else {
      const target = mode === 'sort' ? sortKeys(data) : data
      output.value = JSON.stringify(target, null, indent.value)
    }
  } catch (e) {
    output.value = ''
    error.value = e.message
  }
}

function clearAll() {
  input.value = ''
  output.value = ''
  error.value = ''
}
</script>

<template>
  <ToolLayout>
    <div class="stack">
      <div class="row">
        <button class="btn primary" type="button" @click="run('format')">格式化</button>
        <button class="btn" type="button" @click="run('minify')">压缩</button>
        <button class="btn" type="button" @click="run('sort')">格式化并排序键名</button>
        <select v-model.number="indent" class="field">
          <option :value="2">2 空格缩进</option>
          <option :value="4">4 空格缩进</option>
        </select>
        <button class="btn" type="button" @click="clearAll">清空</button>
      </div>

      <div class="panes">
        <div>
          <label class="field-label" for="json-input">输入</label>
          <textarea
            id="json-input"
            v-model="input"
            class="field"
            spellcheck="false"
            placeholder='粘贴 JSON，例如 {"name":"toolbox","list":[1,2,3]}'
          ></textarea>
        </div>
        <div>
          <label class="field-label" for="json-output">结果</label>
          <textarea
            id="json-output"
            class="field mono"
            readonly
            spellcheck="false"
            :value="output"
            placeholder="结果会显示在这里"
          ></textarea>
        </div>
      </div>

      <p v-if="error" class="error">JSON 解析失败：{{ error }}</p>

      <div class="row">
        <button class="btn small" type="button" :disabled="!output" @click="copy(output)">
          {{ copied ? '✓ 已复制' : '复制结果' }}
        </button>
      </div>
    </div>
  </ToolLayout>
</template>
