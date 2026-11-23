<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import ToolLayout from '../components/ToolLayout.vue'

const FORECAST_API = 'https://api.open-meteo.com/v1/forecast'
const ARCHIVE_API = 'https://archive-api.open-meteo.com/v1/archive'
const GEO_API = 'https://geocoding-api.open-meteo.com/v1/search'
const DAILY_FIELDS = 'temperature_2m_max,temperature_2m_min,weather_code'
const STORAGE_KEY = 'toolbox-weather-prefs'

const PRESET_CITIES = [
  { id: 'beijing', name: '北京', region: '北京', lat: 39.9042, lon: 116.4074 },
  { id: 'shanghai', name: '上海', region: '上海', lat: 31.2304, lon: 121.4737 },
  { id: 'guangzhou', name: '广州', region: '广东', lat: 23.1291, lon: 113.2644 },
  { id: 'shenzhen', name: '深圳', region: '广东', lat: 22.5431, lon: 114.0579 },
  { id: 'hangzhou', name: '杭州', region: '浙江', lat: 30.2741, lon: 120.1551 },
  { id: 'nanjing', name: '南京', region: '江苏', lat: 32.0603, lon: 118.7969 },
  { id: 'suzhou', name: '苏州', region: '江苏', lat: 31.2989, lon: 120.5853 },
  { id: 'chengdu', name: '成都', region: '四川', lat: 30.5728, lon: 104.0668 },
  { id: 'chongqing', name: '重庆', region: '重庆', lat: 29.563, lon: 106.5516 },
  { id: 'wuhan', name: '武汉', region: '湖北', lat: 30.5928, lon: 114.3055 },
  { id: 'xian', name: '西安', region: '陕西', lat: 34.3416, lon: 108.9398 },
  { id: 'tianjin', name: '天津', region: '天津', lat: 39.3434, lon: 117.3616 },
  { id: 'zhengzhou', name: '郑州', region: '河南', lat: 34.7466, lon: 113.6254 },
  { id: 'changsha', name: '长沙', region: '湖南', lat: 28.2282, lon: 112.9388 },
  { id: 'qingdao', name: '青岛', region: '山东', lat: 36.0671, lon: 120.3826 },
  { id: 'shenyang', name: '沈阳', region: '辽宁', lat: 41.8057, lon: 123.4315 },
  { id: 'harbin', name: '哈尔滨', region: '黑龙江', lat: 45.8038, lon: 126.535 },
  { id: 'kunming', name: '昆明', region: '云南', lat: 25.0389, lon: 102.7183 },
  { id: 'xiamen', name: '厦门', region: '福建', lat: 24.4798, lon: 118.0894 },
  { id: 'urumqi', name: '乌鲁木齐', region: '新疆', lat: 43.8256, lon: 87.6168 },
  { id: 'lhasa', name: '拉萨', region: '西藏', lat: 29.652, lon: 91.1721 },
  { id: 'haikou', name: '海口', region: '海南', lat: 20.044, lon: 110.1999 }
]

const WEATHER_CODES = {
  0: ['晴', '☀️'],
  1: ['晴间多云', '🌤️'],
  2: ['多云', '⛅'],
  3: ['阴', '☁️'],
  45: ['雾', '🌫️'],
  48: ['雾凇', '🌫️'],
  51: ['小毛毛雨', '🌦️'],
  53: ['毛毛雨', '🌦️'],
  55: ['大毛毛雨', '🌦️'],
  56: ['冻毛毛雨', '🌧️'],
  57: ['强冻毛毛雨', '🌧️'],
  61: ['小雨', '🌧️'],
  63: ['中雨', '🌧️'],
  65: ['大雨', '🌧️'],
  66: ['冻雨', '🌧️'],
  67: ['强冻雨', '🌧️'],
  71: ['小雪', '🌨️'],
  73: ['中雪', '🌨️'],
  75: ['大雪', '🌨️'],
  77: ['雪粒', '❄️'],
  80: ['阵雨', '🌦️'],
  81: ['强阵雨', '🌦️'],
  82: ['暴雨', '⛈️'],
  85: ['阵雪', '🌨️'],
  86: ['强阵雪', '🌨️'],
  95: ['雷阵雨', '⛈️'],
  96: ['雷阵雨伴冰雹', '⛈️'],
  99: ['强雷暴伴冰雹', '⛈️']
}

