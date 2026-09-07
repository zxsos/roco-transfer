// 房间同步层。
//
// 这个模块刻意与 UI 解耦：App.vue 只调用这里暴露的函数并读 roomState，
// 不直接发请求。这样同步策略（轮询间隔、冲突处理、退避）集中在一处，改起来不会
// 散落到组件里。

import { reactive, ref } from 'vue'

// CODE_LEN 与服务端 ROOM_RE 的 {16} 对应。
const CODE_LEN = 16
const CODE_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789'

// POLL_MS 轮询间隔。
//
// **不能更短**：KV 免费额度是账号级 10 万读/天。10 人 × 4 秒轮询 ≈ 21.6 万次/天，
// 会直接超。15 秒 + 后台暂停后降到几千次/天，安全。
// 另外 KV 本身最长 60s 才全局生效，秒级轮询也换不来更快的收敛，只是制造
// 「我存了却没同步」的错觉。
const POLL_MS = 15000

// 本地改动后延迟推送：连续点几下确认不该产生多次写（写限额 1000/天，比读更紧）。
const PUSH_DEBOUNCE_MS = 800

export const roomState = reactive({
  code: '',
  joined: false,
  rev: 0,
  syncing: false,
  // 'idle' 未加入 / 'synced' 已同步 / 'syncing' 同步中 / 'error' 出错 / 'gone' 房间已删
  status: 'idle',
  lastError: '',
  updatedAt: 0,
})

// 待删除的 id 队列：删除成员时随下一次提交一起发给服务端（见 room.js 的说明，
// 删除不设独立端点）。
let pendingDeletions = []
let pollTimer = null
let pushTimer = null

// applyRemote / readLocal 由 App.vue 注入，避免本模块反向依赖组件内部状态。
let hooks = { readLocal: () => ({}), applyRemote: () => {} }

export function setRoomHooks(h) {
  hooks = Object.assign(hooks, h || {})
}

function newCode() {
  const buf = new Uint8Array(CODE_LEN)
  // 优先用 CSPRNG；浏览器基本都支持。getRandomValues 无 Secure Context 限制。
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(buf)
  } else {
    for (let i = 0; i < CODE_LEN; i++) buf[i] = Math.floor(Math.random() * 256)
  }
  let s = ''
  for (let i = 0; i < CODE_LEN; i++) s += CODE_CHARS[buf[i] % CODE_CHARS.length]
  return s
}

function apiUrl(code) {
  return `api/room?id=${encodeURIComponent(code)}`
}

