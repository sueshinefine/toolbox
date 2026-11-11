import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './styles/main.css'

const saved = localStorage.getItem('toolbox-theme')
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
document.documentElement.dataset.theme = saved || (prefersDark ? 'dark' : 'light')

createApp(App).use(router).mount('#app')