const METRICS = [
  { key: 'max', label: '最高温' },
  { key: 'min', label: '最低温' },
  { key: 'avg', label: '平均温' }
]

const YEAR_COLORS = [
  '#0ea5e9',
  '#f59e0b',
  '#10b981',
  '#ef4444',
  '#a855f7',
  '#14b8a6',
  '#f97316',
  '#ec4899',
  '#84cc16',
  '#64748b'
]

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
const PAD = { top: 24, right: 18, bottom: 34, left: 44 }
const CHART_W = 760
const CHART_H = 270

const pad = (value) => String(value).padStart(2, '0')
const toISO = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
const toNumber = (value) => (typeof value === 'number' && Number.isFinite(value) ? value : null)

function weatherMeta(code) {
  const item = WEATHER_CODES[code] || ['未知', '❔']
  return { text: item[0], icon: item[1] }
}

function shiftYear(date, year) {
  const month = date.getMonth()
  const day = date.getDate()
  const shifted = new Date(year, month, day)
  if (shifted.getMonth() !== month) return new Date(year, month + 1, 0)
  return shifted
}

function dateMeta(dateStr) {
  const date = new Date(`${dateStr}T00:00:00`)
  return {
    iso: dateStr,
    monthDay: `${date.getMonth() + 1}/${date.getDate()}`,
    weekday: WEEKDAYS[date.getDay()]
  }
}

function mean(values) {
  if (!values.length) return null
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function readPrefs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) || {}
  } catch {
    return {}
  }
}

const currentYear = ref(new Date().getFullYear())
const yearOptions = computed(() =>
  Array.from({ length: 10 }, (_, i) => currentYear.value - 1 - i)
)

const prefs = readPrefs()
const customCities = Array.isArray(prefs.customCities) ? prefs.customCities : []
const cities = ref([...PRESET_CITIES, ...customCities])
const selectedCityId = ref(
  cities.value.some((city) => city.id === prefs.cityId) ? prefs.cityId : PRESET_CITIES[0].id
)
const selectedYears = ref(
  Array.isArray(prefs.years)
    ? prefs.years.filter((year) => Number.isInteger(year))
    : [currentYear.value - 1]
)
let autoSelectYear = !Array.isArray(prefs.years)

const selectedCity = computed(
  () => cities.value.find((city) => city.id === selectedCityId.value) || PRESET_CITIES[0]
)

const windowDates = computed(() => (currentDays.value || []).map((day) => day.date))
const windowLabels = computed(() => windowDates.value.map((date) => dateMeta(date)))
const windowText = computed(() => {
  const labels = windowLabels.value
  if (!labels.length) return ''
  return `${labels[0].monthDay} - ${labels[labels.length - 1].monthDay}`
})
const dayCount = computed(() => (currentDays.value ? currentDays.value.length : 7))

// 以本地日期作为查询窗口，接口返回日期不一致时按索引兜底对齐
const localDates = computed(() => {
  const list = []
  const base = new Date()
  base.setHours(0, 0, 0, 0)
  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = new Date(base)
    date.setDate(base.getDate() - offset)
    list.push(toISO(date))
  }
  return list
})

const keyword = ref('')
const searching = ref(false)
const searchError = ref('')
const searchResults = ref([])
let searchTimer = null
let searchSeq = 0

watch(keyword, (value) => {
  clearTimeout(searchTimer)
  searchError.value = ''
  if (!value.trim()) {
    searchResults.value = []
    searching.value = false
    return
  }
  searchTimer = setTimeout(runSearch, 350)
})

