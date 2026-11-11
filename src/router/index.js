import { createRouter, createWebHashHistory } from 'vue-router'
import { tools } from '../data/tools'
import HomeView from '../views/HomeView.vue'

const toolModules = import.meta.glob('../tools/*.vue')

const routes = [
  { path: '/', name: 'home', component: HomeView, meta: { title: '全部工具' } },
  ...tools.map((tool) => ({
    path: `/tools/${tool.id}`,
    name: tool.id,
    component: toolModules[`../tools/${tool.file}.vue`],
    meta: { title: tool.name }
  })),
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('../views/NotFoundView.vue'),
    meta: { title: '页面不存在' }
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 })
})

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} · 工具箱` : '工具箱'
})

export default router
