<template>
  <div class="container not-found">
    <h1>404</h1>
    <p class="muted">页面走丢了，去首页看看有哪些工具吧。</p>
    <router-link class="btn primary" to="/">返回首页</router-link>
  </div>
</template>

<style scoped>
.not-found {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 80px 0;
}

.not-found h1 {
  font-size: 56px;
  letter-spacing: 2px;
}
</style>