async function runSearch() {
  const query = keyword.value.trim()
  if (!query) return
  const seq = ++searchSeq
  searching.value = true
  try {
    const params = new URLSearchParams({
      name: query,
      count: '8',
      language: 'zh',
      format: 'json'
    })
    const data = await fetchJSON(`${GEO_API}?${params}`)
    if (seq !== searchSeq) return
    searchResults.value = (data.results || []).map((item) => ({
      id: `geo-${item.latitude}-${item.longitude}`,
      name: item.name,
      region: [item.admin1, item.country].filter(Boolean).join(' · '),
      lat: item.latitude,
      lon: item.longitude
    }))
    searchError.value = searchResults.value.length ? '' : '没有找到匹配的城市'
  } catch {
    if (seq !== searchSeq) return
    searchResults.value = []
    searchError.value = '城市搜索失败，请稍后重试'
  } finally {
    if (seq === searchSeq) searching.value = false
  }
}

function pickCity(city) {
  if (!cities.value.some((item) => item.id === city.id)) cities.value.push(city)
  selectedCityId.value = city.id
  keyword.value = ''
  searchResults.value = []
  searchError.value = ''
}

function savePrefs() {
  const custom = cities.value.filter((city) => city.id.startsWith('geo-'))
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      cityId: selectedCityId.value,
      years: selectedYears.value,
      customCities: custom
    })
  )
}

watch([selectedCityId, selectedYears], savePrefs, { deep: true })

async function fetchJSON(url) {
  let lastError = null
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 12000)
    try {
      const response = await fetch(url, { signal: controller.signal })
      if (!response.ok) throw new Error(`天气接口请求失败（${response.status}）`)
      return await response.json()
    } catch (err) {
      lastError =
        err && err.name === 'AbortError'
          ? new Error('天气接口请求超时，请稍后重试')
          : err
      if (attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)))
      }
    } finally {
      clearTimeout(timer)
    }
  }
  throw lastError instanceof Error ? lastError : new Error('天气数据加载失败')
}

function normalizeDaily(daily) {
  if (!daily || !Array.isArray(daily.time)) return []
  return daily.time.map((date, index) => ({
    date,
    tMax: toNumber(daily.temperature_2m_max?.[index]),
    tMin: toNumber(daily.temperature_2m_min?.[index]),
    code: toNumber(daily.weather_code?.[index])
  }))
}

const cache = new Map()
const loading = ref(false)
const error = ref('')
const historyError = ref('')
const currentDays = ref(null)
const historyDays = ref({})
let requestSeq = 0

async function fetchForecast(city) {
  const key = `${city.id}|forecast`
  if (cache.has(key)) return cache.get(key)
  const params = new URLSearchParams({
    latitude: city.lat,
    longitude: city.lon,
    daily: DAILY_FIELDS,
    timezone: 'auto',
    past_days: '6',
    forecast_days: '1'
  })
  const data = await fetchJSON(`${FORECAST_API}?${params}`)
  const recent = normalizeDaily(data.daily).slice(-7)
  if (!recent.length) throw new Error('天气接口未返回数据')
  const byDate = new Map(recent.map((day) => [day.date, day]))
  const dates = localDates.value
  const matched = dates.map((date) => byDate.get(date))
  const days = matched.every(Boolean)
    ? matched
    : recent.map((day, index) => ({ ...day, date: dates[index] || day.date }))
  cache.set(key, days)
  return days
}

async function fetchArchiveYear(city, year, baseDates) {
  const dates = baseDates.map((date) =>
    toISO(shiftYear(new Date(`${date}T00:00:00`), year))
  )
  const key = `${city.id}|archive|${dates[0]}|${dates[dates.length - 1]}`
  if (cache.has(key)) return cache.get(key)
  const params = new URLSearchParams({
    latitude: city.lat,
    longitude: city.lon,
    daily: DAILY_FIELDS,
    timezone: 'auto',
    start_date: dates[0],
    end_date: dates[dates.length - 1]
  })
  const data = await fetchJSON(`${ARCHIVE_API}?${params}`)
  const map = new Map(normalizeDaily(data.daily).map((day) => [day.date, day]))
  const days = dates.map(
    (date) => map.get(date) || { date, tMax: null, tMin: null, code: null }
  )
  cache.set(key, days)
  return days
}

