<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import ToolLayout from '../components/ToolLayout.vue'

/* ---------------- 世界常量 ---------------- */
const TILE = 16
const ROWS = 12
const COLS = 132
const VIEW_W = 320
const VIEW_H = 192
const WORLD_W = COLS * TILE
const GROUND_TOP = 10 * TILE
const GOAL_COL = 124
const SPAWN_X = 40
const STEP = 1 / 60

const T_GROUND = 1
const T_BRICK = 2
const T_QUESTION = 3
const T_USED = 4
const T_STONE = 5

/* ---------------- 物理参数（像素 / 秒） ---------------- */
const GRAVITY = 1500
const MAX_FALL = 520
const RUN_ACCEL = 900
const RUN_MAX = 130
const FRICTION = 1100
const AIR_FRICTION = 280
const JUMP_VELOCITY = -430
const MUSHROOM_SPEED = 44
const BUMP_TIME = 0.22

/* ---------------- 调色板 ---------------- */
const PLAYER_PALETTE = {
  R: '#e23b3b',
  H: '#4b2a0f',
  S: '#f7bd8e',
  B: '#2f56d6',
  Y: '#ffd93b',
  N: '#7a3d12'
}

const MUSHROOM_PALETTE = { M: '#e23b3b', W: '#fff4e0', S: '#f8dfae', K: '#3b2210' }

/* ---------------- 像素角色，全部用字符矩阵生成，没有任何图片资源 ---------------- */
const PLAYER_IDLE = [
  '....RRRRR...',
  '...RRRRRRRR.',
  '...HHHSSSS..',
  '..HSHSSSSSS.',
  '..HSHHSSSSS.',
  '..HHSSSSSSS.',
  '....SSSSSS..',
  '..RRRRRRRR..',
  '..SRRBBRRSS.',
  '.SSBBBBBBSS.',
  '.SSBBBBBBSS.',
  '..BBBBBBBB..',
  '...BB..BB...',
  '...BB..BB...',
  '..NNN..NNN..',
  '.NNNN..NNNN.'
]

const PLAYER_WALK = [
  ...PLAYER_IDLE.slice(0, 12),
  '..BB....BB..',
  '.BB......BB.',
  'NNN......NNN',
  'NNN......NNN'
]

const PLAYER_TORSO = [
  '..SRRBBRRSS.',
  '.SSBBBBBBSS.',
  '.SSBYBBYBSS.',
  '..BBBBBBBB..',
  '..BBBBBBBB..',
  '..BBBBBBBB..',
  '..BBBBBBBB..',
  '..BBBBBBBB..',
  '..BBBBBBBB..',
  '...BBBBBB...'
]

const PLAYER_LEGS = [
  '...BB..BB...',
  '...BB..BB...',
  '...BB..BB...',
  '...BB..BB...',
  '..NNN..NNN..',
  '.NNNN..NNNN.'
]

const PLAYER_LEGS_WALK = [
  '...BB..BB...',
  '..BB....BB..',
  '.BB......BB.',
  'NNN......NNN',
  'NNN......NNN',
  'NNN......NNN'
]

const PLAYER_BIG_IDLE = [...PLAYER_IDLE.slice(0, 8), ...PLAYER_TORSO, ...PLAYER_LEGS]
const PLAYER_BIG_WALK = [...PLAYER_IDLE.slice(0, 8), ...PLAYER_TORSO, ...PLAYER_LEGS_WALK]

const MUSHROOM = [
  '...MMMMMM...',
  '..MWWMMWWM..',
  '.MWWMMMWWWM.',
  '.MWWMMMWWWM.',
  'MMMMMMMMMMMM',
  '.MMMMMMMMMM.',
  '..SSSSSSSS..',
  '..SKSSSSKS..',
  '..SSSSSSSS..',
  '..SSSSSSSS..',
  '...SSSSSS...',
  '....SSSS....'
]

/* ---------------- 运行时状态 ---------------- */
const canvasRef = ref(null)
const stageRef = ref(null)
const status = ref('ready')
const score = ref(0)
const lives = ref(3)
const shrooms = ref(0)
const pixelPerfect = ref(true)
const metrics = ref({ dpr: 1, scale: 1, cssW: VIEW_W, cssH: VIEW_H })

