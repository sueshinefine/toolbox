import { onBeforeUnmount, ref } from 'vue'

export function useClipboard(timeout = 1600) {
  const copied = ref(false)
  let timer = null

  async function copy(text) {
    if (!text) return
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text)
      } else {
        const el = document.createElement('textarea')
        el.value = text
        el.style.position = 'fixed'
        el.style.opacity = '0'
        document.body.appendChild(el)
        el.select()
        document.execCommand('copy')
        document.body.removeChild(el)
      }
      copied.value = true
      clearTimeout(timer)
      timer = setTimeout(() => (copied.value = false), timeout)
    } catch (error) {
      console.error('复制失败', error)
    }
  }

  onBeforeUnmount(() => clearTimeout(timer))

  return { copied, copy }
}
