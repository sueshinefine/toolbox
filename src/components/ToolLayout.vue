<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { getToolById } from '../data/tools'

const route = useRoute()

const tool = computed(
  () => getToolById(route.name) || { name: '工具', description: '', icon: '🧰' }
)
</script>

<template>
  <div class="container tool-page">
    <router-link class="back" to="/">← 返回全部工具</router-link>

    <header class="tool-head">
      <span class="tool-icon">{{ tool.icon }}</span>
      <div>
        <h1>{{ tool.name }}</h1>
        <p class="muted">{{ tool.description }}</p>
      </div>
    </header>

    <section class="card tool-body">
      <slot />
    </section>
  </div>
</template>

<style scoped>
.tool-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.back {
  align-self: flex-start;
  font-size: 14px;
  color: var(--muted);
}

.back:hover {
  color: var(--primary);
}

.tool-head {
  display: flex;
  align-items: center;
  gap: 14px;
}

.tool-icon {
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  border-radius: 12px;
  background: var(--primary-weak);
  font-size: 22px;
}

.tool-head h1 {
  font-size: 22px;
}

.tool-head p {
  margin: 2px 0 0;
  font-size: 14px;
}

.tool-body {
  padding: 22px;
}
</style>