async function loadWeather() {
  const city = selectedCity.value
  if (!city) return
  const seq = ++requestSeq
  loading.value = true
  error.value = ''
  historyError.value = ''
  const baseDates = localDates.value
  const years = [...selectedYears.value]
  try {
    const recent = await fetchForecast(city)
    if (seq !== requestSeq) return
    syncYear(recent)
    currentDays.value = recent

    const results = years.length
      ? await Promise.allSettled(
          years.map((year) => fetchArchiveYear(city, year, baseDates))
        )
      : []
    if (seq !== requestSeq) return
    const loaded = {}
    const failed = []
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') loaded[years[index]] = result.value
      else failed.push(years[index])
    })
    historyDays.value = loaded
    historyError.value = failed.length
      ? `${failed.join('、')} 年的历史数据暂时获取失败，可重试重新加载`
      : ''
  } catch (err) {
    if (seq !== requestSeq) return
    error.value = err instanceof Error ? err.message : '天气数据加载失败，请检查网络后重试'
    currentDays.value = null
  } finally {
    if (seq === requestSeq) loading.value = false
  }
}

watch(selectedCityId, loadWeather)

function syncYear(days) {
  const dataYear = Number(String(days[days.length - 1]?.date || '').slice(0, 4))
  if (!Number.isInteger(dataYear)) return
  currentYear.value = dataYear
  let years = selectedYears.value.filter((year) => year < dataYear)
  if (!years.length && autoSelectYear && dataYear > 1900) years = [dataYear - 1]
  autoSelectYear = false
  if (years.join(',') !== selectedYears.value.join(',')) selectedYears.value = years
}

const metric = ref('max')

function metricValue(day, metricKey = metric.value) {
  if (!day) return null
  if (metricKey === 'max') return day.tMax
  if (metricKey === 'min') return day.tMin
  if (day.tMax == null || day.tMin == null) return null
  return (day.tMax + day.tMin) / 2
}

function colorForYear(year) {
  const index = yearOptions.value.indexOf(year)
  return YEAR_COLORS[index % YEAR_COLORS.length]
}

const series = computed(() => {
  const list = []
  if (currentDays.value) {
    list.push({
      key: String(currentYear.value),
      year: currentYear.value,
      current: true,
      color: 'var(--primary)',
      days: currentDays.value
    })
  }
  const years = [...selectedYears.value].sort((a, b) => a - b)
  for (const year of years) {
    const days = historyDays.value[year]
    if (days) {
      list.push({
        key: String(year),
        year,
        current: false,
        color: colorForYear(year),
        days
      })
    }
  }
  return list
})

const plotWidth = CHART_W - PAD.left - PAD.right
const plotHeight = CHART_H - PAD.top - PAD.bottom
const xAt = (index) => PAD.left + (plotWidth / Math.max(1, dayCount.value - 1)) * index

function niceStep(raw) {
  const steps = [1, 2, 5, 10, 20, 50, 100]
  return steps.find((step) => step >= raw) || 100
}

const domain = computed(() => {
  const values = []
  for (const item of series.value) {
    for (const day of item.days) {
      const value = metricValue(day)
      if (value != null) values.push(value)
    }
  }
  if (!values.length) return null
  let min = Math.floor(Math.min(...values) - 1)
  let max = Math.ceil(Math.max(...values) + 1)
  if (max - min < 6) {
    const mid = (max + min) / 2
    min = Math.floor(mid - 3)
    max = Math.ceil(mid + 3)
  }
  const step = niceStep((max - min) / 4)
  min = Math.floor(min / step) * step
  max = Math.ceil(max / step) * step
  const ticks = []
  for (let value = min; value <= max + 1e-6; value += step) {
    ticks.push(Math.round(value * 10) / 10)
  }
  return { min, max, ticks }
})

function yAt(value) {
  if (!domain.value) return PAD.top
  const ratio = (value - domain.value.min) / (domain.value.max - domain.value.min)
  return PAD.top + (1 - ratio) * plotHeight
}

