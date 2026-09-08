// 房间 API —— Cloudflare Pages Function + Workers KV
//
// 一个房间 = KV 里的一个 key，值为下面这个结构：
//   { rev, updatedAt, config: { elfName1, elfName2, maxGaps, people[], friendships[][] }, tombstones: [{id, at}] }
//
// 设计要点（并发是这里唯一的难点）：
//
// 1. **删除并入 POST，不设独立端点**。两个端点 = 两处「读-改-写」= 墓碑与 upsert
//    互相覆盖的竞态窗口。客户端把 deletions 随本次提交一起发过来，服务端一次性处理。
//
// 2. **upsert 而非整份覆盖**。POST 只提交「我这边的 people」，远端有而提交里没有的
//    一律保留（提交方可能只是还没拉到最新）。只有显式列进 deletions 的才移除。
//
// 3. **标量字段用 baseRev 保护**。elfName / maxGaps 这类整体字段，若客户端基于旧
//    rev 提交，会把别人刚改的精灵名回退掉。故只有 baseRev === 远端 rev 时才应用。
//
// 4. **删房间先立墓碑再删**。KV 是最终一致的，直接删的话期间他人 POST 会把房间
//    「复活」。故先写一个 10 分钟的 deleted 标记，POST 见到标记即拒（410）。

const ROOM_RE = /^[a-z0-9]{16}$/
const PERSON_RE = /^[A-Za-z0-9_-]{1,32}$/
const AVATAR_RE = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/

const ROOM_TTL = 259200 // 72 小时
const DELETED_TTL = 600 // 删房标记保留 10 分钟，覆盖 KV 传播延迟
const MAX_BODY = 512 * 1024
const MAX_PEOPLE = 20
const MAX_AVATAR = 64 * 1024
const TOMB_KEEP_MS = 6 * 3600 * 1000 // 墓碑保留 6 小时
const TOMB_MAX = 100

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      // 不缓存：KV 本身已有最长 60s 的生效延迟，别再叠一层浏览器缓存
      'Cache-Control': 'no-store',
    },
  })

const keyOf = (id) => `room:${id}`
const delKeyOf = (id) => `room:${id}:deleted`

function emptyConfig() {
  return {
    elfName1: '新月鹭',
    elfName2: '热团团',
    elfImg1: '',
    elfImg2: '',
    maxGaps: 0,
    people: [],
    friendships: [],
  }
}

// sanitizePerson 校验并收敛一个人的数据；非法则返回 null（该条被丢弃）。
function sanitizePerson(p) {
  if (!p || typeof p !== 'object') return null
  const id = String(p.id ?? '').trim()
  if (!PERSON_RE.test(id)) return null
  let name = typeof p.name === 'string' ? p.name.trim().slice(0, 24) : ''
  // 头像只认 png/jpeg/webp 的 data URL，且限 64KB。
  // **禁 svg**：data:image/svg+xml 可携带脚本，拼进页面就是 XSS。
  let avatar = ''
  if (typeof p.avatar === 'string' && AVATAR_RE.test(p.avatar) && p.avatar.length <= MAX_AVATAR) {
    avatar = p.avatar
  }
  const tier = p.tier === 'premium' ? 'premium' : 'normal'
  const needElf = ['elf1', 'elf2', 'any'].includes(p.needElf) ? p.needElf : 'elf1'
  // 车头自购价:非官方渠道购买时的实际花费。
  // 上限 = 该档次官方价 —— 比官方还贵的话本来就该直接在官方买,填进来只会
  // 让账上多一笔没必要的钱。空 / 非法一律存 null(= 按官方价)。
  let headPrice = null
  const hp = Number(p.headPrice)
  const hpMax = tier === 'premium' ? 128 : 68
  if (Number.isFinite(hp) && hp > 0 && hp <= hpMax) headPrice = Math.round(hp * 100) / 100
  return {
    id,
    name,
    userId: typeof p.userId === 'string' ? p.userId.trim().slice(0, 32) : '',
    avatar,
    tier,
    needElf,
    isHead: !!p.isHead,
    headPrice,
  }
}