const statusText = computed(
  () =>
    ({
      ready: '待开始',
      playing: '进行中',
      paused: '已暂停',
      over: '游戏结束',
      clear: '已通关'
    })[status.value] || ''
)

const keys = { left: false, right: false, up: false, down: false }

let ctx = null
let sprites = null
let tileCache = null
let grid = []
let player = null
let mushrooms = []
let bumps = []
let camX = 0
let lastSafe = { x: SPAWN_X, feet: GROUND_TOP }
let rafId = 0
let lastTs = 0
let acc = 0
let renderScale = 1
let resizeObserver = null

/* ---------------- 工具函数 ---------------- */
function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v))
}

function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}

/* ---------------- 像素素材预渲染 ---------------- */
function makeSprite(rows, palette, flip = false) {
  const w = rows[0].length
  const h = rows.length
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const g = c.getContext('2d')
  g.imageSmoothingEnabled = false
  for (let r = 0; r < h; r++) {
    const line = rows[r]
    for (let i = 0; i < line.length; i++) {
      const color = palette[line[i]]
      if (!color) continue
      g.fillStyle = color
      g.fillRect(flip ? w - 1 - i : i, r, 1, 1)
    }
  }
  return c
}

function buildSprites() {
  const p = PLAYER_PALETTE
  const pair = (a, b) => ({
    right: [makeSprite(a, p), makeSprite(b, p)],
    left: [makeSprite(a, p, true), makeSprite(b, p, true)]
  })
  sprites = {
    small: pair(PLAYER_IDLE, PLAYER_WALK),
    big: pair(PLAYER_BIG_IDLE, PLAYER_BIG_WALK),
    mushroom: makeSprite(MUSHROOM, MUSHROOM_PALETTE)
  }
}

/* 砖块与地形同样用 fillRect 逐像素绘制，再缓存成 16×16 的小画布 */
const Q_GLYPH = ['.###.', '#...#', '....#', '..##.', '..#..', '.....', '..#..']

function paintTile(g, type, variant) {
  if (type === T_GROUND) {
    g.fillStyle = '#b96a25'
    g.fillRect(0, 0, 16, 16)
    if (variant === 'top') {
      g.fillStyle = '#dd8f45'
      g.fillRect(0, 0, 16, 3)
      g.fillStyle = '#8a4a15'
      g.fillRect(0, 3, 16, 1)
    }
    g.fillStyle = '#8a4a15'
    g.fillRect(0, 8, 16, 1)
    g.fillRect(7, 4, 1, 4)
    g.fillRect(3, 9, 1, 7)
    g.fillRect(12, 9, 1, 7)
    return
  }

  if (type === T_BRICK) {
    g.fillStyle = '#c05a1c'
    g.fillRect(0, 0, 16, 16)
    g.fillStyle = '#e08a45'
    g.fillRect(0, 0, 16, 1)
    g.fillStyle = '#8d3a0e'
    g.fillRect(0, 7, 16, 1)
    g.fillRect(0, 15, 16, 1)
    g.fillRect(5, 0, 1, 7)
    g.fillRect(11, 8, 1, 7)
    return
  }

  if (type === T_QUESTION) {
    g.fillStyle = variant === 'q2' ? '#f3bd5c' : '#e8a53a'
    g.fillRect(0, 0, 16, 16)
    g.fillStyle = '#a2661a'
    g.fillRect(0, 0, 16, 1)
    g.fillRect(0, 15, 16, 1)
    g.fillRect(0, 0, 1, 16)
    g.fillRect(15, 0, 1, 16)
    g.fillStyle = '#fff0c2'
    g.fillRect(2, 2, 1, 1)
    g.fillRect(13, 2, 1, 1)
    g.fillRect(2, 13, 1, 1)
    g.fillRect(13, 13, 1, 1)
    g.fillStyle = '#6f4410'
    for (let r = 0; r < Q_GLYPH.length; r++) {
      for (let c = 0; c < 5; c++) {
        if (Q_GLYPH[r][c] === '#') g.fillRect(6 + c, 4 + r, 1, 1)
      }
    }
    return
  }

  if (type === T_USED) {
    g.fillStyle = '#a97b3c'
    g.fillRect(0, 0, 16, 16)
    g.fillStyle = '#7c5522'
    g.fillRect(0, 0, 16, 1)
    g.fillRect(0, 15, 16, 1)
    g.fillRect(0, 0, 1, 16)
    g.fillRect(15, 0, 1, 16)
    return
  }

  // T_STONE
  g.fillStyle = '#8f8f8f'
  g.fillRect(0, 0, 16, 16)
  g.fillStyle = '#b3b3b3'
  g.fillRect(0, 0, 16, 2)
  g.fillRect(0, 0, 2, 16)
  g.fillStyle = '#6b6b6b'
  g.fillRect(0, 14, 16, 2)
  g.fillRect(14, 0, 2, 16)
  g.fillRect(7, 2, 1, 12)
}

