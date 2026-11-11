import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  // 相对路径，配合 hash 路由可部署在任意子路径
  base: './',
  plugins: [vue()],
  server: {
    port: 5173,
    open: true
  },
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 800
  }
})
