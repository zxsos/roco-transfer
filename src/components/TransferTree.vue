<template>
  <!-- 传火结构树。
       豪华版能送 2 张副券,所以结构不是一条链而是**树**:一个源头可能同时
       激活两个人。分层列表(每层横排)画不出这种分叉 —— 同一层的两个人的
       上家是谁完全看不出来。这里按真实父子关系布点:源头在顶/在左,每条边
       就是一次副券赠送。 -->
  <div class="tree-wrap">
    <div class="tree-scroll">
      <div class="tree-canvas" :style="{ width: size.w + 'px', height: size.h + 'px' }">
        <svg class="tree-svg" :width="size.w" :height="size.h" :viewBox="`0 0 ${size.w} ${size.h}`" aria-hidden="true">
          <path
            v-for="e in edges"
            :key="'e-' + e.id"
            :d="e.d"
            class="tree-edge"
            :class="{ stranger: !e.friend }"
          />
        </svg>

        <div
          v-for="n in nodes"
          :key="'n-' + n.id"
          class="tree-node"
          :class="n.roleClass"
          :style="{ left: n.pos.x + 'px', top: n.pos.y + 'px', width: n.w + 'px' }"
          :title="n.title"
        >
          <div
            class="tree-avatar"
            :class="{ 'has-image': n.avatar }"
            :style="n.avatar ? { backgroundImage: `url(${n.avatar})` } : null"
          >
            <span v-if="!n.avatar">{{ n.initial }}</span>
          </div>
          <div class="tree-name">{{ n.name }}</div>
          <div class="tree-meta">
            <span class="tree-elf">{{ n.elfName }}</span>
            <span class="tree-tier">{{ n.tier === 'premium' ? '豪华' : '普通' }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="tree-legend">
      <span class="tree-legend-item"><i class="dot root"></i>源头（自购）</span>
      <span class="tree-legend-item"><i class="dot mid"></i>中间人</span>
      <span class="tree-legend-item"><i class="dot leaf"></i>末端</span>
      <span class="tree-legend-item"><i class="line stranger"></i>虚线：需先加好友</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  cards: { type: Array, default: () => [] },
})

// NODE_H 必须**手算到刚好装下**并留余量:节点是 absolute 定位的固定高盒子,
// 内容一旦超出就会被 flex 压缩,而名字带 overflow:hidden —— 表现就是名字被切一半。
// 逐项:padding 10+10 / 头像 34 / gap 5×2 / 名字最多两行 33 / 精灵行 14 / border 2
//     = 113;再扣掉 border-box 的 padding 20 + border 2 后内容需 91,
//     120 给到约 7px 余量 —— 字体渲染差异不至于再把它挤出去。
const NODE_H = 120
const GAP_X = 18
const GAP_Y = 48
// MAX_W 不用太大:名字放不下时靠换行(最多两行)解决,而不是无限把节点撑宽
// —— 横向的链会被拉得很长。144 − 26(padding) ≈ 8.7 个中文字,两行 ≈ 17 字。
const MIN_W = 92
const MAX_W = 144
const PAD_X = 13

// textWidth 用 canvas 量文字像素宽。
//
// 节点宽度**必须跟着名字走**:写死宽度的话,四个字以上的名字只能被 ellipsis
// 切掉一半(「小火龙骑士」显示成「小火龙…」),而这工具里认人全靠名字。
// 布局是纯计算的(不等 DOM 渲染),所以宽度要在布局前就拿到 ——
// canvas 的 measureText 是同步的,正合适。
//
// 字体只需近似:中文是全角,不同 sans-serif 的宽度差异在 1px 量级,
// 再用 MIN_W / PAD_X 兜底足够,不必去解析 CSS 里继承下来的 font-family。
let measureCtx = null
function textWidth(text, font) {
  if (typeof document === 'undefined') return String(text).length * 13
  if (!measureCtx) measureCtx = document.createElement('canvas').getContext('2d')
  measureCtx.font = font
  return measureCtx.measureText(text).width
}

const childrenOf = computed(() => {
  const m = new Map()
  for (const c of props.cards) {
    if (c.parentId == null) continue
    if (!m.has(c.parentId)) m.set(c.parentId, [])
    m.get(c.parentId).push(c.person.id)
  }
  return m
})

const rootIds = computed(() => props.cards.filter((c) => c.parentId == null).map((c) => c.person.id))

const depthOf = computed(() => {
  const m = new Map()
  for (const r of rootIds.value) {
    const stack = [[r, 0]]
    while (stack.length) {
      const [id, d] = stack.pop()
      m.set(id, d)
      for (const k of childrenOf.value.get(id) || []) stack.push([k, d + 1])
    }
  }
  return m
})

// nodeW 每个节点自己需要的宽度:头像 / 名字 / 「精灵 + 档次」三行取最宽。
const nodeW = computed(() => {
  const m = new Map()
  for (const c of props.cards) {
    const name = c.person.name || '未命名'
    const nameW = textWidth(name, '600 13px sans-serif')
    const elfW = textWidth(c.myElfName || '', '11px sans-serif')
    const tierW = 30 // 「豪华」「普通」胶囊的固定宽
    const content = Math.max(36, nameW, elfW + 5 + tierW)
    m.set(c.person.id, Math.round(Math.min(MAX_W, Math.max(MIN_W, content + PAD_X * 2))))
  }
  return m
})