function makeTile(type, variant) {
  const c = document.createElement('canvas')
  c.width = 16
  c.height = 16
  paintTile(c.getContext('2d'), type, variant)
  return c
}

function buildTileCache() {
  tileCache = {
    groundTop: makeTile(T_GROUND, 'top'),
    groundMid: makeTile(T_GROUND, 'mid'),
    brick: makeTile(T_BRICK),
    q1: makeTile(T_QUESTION, 'q1'),
    q2: makeTile(T_QUESTION, 'q2'),
    used: makeTile(T_USED),
    stone: makeTile(T_STONE)
  }
}

/* ---------------- 关卡 ---------------- */
function buildLevel() {
  grid = Array.from({ length: ROWS }, () => new Array(COLS).fill(0))

  const pits = [
    [34, 35],
    [63, 64],
    [98, 99]
  ]
  for (let col = 0; col < COLS; col++) {
    if (pits.some(([a, b]) => col >= a && col <= b)) continue
    grid[10][col] = T_GROUND
    grid[11][col] = T_GROUND
  }

  const put = (col, row, type) => {
    if (col >= 0 && col < COLS && row >= 0 && row < ROWS) grid[row][col] = type
  }
  const rowOf = (from, to, row, type) => {
    for (let col = from; col <= to; col++) put(col, row, type)
  }

  // 热身：一个问号块
  put(13, 7, T_QUESTION)

  // 三连砖块
  put(20, 7, T_BRICK)
  put(21, 7, T_QUESTION)
  put(22, 7, T_BRICK)
  rowOf(26, 29, 7, T_BRICK)
  put(27, 7, T_QUESTION)

  // 上、下台阶
  for (let i = 0; i < 4; i++) {
    for (let r = 9 - i; r <= 9; r++) put(40 + i, r, T_STONE)
  }
  for (let i = 0; i < 4; i++) {
    for (let r = 6 + i; r <= 9; r++) put(45 + i, r, T_STONE)
  }

  // 砖块走廊
  rowOf(52, 55, 7, T_BRICK)
  put(53, 7, T_QUESTION)
  put(58, 6, T_QUESTION)

  // 浮空平台
  rowOf(68, 72, 7, T_BRICK)
  put(70, 6, T_QUESTION)
  rowOf(77, 81, 7, T_BRICK)
  put(79, 6, T_BRICK)
  rowOf(86, 90, 7, T_BRICK)
  put(88, 6, T_QUESTION)

  // 最后一段
  rowOf(104, 108, 7, T_BRICK)
  put(106, 7, T_QUESTION)
  for (let i = 0; i < 4; i++) {
    for (let r = 9 - i; r <= 9; r++) put(112 + i, r, T_STONE)
  }
  rowOf(118, 120, 6, T_BRICK)
}

/* ---------------- 碰撞 ---------------- */
function isSolid(col, row) {
  if (row < 0 || row >= ROWS) return false
  if (col < 0 || col >= COLS) return true
  return grid[row][col] !== 0
}

function moveX(e, dx) {
  if (!dx) return false
  e.x += dx
  const top = Math.floor(e.y / TILE)
  const bottom = Math.floor((e.y + e.h - 0.01) / TILE)
  if (dx > 0) {
    const col = Math.floor((e.x + e.w - 0.01) / TILE)
    for (let row = top; row <= bottom; row++) {
      if (isSolid(col, row)) {
        e.x = col * TILE - e.w
        return true
      }
    }
  } else {
    const col = Math.floor(e.x / TILE)
    for (let row = top; row <= bottom; row++) {
      if (isSolid(col, row)) {
        e.x = (col + 1) * TILE
        return true
      }
    }
  }
  return false
}