function segmentsFor(item) {
  const segments = []
  let current = []
  item.days.forEach((day, index) => {
    const value = metricValue(day)
    if (value == null) {
      if (current.length) segments.push(current.join(' '))
      current = []
      return
    }
    current.push(`${xAt(index).toFixed(1)},${yAt(value).toFixed(1)}`)
  })
  if (current.length) segments.push(current.join(' '))
  return segments
}

function pointsFor(item) {
  const points = []
  item.days.forEach((day, index) => {
    const value = metricValue(day)
    if (value == null) return
    points.push({ index, value, x: xAt(index), y: yAt(value) })
  })
  return points
}

const hoverIndex = ref(null)

function onChartMove(event) {
  const rect = event.currentTarget.getBoundingClientRect()
  if (!rect.width) return
  const x = ((event.clientX - rect.left) / rect.width) * CHART_W
  const step = plotWidth / Math.max(1, dayCount.value - 1)
  const index = Math.round((x - PAD.left) / step)
  hoverIndex.value = Math.min(dayCount.value - 1, Math.max(0, index))
}

function clearHover() {
  hoverIndex.value = null
}

const hoverData = computed(() => {
  if (hoverIndex.value == null) return null
  const index = hoverIndex.value
  return {
    label: windowLabels.value[index],
    left: Math.min(88, Math.max(12, (xAt(index) / CHART_W) * 100)),
    items: series.value
      .map((item) => {
        const day = item.days[index]
        const value = metricValue(day)
        return {
          key: item.key,
          year: item.year,
          current: item.current,
          color: item.color,
          value: value == null ? null : Math.round(value * 10) / 10,
          icon: weatherMeta(day?.code).icon
        }
      })
      .filter((item) => item.value != null)
  }
})

const currentRange = computed(() => {
  const maxes = (currentDays.value || []).map((day) => day.tMax).filter((value) => value != null)
  const mins = (currentDays.value || []).map((day) => day.tMin).filter((value) => value != null)
  if (!maxes.length || !mins.length) return null
  return { min: Math.min(...mins), max: Math.max(...maxes) }
})

function barStyle(day) {
  if (!currentRange.value || day.tMax == null || day.tMin == null) return null
  const span = currentRange.value.max - currentRange.value.min || 1
  const left = ((day.tMin - currentRange.value.min) / span) * 100
  const width = ((day.tMax - day.tMin) / span) * 100
  return { left: `${left}%`, width: `${Math.max(width, 4)}%` }
}

function formatTemp(value) {
  if (value == null) return '--'
  return `${Math.round(value * 10) / 10}°`
}

const summary = computed(() => {
  const rows = series.value.map((item) => {
    const maxes = item.days.map((day) => day.tMax).filter((value) => value != null)
    const mins = item.days.map((day) => day.tMin).filter((value) => value != null)
    return {
      key: item.key,
      year: item.year,
      current: item.current,
      color: item.color,
      avgMax: mean(maxes),
      avgMin: mean(mins),
      peak: maxes.length ? Math.max(...maxes) : null,
      low: mins.length ? Math.min(...mins) : null
    }
  })
  const base = rows.find((row) => row.current)
  return rows.map((row) => ({
    ...row,
    diff:
      base && !row.current && base.avgMax != null && row.avgMax != null
        ? row.avgMax - base.avgMax
        : null
  }))
})

function diffText(value) {
  if (value == null) return '--'
  const rounded = Math.round(value * 10) / 10
  if (rounded === 0) return '持平'
  return `${rounded > 0 ? '偏暖' : '偏冷'} ${Math.abs(rounded)}°`
}

function toggleYear(year) {
  if (selectedYears.value.includes(year)) {
    selectedYears.value = selectedYears.value.filter((item) => item !== year)
  } else {
    selectedYears.value = [...selectedYears.value, year].sort((a, b) => b - a)
  }
  loadWeather()
}

function retry() {
  cache.clear()
  loadWeather()
}

onMounted(loadWeather)