async function request(method, code, body) {
  const res = await fetch(apiUrl(code), {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let data = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = null
  }
  return { status: res.status, data }
}

// applySnapshot 把远端快照交给 UI，并记住 rev。
function applySnapshot(data) {
  if (!data) return
  roomState.rev = Number(data.rev) || 0
  roomState.updatedAt = Number(data.updatedAt) || 0
  if (data.config) hooks.applyRemote(data.config)
}

export async function createRoom() {
  const code = newCode()
  roomState.code = code
  roomState.joined = true
  roomState.status = 'syncing'
  roomState.lastError = ''
  const r = await request('POST', code, {
    baseRev: 0,
    config: hooks.readLocal(),
    deletions: [],
  })
  if (r.status >= 400) {
    roomState.status = 'error'
    roomState.lastError = (r.data && r.data.error) || `创建失败(${r.status})`
    return false
  }
  applySnapshot(r.data)
  roomState.status = 'synced'
  startPolling()
  return true
}

export async function joinRoom(code) {
  const c = String(code || '').trim().toLowerCase()
  roomState.status = 'syncing'
  roomState.lastError = ''
  const r = await request('GET', c)
  if (r.status === 410) {
    roomState.status = 'gone'
    roomState.lastError = '房间已被删除'
    return false
  }
  if (r.status >= 400) {
    roomState.status = 'error'
    roomState.lastError = (r.data && r.data.error) || `加入失败(${r.status})`
    return false
  }
  roomState.code = c
  roomState.joined = true
  applySnapshot(r.data)
  roomState.status = 'synced'
  startPolling()
  return true
}

export function leaveRoom() {
  stopPolling()
  roomState.code = ''
  roomState.joined = false
  roomState.rev = 0
  roomState.status = 'idle'
  roomState.lastError = ''
  pendingDeletions = []
}

// markDeleted 记住一个待删 id，随下次提交发出。
export function markDeleted(id) {
  if (id && !pendingDeletions.includes(id)) pendingDeletions.push(id)
}

// pushLocal 提交本地改动。带 debounce，连续调用只发一次。
export function pushLocal() {
  if (!roomState.joined) return
  if (pushTimer) clearTimeout(pushTimer)
  pushTimer = setTimeout(() => pushLocalNow(), PUSH_DEBOUNCE_MS)
}

export async function pushLocalNow() {
  if (!roomState.joined) return
  if (pushTimer) {
    clearTimeout(pushTimer)
    pushTimer = null
  }
  roomState.syncing = true
  roomState.status = 'syncing'
  const deletions = pendingDeletions.slice()
  const r = await request('POST', roomState.code, {
    baseRev: roomState.rev,
    config: hooks.readLocal(),
    deletions,
  })
  roomState.syncing = false
  if (r.status === 410) {
    roomState.status = 'gone'
    roomState.lastError = '房间已被删除'
    return false
  }
  if (r.status >= 400) {
    roomState.status = 'error'
    roomState.lastError = (r.data && r.data.error) || `同步失败(${r.status})`
    return false
  }
  // 只在确认送达后才清空待删队列，避免网络失败时删除丢失
  pendingDeletions = pendingDeletions.filter((d) => !deletions.includes(d))
  applySnapshot(r.data)
  roomState.status = 'synced'
  roomState.lastError = ''
  return true
}

export async function deleteRoom() {
  if (!roomState.joined) return false
  const r = await request('DELETE', roomState.code)
  if (r.status >= 400) {
    roomState.status = 'error'
    roomState.lastError = (r.data && r.data.error) || `删除失败(${r.status})`
    return false
  }
  leaveRoom()
  roomState.status = 'gone'
  roomState.lastError = '房间已删除，现为本地模式'
  return true
}

// poll 拉一次远端。rev 没变就不动 UI —— 避免打断正在输入的内容。
export async function poll() {
  if (!roomState.joined) return
  const r = await request('GET', roomState.code)
  if (r.status === 410) {
    stopPolling()
    roomState.code = ''
    roomState.joined = false
    roomState.status = 'gone'
    roomState.lastError = '房间已被创建者删除，已退回本地模式'
    return
  }
  if (r.status >= 400) {
    // 单次失败不打断使用，下次轮询自然恢复
    roomState.status = 'error'
    roomState.lastError = (r.data && r.data.error) || `拉取失败(${r.status})`
    return
  }
  if (r.data && Number(r.data.rev) !== roomState.rev) {
    applySnapshot(r.data)
  }
  roomState.status = 'synced'
  roomState.lastError = ''
}

export function startPolling() {
  stopPolling()
  if (!roomState.joined) return
  pollTimer = setInterval(() => {
    // 页面在后台时不轮询：省额度，也避免用户回来看到一堆过期请求
    if (typeof document !== 'undefined' && document.hidden) return
    poll()
  }, POLL_MS)
}

export function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

// 从 URL 的 ?r= 参数读取房间码（分享链接用）。
export function codeFromUrl() {
  if (typeof window === 'undefined') return ''
  const v = new URLSearchParams(window.location.search).get('r')
  return v ? String(v).trim().toLowerCase() : ''
}

// roomUrl 生成可分享的链接。
export function roomUrl(code) {
  if (typeof window === 'undefined') return ''
  const u = new URL(window.location.href)
  u.search = '?r=' + encodeURIComponent(code)
  u.hash = ''
  return u.toString()
}

// 页面重新可见时立刻拉一次，不用等下一个轮询周期。
export function installVisibilityHook() {
  if (typeof document === 'undefined') return
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && roomState.joined) poll()
  })
}