function moveY(e, dy) {
  const res = { ground: false, head: null }
  if (!dy) return res
  e.y += dy
  const left = Math.floor(e.x / TILE)
  const right = Math.floor((e.x + e.w - 0.01) / TILE)

  if (dy > 0) {
    const row = Math.floor((e.y + e.h - 0.01) / TILE)
    for (let col = left; col <= right; col++) {
      if (isSolid(col, row)) {
        e.y = row * TILE - e.h
        res.ground = true
        break
      }
    }
    return res
  }

  const row = Math.floor(e.y / TILE)
  const hitCols = []
  for (let col = left; col <= right; col++) {
    if (isSolid(col, row)) hitCols.push(col)
  }
  if (hitCols.length) {
    const center = (e.x + e.w / 2) / TILE
    hitCols.sort((a, b) => Math.abs(a + 0.5 - center) - Math.abs(b + 0.5 - center))
    e.y = (row + 1) * TILE
    res.head = { col: hitCols[0], row }
  }
  return res
}

/* ---------------- 游戏流程 ---------------- */
function createPlayer(x, y) {
  return {
    x,
    y,
    w: 12,
    h: 16,
    vx: 0,
    vy: 0,
    onGround: false,
    facing: 1,
    big: false,
    animT: 0,
    jumpLock: false
  }
}

function initGame() {
  buildLevel()
  player = createPlayer(SPAWN_X, GROUND_TOP - 16)
  mushrooms = []
  bumps = []
  camX = 0
  lastSafe = { x: SPAWN_X, feet: GROUND_TOP }
  score.value = 0
  lives.value = 3
  shrooms.value = 0
  acc = 0
  lastTs = 0
  status.value = 'ready'
}

function startGame() {
  initGame()
  status.value = 'playing'
}

function togglePause() {
  if (status.value === 'playing') status.value = 'paused'
  else if (status.value === 'paused') {
    lastTs = 0
    status.value = 'playing'
  }
}

function loseLife() {
  lives.value -= 1
  if (lives.value <= 0) {
    status.value = 'over'
    return
  }
  player = createPlayer(Math.max(8, lastSafe.x - 28), lastSafe.feet - 16)
  mushrooms = []
  camX = clamp(player.x + player.w / 2 - VIEW_W / 2, 0, WORLD_W - VIEW_W)
}

/* ---------------- 砖块与蘑菇 ---------------- */
function bumpOffset(col, row) {
  for (let i = 0; i < bumps.length; i++) {
    const b = bumps[i]
    if (b.col === col && b.row === row) return -Math.sin((b.t / BUMP_TIME) * Math.PI) * 5
  }
  return 0
}

function hitBlock(col, row) {
  const type = grid[row][col]
  if (type !== T_QUESTION && type !== T_BRICK) return
  bumps.push({ col, row, t: 0 })
  if (type === T_QUESTION) {
    grid[row][col] = T_USED
    mushrooms.push({
      x: col * TILE + 2,
      y: row * TILE + 4,
      w: 12,
      h: 12,
      vx: 0,
      vy: 0,
      dir: 1,
      state: 'emerge',
      targetY: row * TILE - 12
    })
    score.value += 100
  } else {
    score.value += 10
  }
}

function collect() {
  shrooms.value += 1
  score.value += 500
  if (!player.big) {
    player.big = true
    player.h = 24
    player.y -= 8
  }
}

function updateMushrooms(dt) {
  for (let i = mushrooms.length - 1; i >= 0; i--) {
    const m = mushrooms[i]
    if (m.state === 'emerge') {
      m.y -= 44 * dt
      if (m.y <= m.targetY) {
        m.y = m.targetY
        m.state = 'walk'
        m.vx = m.dir * MUSHROOM_SPEED
      }
      continue
    }
    m.vy = Math.min(m.vy + GRAVITY * dt, MAX_FALL)
    if (moveX(m, m.vx * dt)) {
      m.dir *= -1
      m.vx = m.dir * MUSHROOM_SPEED
    }
    if (moveY(m, m.vy * dt).ground) m.vy = 0

    if (m.y > VIEW_H + 32) {
      mushrooms.splice(i, 1)
      continue
    }
    if (player && overlaps(player, m)) {
      collect()
      mushrooms.splice(i, 1)
    }
  }
}

