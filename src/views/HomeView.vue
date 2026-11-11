<script setup>
import { computed, ref } from 'vue'
import { toolGroups, tools } from '../data/tools'
import ToolCard from '../components/ToolCard.vue'

const keyword = ref('')

const groups = computed(() => {
  const key = keyword.value.trim().toLowerCase()
  const isMatch = (tool) =>
    !key ||
    [tool.name, tool.description, tool.id, ...tool.tags]
      .join(' ')
      .toLowerCase()
      .includes(key)

  return toolGroups
    .map((group) => ({
      ...group,
      items: tools.filter((tool) => tool.group === group.key && isMatch(tool))
    }))
    .filter((group) => group.items.length > 0)
})
</script>

<template>
  <div class="container home">
    <section class="hero">
      <div class="badge">共 {{ tools.length }} 个工具</div>
      <h1>常用开发工具，一个页面搞定</h1>
      <p class="muted">全部在浏览器本地运行，输入的内容不会上传到任何服务器。</p>

      <div class="search">
        <span class="search-icon">🔍</span>
        <input
          v-model="keyword"
          class="field search-input"
          type="search"
          placeholder="搜索工具，例如 JSON、时间戳、颜色…"
        />
      </div>
    </section>

    <section v-for="group in groups" :key="group.key" class="group">
      <h2 class="group-title">{{ group.name }}</h2>
      <div class="grid">
        <ToolCard v-for="tool in group.items" :key="tool.id" :tool="tool" />
      </div>
    </section>

    <p v-if="groups.length === 0" class="empty muted">没有找到匹配的工具，换个关键词试试？</p>
  </div>
</template>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  gap: 36px;
}

.hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 28px 0 8px;
  text-align: center;
}

.badge {
  padding: 3px 12px;
  border-radius: 999px;
  background: var(--primary-weak);
  color: var(--primary);
  font-size: 13px;
  font-weight: 600;
}

.hero h1 {
  font-size: clamp(24px, 4vw, 34px);
}

.hero p {
  margin: 0;
  font-size: 15px;
}

.search {
  position: relative;
  width: 100%;
  max-width: 460px;
  margin-top: 14px;
}

.search-icon {
  position: absolute;
  top: 50%;
  left: 14px;
  transform: translateY(-50%);
  font-size: 14px;
  opacity: 0.7;
}

.search-input {
  padding-left: 40px;
  border-radius: 999px;
  box-shadow: var(--shadow);
}

.group {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.group-title {
  padding-left: 10px;
  border-left: 3px solid var(--primary);
  font-size: 16px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 14px;
}

.empty {
  padding: 40px 0;
  text-align: center;
}
</style>
