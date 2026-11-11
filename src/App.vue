<script setup>
import { ref } from 'vue'

const theme = ref(document.documentElement.dataset.theme || 'light')

function toggleTheme() {
  theme.value = theme.value === 'dark' ? 'light' : 'dark'
  document.documentElement.dataset.theme = theme.value
  localStorage.setItem('toolbox-theme', theme.value)
}
</script>

<template>
  <div class="app">
    <header class="app-header">
      <div class="container header-inner">
        <router-link class="brand" to="/">
          <span class="brand-mark">T</span>
          <span class="brand-text">工具箱</span>
        </router-link>
        <router-link class="nav-link" to="/">全部工具</router-link>
        <button
          class="theme-btn"
          type="button"
          :aria-label="theme === 'dark' ? '切换浅色模式' : '切换深色模式'"
          @click="toggleTheme"
        >
          {{ theme === 'dark' ? '☀️' : '🌙' }}
        </button>
      </div>
    </header>

    <main class="app-main">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>

    <footer class="app-footer">
      <div class="container">纯前端工具集 · 所有数据仅在浏览器本地处理</div>
    </footer>
  </div>
</template>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.app-header {
  position: sticky;
  top: 0;
  z-index: 20;
  border-bottom: 1px solid var(--border);
  background: var(--bg);
  background: color-mix(in srgb, var(--bg) 88%, transparent);
  backdrop-filter: blur(10px);
}

.header-inner {
  display: flex;
  align-items: center;
  gap: 16px;
  height: 60px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 9px;
  font-weight: 700;
}

.brand-mark {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 9px;
  background: var(--primary);
  color: #fff;
  font-size: 15px;
}

.nav-link {
  margin-left: auto;
  font-size: 14px;
  color: var(--muted);
}

.nav-link:hover,
.nav-link.router-link-exact-active {
  color: var(--primary);
}

.theme-btn {
  width: 34px;
  height: 34px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface);
  cursor: pointer;
  font-size: 15px;
  line-height: 1;
}

.app-main {
  flex: 1;
  padding: 32px 0 56px;
}

.app-footer {
  padding: 20px 0 28px;
  border-top: 1px solid var(--border);
  color: var(--muted);
  font-size: 13px;
  text-align: center;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.16s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