/* ---------------- 玩家更新 ---------------- */
function updatePlayer(dt) {
  const p = player
  const dir = (keys.right ? 1 : 0) - (keys.left ? 1 : 0)

  if (dir !== 0) {
    p.vx += dir * RUN_ACCEL * dt
    p.facing = dir
  } else {
    const f = (p.onGround ? FRICTION : AIR_FRICTION) * dt
    p.vx = Math.abs(p.vx) <= f ? 0 : p.vx - Math.sign(p.vx) * f
  }
  p.vx = clamp(p.vx, -RUN_MAX, RUN_MAX)

  if (!keys.up) p.jumpLock = false

  if (keys.down && p.onGround) p.vx *= 0.6
  if (keys.down && !p.onGround) p.vy += GRAVITY * 0.9 * dt

  p.vy = Math.min(p.vy + GRAVITY * dt, MAX_FALL)

  if (moveX(p, p.vx * dt)) p.vx = 0
  const hit = moveY(p, p.vy * dt)
  p.onGround = hit.ground
  if (hit.ground) p.vy = 0
  if (hit.head) hitBlock(hit.head.col, hit.head.row)

  if (p.onGround && Math.abs(p.vx) > 8) p.animT += dt
  else p.animT = 0

  if (p.onGround) lastSafe = { x: p.x, feet: p.y + p.h }

  if (p.y > VIEW_H + 24) loseLife()
}

function update(dt) {
  updatePlayer(dt)
  updateMushrooms(dt)

  for (let i = bumps.length - 1; i >= 0; i--) {
    bumps[i].t += dt
    if (bumps[i].t > BUMP_TIME) bumps.splice(i, 1)
  }

  if (status.value === 'playing') {
    camX = clamp(player.x + player.w / 2 - VIEW_W / 2, 0, WORLD_W - VIEW_W)
    if (player.x + player.w >= GOAL_COL * TILE) {
      score.value += 1000
      status.value = 'clear'
    }
  }
}

/* ---------------- 渲染 ---------------- */
function drawHill(x, baseY, w, h, color) {
  ctx.fillStyle = color
  for (let i = 0; i < h; i += 4) {
    const ww = Math.round(w * ((h - i) / h))
    ctx.fillRect(x + Math.round((w - ww) / 2), baseY - i - 4, ww, 4)
  }
}

function drawCloud(x, y) {
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(x + 8, y, 14, 5)
  ctx.fillRect(x + 2, y + 5, 26, 6)
  ctx.fillRect(x + 8, y + 11, 16, 3)
  ctx.fillStyle = 'rgba(176, 205, 245, 0.85)'
  ctx.fillRect(x + 2, y + 10, 26, 1)
}

function drawFar(cam) {
  const span = VIEW_W + 160
  for (let i = 0; i < 8; i++) {
    let x = i * 210 + 40 - cam * 0.35
    x = (((x % span) + span) % span) - 80
    drawCloud(Math.round(x), 14 + (i % 3) * 24)
  }
  for (let i = 0; i < 8; i++) {
    let x = i * 250 + 60 - cam * 0.55
    x = (((x % span) + span) % span) - 100
    drawHill(Math.round(x), GROUND_TOP, 96, 48, '#3fa34d')
  }
}