onBeforeUnmount(() => {
  clearTimeout(searchTimer)
  requestSeq += 1
  searchSeq += 1
})
</script>

<template>
  <ToolLayout>
    <div class="stack weather">
      <section class="block">
        <div class="block-head">
          <h3 class="block-title">城市选择</h3>
          <span v-if="loading" class="status">加载中…</span>
        </div>
        <div class="city-row">
          <select v-model="selectedCityId" class="field city-select">
            <option v-for="city in cities" :key="city.id" :value="city.id">
              {{ city.name }}<template v-if="city.region"> · {{ city.region }}</template>
            </option>
          </select>
          <div class="search-box">
            <input
              v-model="keyword"
              class="field"
              type="search"
              placeholder="搜索其它城市，如：桂林、京都、纽约"
            />
            <div v-if="keyword.trim()" class="search-panel card">
              <p v-if="searching" class="search-tip muted">搜索中…</p>
              <p v-else-if="searchError" class="search-tip muted">{{ searchError }}</p>
              <template v-else>
                <button
                  v-for="item in searchResults"
                  :key="item.id"
                  type="button"
                  class="search-item"
                  @click="pickCity(item)"
                >
                  <span>{{ item.name }}</span>
                  <span class="muted">{{ item.region }}</span>
                </button>
              </template>
            </div>
          </div>
        </div>
        <p v-if="windowText" class="hint muted">
          当前城市：{{ selectedCity.name }}，展示 {{ windowText }} 共 7 天天气（含今天）。
        </p>
      </section>

      <p v-if="error" class="error">
        {{ error }}
        <button class="btn small" type="button" @click="retry">重试</button>
      </p>

      <section v-if="currentDays" class="block">
        <div class="block-head">
          <h3 class="block-title">近 7 天天气</h3>
          <span class="muted small-text">温度区间按本周最低 / 最高温度绘制</span>
        </div>
        <div class="days">
          <article
            v-for="(day, index) in currentDays"
            :key="day.date"
            class="day card"
            :class="{ today: index === currentDays.length - 1 }"
          >
            <span class="day-week">{{ windowLabels[index].weekday }}</span>
            <span class="day-date muted">{{ windowLabels[index].monthDay }}</span>
            <span class="day-icon">{{ weatherMeta(day.code).icon }}</span>
            <span class="day-text">{{ weatherMeta(day.code).text }}</span>
            <span class="day-temp">{{ formatTemp(day.tMax) }} / {{ formatTemp(day.tMin) }}</span>
            <span v-if="barStyle(day)" class="bar">
              <span class="bar-fill" :style="barStyle(day)"></span>
            </span>
          </article>
        </div>
      </section>

      <section class="block">
        <div class="block-head">
          <h3 class="block-title">历史年份同期对比</h3>
          <span class="muted small-text">最多可选 10 年</span>
        </div>
        <div class="year-chips">
          <button
            v-for="year in yearOptions"
            :key="year"
            type="button"
            class="chip"
            :class="{ active: selectedYears.includes(year) }"
            :style="selectedYears.includes(year) ? { borderColor: colorForYear(year), color: colorForYear(year) } : null"
            @click="toggleYear(year)"
          >
            {{ year }} 年
          </button>
        </div>
        <p v-if="historyError" class="error">
          {{ historyError }}
          <button class="btn small" type="button" @click="retry">重试</button>
        </p>
      </section>

      <section v-if="currentDays" class="block">
        <div class="block-head chart-head">
          <h3 class="block-title">温度走势</h3>
          <div class="tabs">
            <button
              v-for="item in METRICS"
              :key="item.key"
              type="button"
              class="tab"
              :class="{ active: metric === item.key }"
              @click="metric = item.key"
            >
              {{ item.label }}
            </button>
          </div>
        </div>

        <div class="legend">
          <span v-for="item in series" :key="item.key" class="legend-item">
            <i class="dot" :style="{ background: item.color }"></i>
            {{ item.year }} 年<template v-if="item.current">（当前）</template>
          </span>
          <span v-if="series.length === 1" class="muted small-text">
            在上方选择历史年份即可叠加对比
          </span>
        </div>

        <div v-if="domain" class="chart">
          <svg
            class="chart-svg"
            :viewBox="`0 0 ${CHART_W} ${CHART_H}`"
            role="img"
            aria-label="温度对比折线图"
            @mousemove="onChartMove"
            @mouseleave="clearHover"
          >
            <g class="grid">
              <line
                v-for="tick in domain.ticks"
                :key="`g-${tick}`"
                :x1="PAD.left"
                :x2="CHART_W - PAD.right"
                :y1="yAt(tick)"
                :y2="yAt(tick)"
              />
            </g>

            <text
              v-for="tick in domain.ticks"
              :key="`t-${tick}`"
              class="axis-label"
              :x="PAD.left - 10"
              :y="yAt(tick) + 4"
              text-anchor="end"
            >
              {{ tick }}°
            </text>

            <text
              v-for="(label, index) in windowLabels"
              :key="`x-${label.iso}`"
              class="axis-label"
              :x="xAt(index)"
              :y="CHART_H - 10"
              text-anchor="middle"
            >
              {{ label.monthDay }}
            </text>

            <g v-for="item in series" :key="`s-${item.key}`">
              <polyline
                v-for="(segment, segIndex) in segmentsFor(item)"
                :key="`p-${segIndex}`"
                :points="segment"
                fill="none"
                :stroke="item.color"
                stroke-width="2.2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <circle
                v-for="point in pointsFor(item)"
                :key="`c-${point.index}`"
                :cx="point.x"
                :cy="point.y"
                r="3.2"
                :fill="item.color"
              />
            </g>

            <line
              v-if="hoverData"
              class="hover-line"
              :x1="xAt(hoverIndex)"
              :x2="xAt(hoverIndex)"
              :y1="PAD.top"
              :y2="CHART_H - PAD.bottom"
            />
          </svg>

          <div
            v-if="hoverData && hoverData.items.length"
            class="tooltip card"
            :style="{ left: `${hoverData.left}%` }"
          >
            <p class="tooltip-date">{{ hoverData.label.monthDay }} {{ hoverData.label.weekday }}</p>
            <p v-for="item in hoverData.items" :key="item.key" class="tooltip-row">
              <i class="dot" :style="{ background: item.color }"></i>
              <span>{{ item.year }} 年</span>
              <span class="tooltip-value">{{ item.icon }} {{ item.value }}°</span>
            </p>
          </div>
        </div>
        <p v-else class="muted small-text">暂无温度数据</p>
      </section>

      <section v-if="currentDays" class="block">
        <h3 class="block-title">对比汇总</h3>
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>年份</th>
                <th>平均最高温</th>
                <th>平均最低温</th>
                <th>极端高温</th>
                <th>极端低温</th>
                <th>与当前相比</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in summary" :key="row.key">
                <td>
                  <span class="dot" :style="{ background: row.color }"></span>
                  {{ row.year }} 年<template v-if="row.current">（当前）</template>
                </td>
                <td>{{ formatTemp(row.avgMax) }}</td>
                <td>{{ formatTemp(row.avgMin) }}</td>
                <td>{{ formatTemp(row.peak) }}</td>
                <td>{{ formatTemp(row.low) }}</td>
                <td :class="{ warm: row.diff > 0, cold: row.diff < 0 }">{{ diffText(row.diff) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="hint muted">
          数据来自 Open-Meteo 公开接口，历史同期为同一日历日的实测归档数据，可能存在数日延迟。
        </p>
      </section>
    </div>
  </ToolLayout>
</template>

<style scoped>
.weather {
  gap: 22px;
}

.block {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.block-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.block-title {
  font-size: 14px;
  color: var(--muted);
}

.status,
.small-text {
  font-size: 12px;
}

.city-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.city-select {
  width: auto;
  min-width: 200px;
}

.search-box {
  position: relative;
  flex: 1;
  min-width: 220px;
}

.search-panel {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  z-index: 30;
  display: flex;
  flex-direction: column;
  padding: 6px;
  max-height: 260px;
  overflow-y: auto;
}

.search-tip {
  margin: 0;
  padding: 8px 10px;
  font-size: 13px;
}

.search-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 10px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--text);
  font: inherit;
  font-size: 14px;
  text-align: left;
  cursor: pointer;
}

.search-item:hover {
  background: var(--primary-weak);
  color: var(--primary);
}

.hint {
  margin: 0;
  font-size: 12.5px;
}

.days {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(108px, 1fr));
  gap: 10px;
}