// safeImgUrl 收敛一个介绍图 URL:只放行 http(s) 外链,不合法则沿用旧值。
// 空串是合法的 —— 表示「不显示介绍图」。
function safeImgUrl(v, fallback) {
  if (typeof v !== 'string') return typeof fallback === 'string' ? fallback : ''
  const s = v.trim()
  if (s === '') return ''
  if (s.length > 2048) return typeof fallback === 'string' ? fallback : ''
  if (!/^https?:\/\//i.test(s)) return typeof fallback === 'string' ? fallback : ''
  return s
}

function normPair(pair) {
  if (!Array.isArray(pair) || pair.length !== 2) return null
  const a = String(pair[0] ?? '').trim()
  const b = String(pair[1] ?? '').trim()
  if (!PERSON_RE.test(a) || !PERSON_RE.test(b) || a === b) return null
  return a < b ? [a, b] : [b, a]
}

function pruneTombstones(list, now) {
  let out = (Array.isArray(list) ? list : []).filter((t) => t && typeof t.id === 'string')
  // 老格式可能是裸字符串，统一成对象
  out = out.map((t) => ({ id: String(t.id), at: Number(t.at) || now }))
  out = out.filter((t) => now - t.at < TOMB_KEEP_MS)
  // FIFO 截断：房间反复增删时不会无限增长
  return out.slice(-TOMB_MAX)
}

async function load(env, id) {
  const raw = await env.ROOMS.get(keyOf(id))
  if (!raw) return null
  const v = JSON.parse(raw)
  return {
    rev: Number(v.rev) || 0,
    updatedAt: Number(v.updatedAt) || 0,
    config: Object.assign(emptyConfig(), v.config || {}),
    tombstones: Array.isArray(v.tombstones) ? v.tombstones : [],
  }
}

async function save(env, id, room) {
  await env.ROOMS.put(keyOf(id), JSON.stringify(room), { expirationTtl: ROOM_TTL })
}

export async function onRequestGet({ request, env }) {
  const id = (new URL(request.url).searchParams.get('id') || '').trim()
  if (!ROOM_RE.test(id)) return json({ error: '房间码格式不正确' }, 400)

  const room = await load(env, id)
  if (!room) {
    // 区分「从不存在」与「刚被删除」：后者要让客户端明确退回本地模式
    const gone = await env.ROOMS.get(delKeyOf(id))
    return gone ? json({ error: '房间已被删除' }, 410) : json({ error: '房间不存在' }, 404)
  }
  return json({ rev: room.rev, updatedAt: room.updatedAt, config: room.config })
}

export async function onRequestPost({ request, env }) {
  const id = (new URL(request.url).searchParams.get('id') || '').trim()
  if (!ROOM_RE.test(id)) return json({ error: '房间码格式不正确' }, 400)

  const ct = request.headers.get('content-type') || ''
  if (!ct.includes('application/json')) return json({ error: '需要 application/json' }, 415)

  const len = Number(request.headers.get('content-length') || 0)
  if (len > MAX_BODY) return json({ error: '请求体过大' }, 413)

  // 房间已删 → 拒绝写入，避免复活
  if (await env.ROOMS.get(delKeyOf(id))) return json({ error: '房间已被删除' }, 410)

  let body
  try {
    body = await request.json()
  } catch {
    return json({ error: 'JSON 解析失败' }, 400)
  }

  const now = Date.now()
  const room = (await load(env, id)) || {
    rev: 0,
    updatedAt: now,
    config: emptyConfig(),
    tombstones: [],
  }

  const submitted = body && typeof body.config === 'object' && body.config ? body.config : {}
  const deletions = Array.isArray(body.deletions) ? body.deletions.map(String) : []
  const baseRev = Number(body.baseRev)

  // ① 先收集墓碑：本次删除 + 历史墓碑
  const tomb = new Map()
  for (const t of pruneTombstones(room.tombstones, now)) tomb.set(t.id, t.at)
  for (const d of deletions) if (PERSON_RE.test(d)) tomb.set(d, now)

  // ② 远端 people 去掉墓碑中的
  const base = (Array.isArray(room.config.people) ? room.config.people : []).filter(
    (p) => p && !tomb.has(String(p.id)),
  )

  // ③ 提交的 people 去重、校验，同样过滤墓碑
  const sub = []
  const seen = new Set()
  for (const raw of Array.isArray(submitted.people) ? submitted.people : []) {
    const p = sanitizePerson(raw)
    if (!p || tomb.has(p.id) || seen.has(p.id)) continue
    seen.add(p.id)
    sub.push(p)
  }

  // ④ upsert：远端为底，提交覆盖
  const byId = new Map()
  for (const p of base) {
    const sp = sanitizePerson(p)
    if (sp && !byId.has(sp.id)) byId.set(sp.id, sp)
  }
  for (const p of sub) byId.set(p.id, p)

  if (byId.size > MAX_PEOPLE) return json({ error: `人数超过上限 ${MAX_PEOPLE}` }, 422)

  // ⑤ 标量字段仅在基于最新 rev 提交时才应用，防止陈旧快照回退别人的改动
  const cfg = {
    elfName1: room.config.elfName1,
    elfName2: room.config.elfName2,
    maxGaps: room.config.maxGaps,
    people: [...byId.values()],
    friendships: [],
  }
  if (baseRev === room.rev) {
    if (typeof submitted.elfName1 === 'string') cfg.elfName1 = submitted.elfName1.slice(0, 16)
    if (typeof submitted.elfName2 === 'string') cfg.elfName2 = submitted.elfName2.slice(0, 16)
    // 介绍图只收 http(s) 外链,长度也限制一下(URL 不该超过 2048)。
    // **拒掉 data: 开头的**:那是图片本体,几百 KB 会撑爆 KV 单值。
    cfg.elfImg1 = safeImgUrl(submitted.elfImg1, room.config.elfImg1)
    cfg.elfImg2 = safeImgUrl(submitted.elfImg2, room.config.elfImg2)
    const g = Number(submitted.maxGaps)
    if (Number.isFinite(g) && g >= 0 && g <= 5) cfg.maxGaps = Math.round(g)
  }

  // 好友关系：远端 ∪ 提交，只保留双方都还存在的
  const pairs = new Set()
  for (const list of [room.config.friendships, submitted.friendships]) {
    for (const pair of Array.isArray(list) ? list : []) {
      const n = normPair(pair)
      if (n && byId.has(n[0]) && byId.has(n[1])) pairs.add(n[0] + '|' + n[1])
    }
  }
  cfg.friendships = [...pairs].map((k) => k.split('|'))

  // 车头唯一
  const heads = cfg.people.filter((p) => p.isHead)
  if (heads.length > 1) heads.slice(1).forEach((p) => (p.isHead = false))

  const next = {
    // rev 用远端的自增，不采信客户端 —— 客户端的 rev 可能已过期
    rev: room.rev + 1,
    updatedAt: now,
    config: cfg,
    tombstones: [...tomb].map(([id, at]) => ({ id, at })),
  }
  await save(env, id, next)

  // 直接回写后的全量快照：客户端省掉一次轮询，也顺带把自己没拉到的改动带回去
  return json({ rev: next.rev, updatedAt: next.updatedAt, config: next.config })
}

export async function onRequestDelete({ request, env }) {
  const id = (new URL(request.url).searchParams.get('id') || '').trim()
  if (!ROOM_RE.test(id)) return json({ error: '房间码格式不正确' }, 400)

  // 先立标记（10 分钟），期间任何 POST 都会被拒，避免 KV 最终一致导致房间复活
  await env.ROOMS.put(delKeyOf(id), JSON.stringify({ deletedAt: Date.now() }), {
    expirationTtl: DELETED_TTL,
  })
  await env.ROOMS.delete(keyOf(id))
  return json({ ok: true })
}