function drawTiles(cam) {
  const startCol = Math.max(0, Math.floor(cam / TILE) - 1)
  const endCol = Math.min(COLS - 1, Math.ceil((cam + VIEW_W) / TILE) + 1)
  const blink = Math.floor(performance.now() / 400) % 2 === 0

  for (let col = startCol; col <= endCol; col++) {
    if (grid[10][col]) continue
    // 坑洞：用深色填底，避免直接透出天空
    ctx.fillStyle = '#141820'
    ctx.fillRect(col * TILE, GROUND_TOP, TILE, VIEW_H - GROUND_TOP)
  }

  for (let row = 0; row < ROWS; row++) {
    for (let col = startCol; col <= endCol; col++) {
      const type = grid[row][col]
      if (!type) continue
      const x = col * TILE
      const y = row * TILE + Math.round(bumpOffset(col, row))
      if (type === T_GROUND) {
        const top = row === 0 || !grid[row - 1][col]
        ctx.drawImage(top ? tileCache.groundTop : tileCache.groundMid, x, y)
      } else if (type === T_BRICK) {
        ctx.drawImage(tileCache.brick, x, y)
      } else if (type === T_QUESTION) {
        ctx.drawImage(blink ? tileCache.q1 : tileCache.q2, x, y)
      } else if (type === T_USED) {
        ctx.drawImage(tileCache.used, x, y)
      } else {
        ctx.drawImage(tileCache.stone, x, y)
      }
    }
  }
}

function drawGoal() {
  const px = GOAL_COL * TILE + 8
  ctx.fillStyle = '#cfd6e4'
  ctx.fillRect(px, 72, 2, GROUND_TOP - 72)
  ctx.fillStyle = '#ffd93b'
  ctx.fillRect(px - 1, 68, 4, 4)

  const wave = Math.round(Math.sin(performance.now() / 220) * 2)
  ctx.fillStyle = '#e23b3b'
  for (let i = 0; i < 12; i++) {
    const w = i > 5 ? 18 - (i - 5) * 2 : 18
    ctx.fillRect(px - 2 - w + wave, 76 + i, w, 1)
  }
}

function drawMushrooms() {
  for (let i = 0; i < mushrooms.length; i++) {
    const m = mushrooms[i]
    ctx.drawImage(sprites.mushroom, Math.round(m.x), Math.round(m.y))
  }
}

function drawPlayer() {
  if (!player) return
  const set = player.big ? sprites.big : sprites.small
  const dir = player.facing < 0 ? 'left' : 'right'
  const walking = player.onGround && Math.abs(player.vx) > 8
  const frame = walking ? Math.floor(player.animT / 0.14) % 2 : 0
  ctx.drawImage(set[dir][frame], Math.round(player.x), Math.round(player.y))
}

function render() {
  if (!ctx) return
  ctx.setTransform(renderScale, 0, 0, renderScale, 0, 0)
  ctx.imageSmoothingEnabled = !pixelPerfect.value

  const cam = Math.round(camX)
  ctx.fillStyle = '#5c94fc'
  ctx.fillRect(0, 0, VIEW_W, VIEW_H)
  drawFar(cam)

  ctx.save()
  ctx.translate(-cam, 0)
  drawTiles(cam)
  drawGoal()
  drawMushrooms()
  drawPlayer()
  ctx.restore()
}

/* ---------------- 尺寸与循环 ---------------- */
function applyCanvasSize() {
  const canvas = canvasRef.value
  const stage = stageRef.value
  if (!canvas || !stage) return

  const dpr = window.devicePixelRatio || 1
  const avail = Math.max(240, Math.min(stage.clientWidth - 24, 800))
  const scale = pixelPerfect.value ? Math.max(1, Math.floor((avail * dpr) / VIEW_W)) : 1
  const cssW = pixelPerfect.value ? (VIEW_W * scale) / dpr : avail
  const cssH = (cssW * VIEW_H) / VIEW_W

  // 尺寸没变就不重建画布，避免 ResizeObserver 反复清屏
  const sig = `${scale}|${cssW}|${pixelPerfect.value}`
  if (canvas.dataset.sig === sig) return
  canvas.dataset.sig = sig

  canvas.width = VIEW_W * scale
  canvas.height = VIEW_H * scale
  renderScale = scale

  canvas.style.width = `${cssW}px`
  canvas.style.height = `${cssH}px`
  canvas.style.imageRendering = pixelPerfect.value ? 'pixelated' : 'auto'

  metrics.value = {
    dpr,
    scale,
    cssW: Math.round(cssW),
    cssH: Math.round(cssH)
  }
}