.day {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 14px 8px 12px;
  border: 1px solid var(--border);
  background: var(--surface-soft);
  text-align: center;
}

.day.today {
  border-color: var(--primary);
  background: var(--primary-weak);
}

.day-week {
  font-weight: 600;
  font-size: 14px;
}

.day-date {
  font-size: 12px;
}

.day-icon {
  margin-top: 4px;
  font-size: 24px;
  line-height: 1.2;
}

.day-text {
  font-size: 12px;
  color: var(--muted);
}

.day-temp {
  font-size: 13px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.bar {
  position: relative;
  width: 100%;
  height: 6px;
  margin-top: 4px;
  border-radius: 999px;
  background: var(--border);
  overflow: hidden;
}

.bar-fill {
  position: absolute;
  top: 0;
  bottom: 0;
  border-radius: 999px;
  background: linear-gradient(90deg, #38bdf8, #f97316);
}

.year-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.chip {
  padding: 5px 12px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--surface);
  color: var(--muted);
  font: inherit;
  font-size: 13px;
  cursor: pointer;
  transition: border-color 0.15s ease, color 0.15s ease, background-color 0.15s ease;
}

.chip:hover {
  border-color: var(--primary);
  color: var(--primary);
}

.chip.active {
  background: var(--surface-soft);
  font-weight: 600;
}

.chart-head {
  align-items: center;
}

.tabs {
  display: inline-flex;
  padding: 3px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface-soft);
  gap: 2px;
}