const widthOf = (id) => nodeW.value.get(id) || MIN_W

// slots 给叶子按顺序分配横向槽位(横着画时用),父节点取子节点槽位的中点。
const slots = computed(() => {
  const out = new Map()
  let next = 0
  const walk = (id) => {
    const kids = childrenOf.value.get(id) || []
    if (!kids.length) {
      const slot = next
      next += 1
      out.set(id, slot)
      return slot
    }
    const ss = kids.map((k) => walk(k))
    const slot = (Math.min(...ss) + Math.max(...ss)) / 2
    out.set(id, slot)
    return slot
  }
  for (const r of rootIds.value) walk(r)
  return out
})

const maxDepth = computed(() => {
  let d = 0
  for (const v of depthOf.value.values()) d = Math.max(d, v)
  return d + 1
})

const leafCount = computed(() => new Set(
  props.cards.filter((c) => !(childrenOf.value.get(c.person.id) || []).length).map((c) => c.person.id)
).size)

// horizontal 细长的链横着画。
// 传火大多是链:20 人的链竖着要滚近 3000px,横过来高度固定、左右滑就行。
// 分叉多(叶子数 ≥ 层数)时竖着画才是「树」的样子,保持根在顶部。
const horizontal = computed(() => maxDepth.value > leafCount.value)

// subW 子树占的总宽度(竖着画时用):自己一个节点,和所有子树并排,取大者。
const subW = computed(() => {
  const m = new Map()
  const walk = (id) => {
    const kids = childrenOf.value.get(id) || []
    if (!kids.length) {
      m.set(id, widthOf(id))
      return m.get(id)
    }
    const total = kids.map(walk).reduce((a, b) => a + b, 0) + GAP_X * (kids.length - 1)
    const v = Math.max(widthOf(id), total)
    m.set(id, v)
    return v
  }
  for (const r of rootIds.value) walk(r)
  return m
})

// colW 横向画时每一列(每一层)的宽度 = 该层最宽的节点。
// 节点宽度各不相同,列宽取最大值才能保证同层不会互相压到。
const colW = computed(() => {
  const arr = []
  for (const [id, d] of depthOf.value) arr[d] = Math.max(arr[d] || 0, widthOf(id))
  return arr
})

const layout = computed(() => {
  const pos = new Map()
  const horiz = horizontal.value

  if (horiz) {
    // 横着画:列 x 累加,行 y 用叶子槽位
    const xs = []
    let acc = 0
    for (let d = 0; d < colW.value.length; d++) {
      xs[d] = acc
      acc += (colW.value[d] || MIN_W) + GAP_X * 2
    }
    for (const [id, d] of depthOf.value) {
      pos.set(id, { x: xs[d] || 0, y: (slots.value.get(id) || 0) * (NODE_H + GAP_Y) })
    }
    return pos
  }

  // 竖着画:子树左右排布,父节点在自己子树范围内居中
  const place = (id, left, depth) => {
    const w = widthOf(id)
    const sw = subW.value.get(id) || w
    pos.set(id, { x: left + (sw - w) / 2, y: depth * (NODE_H + GAP_Y) })
    let cursor = left
    for (const k of childrenOf.value.get(id) || []) {
      place(k, cursor, depth + 1)
      cursor += (subW.value.get(k) || widthOf(k)) + GAP_X
    }
  }
  let cursor = 0
  for (const r of rootIds.value) {
    place(r, cursor, 0)
    cursor += (subW.value.get(r) || widthOf(r)) + GAP_X * 2 // 多棵树之间留大间隙
  }
  return pos
})

const size = computed(() => {
  let w = 0
  let h = 0
  for (const [id, p] of layout.value) {
    w = Math.max(w, p.x + widthOf(id))
    h = Math.max(h, p.y + NODE_H)
  }
  return { w, h }
})

const edges = computed(() => {
  const out = []
  const horiz = horizontal.value
  for (const c of props.cards) {
    if (c.parentId == null) continue
    const to = layout.value.get(c.person.id)
    const from = layout.value.get(c.parentId)
    if (!to || !from) continue
    const fw = widthOf(c.parentId)
    // 竖着画:父底边中点 → 子顶边中点;横着画:父右边中点 → 子左边中点
    const sx = horiz ? from.x + fw : from.x + fw / 2
    const sy = horiz ? from.y + NODE_H / 2 : from.y + NODE_H
    const tx = horiz ? to.x : to.x + widthOf(c.person.id) / 2
    const ty = horiz ? to.y + NODE_H / 2 : to.y
    const mid = horiz ? sx + (tx - sx) / 2 : sy + (ty - sy) / 2
    const d = horiz
      ? `M ${sx} ${sy} L ${mid} ${sy} L ${mid} ${ty} L ${tx} ${ty}`
      : `M ${sx} ${sy} L ${sx} ${mid} L ${tx} ${mid} L ${tx} ${ty}`
    out.push({
      id: c.person.id,
      d,
      // 非好友的赠送段标出来:副券只能送给好友,这段需要他们先加好友
      friend: (c.friendHints || []).some((h) => h.type === 'prev' && h.isFriend),
    })
  }
  return out
})