function frame(ts) {
  rafId = requestAnimationFrame(frame)
  if (!lastTs) lastTs = ts
  let dt = (ts - lastTs) / 1000
  lastTs = ts
  if (dt > 0.25) dt = 0.25

  if (status.value === 'playing') {
    acc += dt
    let guard = 0
    while (acc >= STEP && guard < 5) {
      update(STEP)
      acc -= STEP
      guard++
      if (status.value !== 'playing') break
    }
    if (acc > STEP) acc = 0
  } else {
    acc = 0
  }

  render()
}

/* ---------------- 键盘 ---------------- */
const JUMP_KEYS = ['ArrowUp', 'w', 'W', ' ']

function maybeStart() {
  if (status.value === 'ready') startGame()
}

function tryJump() {
  if (status.value !== 'playing' || !player) return
  if (player.onGround && !player.jumpLock) {
    player.vy = JUMP_VELOCITY
    player.onGround = false
    player.jumpLock = true
  }
}

function onKeyDown(e) {
  const key = e.key
  const isArrow = key.startsWith('Arrow')

  if (isArrow || key === ' ') {
    if (status.value === 'playing' || status.value === 'ready') e.preventDefault()
  }

  if (key === 'ArrowLeft' || key === 'a' || key === 'A') {
    keys.left = true
    maybeStart()
  } else if (key === 'ArrowRight' || key === 'd' || key === 'D') {
    keys.right = true
    maybeStart()
  } else if (JUMP_KEYS.includes(key)) {
    if (!keys.up) tryJump()
    keys.up = true
    maybeStart()
  } else if (key === 'ArrowDown' || key === 's' || key === 'S') {
    keys.down = true
    maybeStart()
  } else if (key === 'p' || key === 'P' || key === 'Escape') {
    e.preventDefault()
    togglePause()
  } else if (key === 'Enter' && status.value !== 'playing' && status.value !== 'paused') {
    startGame()
  }
}

function onKeyUp(e) {
  const key = e.key
  if (key === 'ArrowLeft' || key === 'a' || key === 'A') keys.left = false
  else if (key === 'ArrowRight' || key === 'd' || key === 'D') keys.right = false
  else if (key === 'ArrowDown' || key === 's' || key === 'S') keys.down = false
  else if (JUMP_KEYS.includes(key)) {
    keys.up = false
    if (player) {
      player.jumpLock = false
      if (status.value === 'playing' && player.vy < -140) player.vy = -140
    }
  }
}

function clearKeys() {
  keys.left = false
  keys.right = false
  keys.up = false
  keys.down = false
}

function onBlur() {
  clearKeys()
  if (status.value === 'playing') status.value = 'paused'
}

/* ---------------- 生命周期 ---------------- */
onMounted(() => {
  ctx = canvasRef.value.getContext('2d')
  buildSprites()
  buildTileCache()
  initGame()
  applyCanvasSize()
  render()

  resizeObserver = new ResizeObserver(() => applyCanvasSize())
  resizeObserver.observe(stageRef.value)

  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  window.addEventListener('blur', onBlur)
  document.addEventListener('visibilitychange', onBlur)
  rafId = requestAnimationFrame(frame)
})

onBeforeUnmount(() => {
  if (rafId) cancelAnimationFrame(rafId)
  rafId = 0
  if (resizeObserver) resizeObserver.disconnect()
  resizeObserver = null
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('keyup', onKeyUp)
  window.removeEventListener('blur', onBlur)
  document.removeEventListener('visibilitychange', onBlur)
})

watch(pixelPerfect, () => {
  applyCanvasSize()
  render()
})
</script>

