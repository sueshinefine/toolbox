<script setup>
defineProps({
  tool: {
    type: Object,
    required: true
  }
})
</script>

<template>
  <router-link class="tool-card card" :to="{ name: tool.id }">
    <span class="icon">{{ tool.icon }}</span>
    <h3 class="name">{{ tool.name }}</h3>
    <p class="desc muted">{{ tool.description }}</p>
    <div class="tags">
      <span v-for="tag in tool.tags" :key="tag" class="tag">{{ tag }}</span>
    </div>
  </router-link>
</template>

<style scoped>
.tool-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 18px;
  transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
}

.tool-card:hover {
  transform: translateY(-3px);
  border-color: var(--primary);
  box-shadow: 0 12px 28px -18px rgba(79, 70, 229, 0.6);
}

.icon {
  font-size: 22px;
  line-height: 1;
}

.name {
  font-size: 16px;
}

.desc {
  margin: 0;
  font-size: 13.5px;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 4px;
}

.tag {
  padding: 1px 8px;
  border-radius: 999px;
  background: var(--surface-soft);
  color: var(--muted);
  font-size: 12px;
}
</style>