.tab {
  padding: 4px 12px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--muted);
  font: inherit;
  font-size: 13px;
  cursor: pointer;
}

.tab.active {
  background: var(--surface);
  color: var(--primary);
  font-weight: 600;
  box-shadow: var(--shadow);
}

.legend {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 14px;
}

.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  color: var(--muted);
}

.dot {
  display: inline-block;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  vertical-align: middle;
}

.chart {
  position: relative;
  padding: 4px 0;
}

.chart-svg {
  display: block;
  width: 100%;
  height: auto;
  overflow: visible;
}

.grid line {
  stroke: var(--border);
  stroke-width: 1;
  stroke-dasharray: 3 5;
}

.axis-label {
  fill: var(--muted);
  font-size: 11px;
}

.hover-line {
  stroke: var(--muted);
  stroke-width: 1;
  stroke-dasharray: 4 4;
  opacity: 0.6;
}

.tooltip {
  position: absolute;
  top: 8px;
  z-index: 10;
  min-width: 132px;
  padding: 8px 10px;
  border: 1px solid var(--border);
  transform: translateX(-50%);
  pointer-events: none;
  font-size: 12px;
}

.tooltip-date {
  margin: 0 0 4px;
  color: var(--muted);
}

.tooltip-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  white-space: nowrap;
}

.tooltip-value {
  margin-left: auto;
  font-variant-numeric: tabular-nums;
}

.table-wrap {
  overflow-x: auto;
}

.table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13.5px;
}

.table th,
.table td {
  padding: 9px 12px;
  border-bottom: 1px solid var(--border);
  text-align: left;
  white-space: nowrap;
}

.table th {
  color: var(--muted);
  font-size: 12.5px;
  font-weight: 600;
}

.table td {
  font-variant-numeric: tabular-nums;
}

.table tr:last-child td {
  border-bottom: none;
}

.table td.warm {
  color: #f97316;
}

.table td.cold {
  color: #0ea5e9;
}

@media (max-width: 720px) {
  .days {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .chart-head {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
