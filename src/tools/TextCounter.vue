<script setup>
import { computed, ref } from 'vue'
import ToolLayout from '../components/ToolLayout.vue'

const text = ref('')

const stats = computed(() => {
  const value = text.value
  return {
    chars: [...value].length,
    charsNoSpace: [...value.replace(/\s/g, '')].length,
    words: value.trim() ? value.trim().split(/\s+/).length : 0,
    lines: value ? value.split(/\r\n|\r|\n/).length : 0,
    cjk: (value.match(/[\u4e00-\u9fa5]/g) || []).length,
    bytes: new TextEncoder().encode(value).length
  }
})

const items = computed(() => [
  { label: '字符数', value: stats.value.chars },
  { label: '字符数（不含空格）', value: stats.value.charsNoSpace },
  { label: '单词数', value: stats.value.words },
  { label: '行数', value: stats.value.lines },
  { label: '汉字数', value: stats.value.cjk },
  { label: 'UTF-8 字节', value: stats.value.bytes }
])
</script>

<template>
  <ToolLayout>
    <div class="stack">
      <div class="grid">
        <div v-for="item in items" :key="item.label" class="stat">
          <span class="stat-value">{{ item.value }}</span>
          <span class="stat-label muted">{{ item.label }}</span>
        </div>
      </div>

      <textarea
        v-model="text"
        class="field textarea"
        spellcheck="false"
        placeholder="在这里输入或粘贴文本，统计结果会实时更新"
      ></textarea>
    </div>
  </ToolLayout>
</template>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 12px 14px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface-soft);
}

.stat-value {
  font-size: 22px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.stat-label {
  font-size: 13px;
}

.textarea {
  min-height: 260px;
}
</style>