<template>
  <ToolLayout>
    <div class="stack">
      <div class="hud">
        <span class="chip">🍄 <b>{{ shrooms }}</b></span>
        <span class="chip">分数 <b>{{ score }}</b></span>
        <span class="chip">生命 <b>{{ lives }}</b></span>
        <span class="chip">{{ statusText }}</span>
        <span class="spacer"></span>
        <button
          class="btn small"
          type="button"
          :disabled="status !== 'playing' && status !== 'paused'"
          @click="togglePause"
        >
          {{ status === 'paused' ? '继续' : '暂停' }}
        </button>
        <button class="btn small" type="button" @click="startGame">重新开始</button>
      </div>

      <div ref="stageRef" class="stage">
        <div class="screen-wrap">
          <canvas ref="canvasRef" class="screen" width="320" height="192"></canvas>

          <div v-if="status !== 'playing'" class="overlay">
            <template v-if="status === 'ready'">
              <p class="ov-title">🍄 像素蘑菇乐园</p>
              <p class="ov-sub">← → 移动，↑ / 空格 跳跃，顶一下问号块会掉出蘑菇</p>
              <button class="btn primary" type="button" @click="startGame">开始游戏</button>
            </template>
            <template v-else-if="status === 'paused'">
              <p class="ov-title">已暂停</p>
              <p class="ov-sub">按 P 或点击下方按钮继续</p>
              <button class="btn primary" type="button" @click="togglePause">继续游戏</button>
            </template>
            <template v-else-if="status === 'over'">
              <p class="ov-title">游戏结束</p>
              <p class="ov-sub">得分 {{ score }} · 收集蘑菇 {{ shrooms }} 个</p>
              <button class="btn primary" type="button" @click="startGame">再来一局</button>
            </template>
            <template v-else>
              <p class="ov-title">通关啦！</p>
              <p class="ov-sub">得分 {{ score }} · 收集蘑菇 {{ shrooms }} 个</p>
              <button class="btn primary" type="button" @click="startGame">再玩一次</button>
            </template>
          </div>
        </div>
      </div>

      <p class="muted small hint">
        ↑ / 空格 跳跃（长按跳得更高）· ← → 移动 · ↓ 蹲下并在空中快速下落 · P 暂停 · Enter 开始
      </p>

      <section class="pixel-panel">
        <div class="panel-head">
          <h2>像素渲染测试</h2>
          <label class="check">
            <input v-model="pixelPerfect" type="checkbox" />
            整数倍像素缩放
          </label>
        </div>

        <p class="metrics mono">
          逻辑画布 320 × 192 · 缩放 ×{{ metrics.scale }} · CSS {{ metrics.cssW }} ×
          {{ metrics.cssH }} · DPR {{ metrics.dpr }}
        </p>

        <ul class="notes">
          <li>画面里的人物、砖块、云朵全部由 1px 方块拼出来，没有任何图片资源。</li>
          <li>
            勾选后按设备像素比取整数倍放大，每个逻辑像素正好铺满整数个设备像素，边缘干净不发虚。
          </li>
          <li>
            取消勾选则让浏览器把 320×192 的位图直接拉伸到任意宽度，双线性插值会把像素抹成半透明灰边——这正是像素风需要
            <code>image-rendering: pixelated</code> 的原因。
          </li>
        </ul>
      </section>
    </div>
  </ToolLayout>
</template>

<style scoped>
.hud {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.chip {
  padding: 3px 10px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--surface-soft);
  font-size: 13px;
  color: var(--muted);
}

.chip b {
  color: var(--text);
  font-variant-numeric: tabular-nums;
}

.spacer {
  flex: 1;
}

.stage {
  display: flex;
  justify-content: center;
  padding: 12px;
  border-radius: var(--radius);
  background: #0d1017;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.06);
}

.screen-wrap {
  position: relative;
  line-height: 0;
}

.screen {
  display: block;
  border-radius: 4px;
  image-rendering: pixelated;
}

.overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 16px;
  border-radius: 4px;
  background: rgba(8, 11, 18, 0.72);
  color: #f2f5ff;
  line-height: 1.6;
  text-align: center;
}

.ov-title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 1px;
}

.ov-sub {
  max-width: 340px;
  margin: 0;
  font-size: 13px;
  color: rgba(242, 245, 255, 0.78);
}

.small {
  font-size: 13px;
}

.hint {
  margin: 0;
}

.pixel-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface-soft);
}

.panel-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.panel-head h2 {
  font-size: 15px;
}

.metrics {
  margin: 0;
  font-size: 12px;
  color: var(--muted);
}

.notes {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0;
  padding-left: 18px;
  font-size: 13px;
  color: var(--muted);
}

.notes code {
  padding: 1px 5px;
  border-radius: 5px;
  background: var(--surface);
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--text);
}

@media (max-width: 720px) {
  .ov-title {
    font-size: 15px;
  }

  .ov-sub {
    font-size: 12px;
  }
}
</style>