const nodes = computed(() =>
  props.cards.map((c) => {
    const name = c.person.name || '未命名'
    return {
      id: c.person.id,
      pos: layout.value.get(c.person.id) || { x: 0, y: 0 },
      w: widthOf(c.person.id),
      name,
      initial: Array.from(name.trim())[0] || '?',
      avatar: c.person.avatar || '',
      elfName: c.myElfName,
      tier: c.tier,
      roleClass: c.role === '源头' ? 'is-root' : (c.children || []).length ? 'is-mid' : 'is-leaf',
      title: `${name} · ${c.role} · ${c.myElfName}（${c.tier === 'premium' ? '豪华' : '普通'}）`,
    }
  })
)
</script>

<style scoped>
.tree-wrap {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* 树可能很宽(分叉多或人多),横向滚动;纵向不滚,免得和页面滚动打架 */
.tree-scroll {
  overflow-x: auto;
  overflow-y: hidden;
  padding: 6px 2px 10px;
  -webkit-overflow-scrolling: touch;
}

.tree-canvas {
  position: relative;
  margin: 0 auto;
}

.tree-svg {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: visible;
}

.tree-edge {
  fill: none;
  stroke: var(--border);
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* 非好友段:橙色虚线。好友是软约束(不勾也能出方案),所以只做提醒不阻断 */
.tree-edge.stranger {
  stroke: var(--accent);
  stroke-width: 1.8;
  stroke-dasharray: 5 4;
}

/* ===== 节点 ===== */
.tree-node {
  position: absolute;
  height: 116px;
  display: flex;
  flex-direction: column;
  align-items: center;
  /* 高度固定,内容整体居中:名字一行两行都居中,不会顶到边上 */
  justify-content: center;
  gap: 5px;
  padding: 10px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--surface-solid);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04), 0 4px 14px rgba(0, 0, 0, 0.045);
  transition: transform 0.2s var(--ease-out, ease), box-shadow 0.2s var(--ease-out, ease);
}

/* 左侧色条标识角色。用绝对定位而不是 border-left:后者会吃掉内容宽度,
   让「宽度刚好包住名字」的计算失准。 */
.tree-node::before {
  content: '';
  position: absolute;
  left: -1px;
  top: 14px;
  bottom: 14px;
  width: 3px;
  border-radius: 0 3px 3px 0;
  background: var(--role);
}

.tree-node:hover {
  transform: translateY(-2px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05), 0 10px 24px rgba(0, 0, 0, 0.09);
}

.tree-node.is-root { --role: #FF3B30; }
.tree-node.is-mid  { --role: #007AFF; }
.tree-node.is-leaf { --role: #34C759; }

.tree-avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
  color: #fff;
  flex: none;
  /* 角色色细环:比给整个卡片描边更轻,又能在人多的树里一眼分清角色 */
  box-shadow: 0 0 0 2px var(--surface-solid), 0 0 0 3.5px var(--role);
}

.is-root .tree-avatar { background: linear-gradient(135deg, #FF6B6B, #FF3B30); }
.is-mid  .tree-avatar { background: linear-gradient(135deg, #5AC8FA, #007AFF); }
.is-leaf .tree-avatar { background: linear-gradient(135deg, #63E6BE, #34C759); }

.tree-avatar.has-image {
  background-size: cover;
  background-position: center;
  color: transparent;
}

.tree-name {
  /* flex: none 是关键:不加的话空间不够时 flex 会压缩这一行,
     配合下面的 overflow 就把名字切掉了 —— 这正是「名字显示不全」的根因 */
  flex: none;
  max-width: 100%;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.25;
  text-align: center;
  color: var(--text);
  /* 长名字换行到第二行(最多两行),而不是继续把节点撑宽。
     NODE_H 已按两行预留,所以换行不会挤掉别的内容。 */
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  overflow-wrap: anywhere;
}

.tree-meta {
  flex: none;
  display: flex;
  align-items: center;
  gap: 5px;
  max-width: 100%;
  min-width: 0;
}

.tree-elf {
  font-size: 11px;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tree-tier {
  flex: none;
  padding: 1px 6px;
  border-radius: var(--radius-full, 999px);
  background: var(--fill);
  color: var(--text-tertiary);
  font-size: 10px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

/* ===== 图例 ===== */
.tree-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 14px;
  font-size: 11.5px;
  color: var(--text-tertiary);
}

.tree-legend-item {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.tree-legend .dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  flex: none;
}

.tree-legend .dot.root { background: #FF3B30; }
.tree-legend .dot.mid  { background: #007AFF; }
.tree-legend .dot.leaf { background: #34C759; }

.tree-legend .line {
  width: 16px;
  height: 0;
  border-top: 2px dashed var(--accent);
  flex: none;
}

@media (prefers-reduced-motion: reduce) {
  .tree-node {
    transition: none;
  }
  .tree-node:hover {
    transform: none;
  }
}
</style>
