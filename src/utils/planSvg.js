// 把方案画成一张 SVG。
//
// 为什么不用 html2canvas 截 DOM:截图按**页面布局**来,树状图一横向滚动,
// 要么被裁、要么把画布撑到两三千像素宽。
//
// 这里按数据重画一张,宽度固定 750。关键是**所有个人信息都标注在树节点里**,
// 不再单独列一张结算卡列表 —— 信息不重复,图也短得多(12 人从 2481px 降到约 800px)。
// 只有全局信息(费用总览、收款汇总、好友提醒)放在树的上下方。

const W = 750
const PAD = 28
const INNER = W - PAD * 2

const C = {
  bg: '#FFFFFF',
  title: '#1C1C1E',
  text: '#3A3A3C',
  sub: '#8E8E93',
  line: '#E5E5EA',
  accent: '#FF6B35',
  root: '#FF3B30',
  mid: '#007AFF',
  leaf: '#34C759',
  card: '#FAFAFC',
  arrow: '#AEAEB2',
}

const esc = (s) =>
  String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

function cut(s, n) {
  const t = String(s == null ? '' : s)
  return t.length > n ? t.slice(0, n - 1) + '…' : t
}
const initialOf = (name) => {
  const s = String(name || '').trim()
  return s ? Array.from(s)[0] : '?'
}
const tierText = (t) => (t === 'premium' ? '豪华' : '普通')
const roleColor = (c) =>
  c.role === '源头' ? C.root : (c.children || []).length ? C.mid : C.leaf

function drawAvatar(out, defs, person, cx, cy, r, color, key) {
  const av = person && person.avatar
  if (av && av.startsWith('data:image/')) {
    const id = 'av' + key + String(person.id).replace(/[^a-zA-Z0-9]/g, '')
    defs.push(`<clipPath id="${id}"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath>`)
    // xlink:href 给 Safari:SVG → Image 渲染时它对新式 href 支持不稳
    out.push(
      `<image x="${cx - r}" y="${cy - r}" width="${r * 2}" height="${r * 2}" href="${esc(av)}" xlink:href="${esc(av)}" clip-path="url(#${id})" preserveAspectRatio="xMidYMid slice"/>`,
    )
  } else {
    out.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}"/>`)
    out.push(
      `<text x="${cx}" y="${cy + r * 0.34}" font-size="${r * 0.78}" font-weight="700" fill="#fff" text-anchor="middle">${esc(initialOf(person && person.name))}</text>`,
    )
  }
  return cx + r
}

export function buildPlanSvg(plan) {
  if (!plan || !plan.success || !plan.cards) return null

  const cards = plan.cards
  const byId = new Map(cards.map((c) => [c.person.id, c]))
  const ordered = [...cards].sort(
    (a, b) => a.depth - b.depth || String(a.person.name).localeCompare(String(b.person.name), 'zh'),
  )

  const out = []
  const defs = []
  let y = PAD

  // ===== 标题 =====
  out.push(
    `<text x="${PAD}" y="${y + 22}" font-size="21" font-weight="700" fill="${C.title}">洛克王国通行证拼团</text>`,
  )
  y += 36

  // ===== 费用总览 =====
  const statW = (INNER - 3 * 10) / 4
  const stats = [
    { v: String(cards.length), u: '人', l: '参与人数' },
    { v: String(plan.total), u: '元', l: '游戏总支付' },
    { v: String(plan.savingPerPerson), u: '元', l: '人均可省' },
    { v: String(plan.savings), u: '元', l: '节省总额' },
  ]
  const STAT_H = 64
  stats.forEach((s, i) => {
    const x = PAD + i * (statW + 10)
    out.push(`<rect x="${x}" y="${y}" width="${statW}" height="${STAT_H}" rx="12" fill="${C.card}"/>`)
    out.push(
      `<text x="${x + statW / 2}" y="${y + 32}" font-size="20" font-weight="800" fill="${C.title}" text-anchor="middle">${esc(s.v)}<tspan font-size="12" font-weight="600" fill="${C.sub}"> ${s.u}</tspan></text>`,
    )
    out.push(
      `<text x="${x + statW / 2}" y="${y + 50}" font-size="11" fill="${C.sub}" text-anchor="middle">${esc(s.l)}</text>`,
    )
  })
  y += STAT_H + 20

  const channel = Math.round((plan.savings - plan.savingPerPerson * cards.length) * 100) / 100
  if (channel > 0.005) {
    out.push(
      `<text x="${PAD}" y="${y}" font-size="11.5" fill="${C.accent}">其中车头自购渠道省 ${channel} 元（归车头本人）</text>`,
    )
    y += 20
  }
  if (plan.noGift) {
    out.push(
      `<text x="${PAD}" y="${y}" font-size="11.5" fill="${C.accent}">${esc(plan.noGiftHint || '当前配置无法形成赠送关系，所有人都需自购通行证')}</text>`,
    )
    y += 20
  }
  y += 8

  // ===== 传火结构(个人信息全部标注在节点上) =====
  out.push(
    `<text x="${PAD}" y="${y + 13}" font-size="14" font-weight="700" fill="${C.title}">传火结构</text>`,
  )
  y += 24

  const NODE_H = 152
  const GAP_X = 24
  const GAP_Y = 30
  const MIN_W = 150
  const MAX_W = 210
  const AV_R = 16

  // 排列方式要和页面预览(TransferTree)一致:
  //   细长的链(层数 > 叶子数)横着画,根在左;
  //   分叉多时竖着画,根在上,父节点居中于自己的子树。
  // 以前这里一律按「每行 N 个」网格换行,和预览的形状对不上。
  const childrenOf = new Map()
  for (const c of cards) {
    if (c.parentId == null) continue
    if (!childrenOf.has(c.parentId)) childrenOf.set(c.parentId, [])
    childrenOf.get(c.parentId).push(c.person.id)
  }
  const roots = cards.filter((c) => c.parentId == null).map((c) => c.person.id)
  const maxDepth = Math.max(...cards.map((c) => c.depth || 0)) + 1
  const leafCount = cards.filter((c) => !(childrenOf.get(c.person.id) || []).length).length
  const horizontal = maxDepth > leafCount

  const n = ordered.length
  let nodeW = MAX_W
  let rows = []
  let subW = null

  // 纵向时子树总宽 = 所有叶子并排,需要先算出来才知道节点能不能放进 750
  const calcSub = (w) => {
    const m = new Map()
    const walk = (id) => {
      const kids = childrenOf.get(id) || []
      if (!kids.length) {
        m.set(id, w)
        return w
      }
      const total = kids.map(walk).reduce((a, b) => a + b, 0) + GAP_X * (kids.length - 1)
      const v = Math.max(w, total)
      m.set(id, v)
      return v
    }
    let total = 0
    for (const r of roots) total += walk(r) + GAP_X
    return { total: total - GAP_X, map: m }
  }

  if (horizontal) {
    // 横向:一行尽量多放,放不下就换行(预览里靠页面滚动,这里宽度固定只能换行)
    const fit = (count) => (INNER - GAP_X * (count - 1)) / count
    let perRow = n
    nodeW = Math.min(MAX_W, fit(n))
    if (nodeW < MIN_W) {
      perRow = Math.max(1, Math.floor((INNER + GAP_X) / (MIN_W + GAP_X)))
      nodeW = Math.min(MAX_W, fit(perRow))
    }
    for (let i = 0; i < n; i += perRow) rows.push(ordered.slice(i, i + perRow))
  } else {
    // 纵向:从 MAX_W 往下找第一个能放进画布的宽度
    let found = null
    for (let w = MAX_W; w >= MIN_W; w -= 4) {
      const r = calcSub(w)
      if (r.total <= INNER) {
        found = r
        nodeW = w
        break
      }
    }
    if (!found) {
      nodeW = MIN_W
      found = calcSub(MIN_W)
    }
    subW = found.map
  }

  const rowX = (ri) => {
    const rowW = rows[ri].length * nodeW + GAP_X * (rows[ri].length - 1)
    return PAD + (INNER - rowW) / 2
  }

  // 纵向:递归放置,父节点在自己子树范围内居中
  const posMap = new Map()
  const place = (id, left, depth) => {
    const w = subW.get(id)
    posMap.set(id, { x: left + (w - nodeW) / 2, y: y + depth * (NODE_H + GAP_Y) })
    let cursor = left
    for (const k of childrenOf.get(id) || []) {
      place(k, cursor, depth + 1)
      cursor += subW.get(k) + GAP_X
    }
  }
  if (!horizontal) {
    // 整棵树水平居中(横向分支用不到 subW,别在这里碰它)
    const treeW = roots.reduce((s, r) => s + subW.get(r) + GAP_X, 0) - GAP_X
    const treeLeft = PAD + (INNER - treeW) / 2
    let cursor = treeLeft
    for (const r of roots) {
      place(r, cursor, 0)
      cursor += subW.get(r) + GAP_X
    }
  }

  const posOf = (card) => {
    if (!horizontal) return posMap.get(card.person.id) || null
    for (let ri = 0; ri < rows.length; ri++) {
      const ci = rows[ri].indexOf(card)
      if (ci >= 0) return { x: rowX(ri) + ci * (nodeW + GAP_X), y: y + ri * (NODE_H + GAP_Y) }
    }
    return null
  }

  // 先画节点,再画连线(连线在上层,箭头不被节点盖住)
  for (const c of ordered) {
    const p = posOf(c)
    if (!p) continue
    const role = roleColor(c)
    const left = p.x + 13
    const right = p.x + nodeW - 13

    // 角色只用**边框颜色**表达。左侧不再额外画竖条:边框已经是角色色,
    // 再叠一条 4.5px 的色块既重复,在圆角边上又显得很粗。
    out.push(
      `<rect x="${p.x}" y="${p.y}" width="${nodeW}" height="${NODE_H}" rx="14" fill="${C.card}" stroke="${role}" stroke-width="1.6"/>`,
    )

    // 头部:头像居中在上、名字与精灵居中其下 —— 与页面预览的节点形状一致
    const cx = p.x + nodeW / 2
    const cy = p.y + 26
    drawAvatar(out, defs, c.person, cx, cy, AV_R, role, 'n')
    const nameMax = Math.max(3, Math.floor((nodeW - 26) / 13.5))
    out.push(
      `<text x="${cx}" y="${p.y + 56}" font-size="13.5" font-weight="700" fill="${C.title}" text-anchor="middle">${esc(cut(c.person.name, nameMax))}</text>`,
    )
    out.push(
      `<text x="${cx}" y="${p.y + 72}" font-size="10.5" fill="${C.sub}" text-anchor="middle">${tierText(c.tier)} · ${esc(cut(c.myElfName, Math.max(4, Math.floor((nodeW - 26) / 11))))}</text>`,
    )
    // 角色标签放右上角,不干扰居中的名字
    const tagW = c.role.length * 11 + 12
    const tagX = right - tagW
    out.push(`<rect x="${tagX}" y="${p.y + 10}" width="${tagW}" height="17" rx="8.5" fill="${role}" opacity="0.15"/>`)
    out.push(
      `<text x="${tagX + tagW / 2}" y="${p.y + 22}" font-size="10" font-weight="700" fill="${role}" text-anchor="middle">${esc(c.role)}</text>`,
    )

    // 分隔
    const sep1 = p.y + 82
    out.push(`<line x1="${left}" y1="${sep1}" x2="${right}" y2="${sep1}" stroke="${C.line}" stroke-width="0.8"/>`)

    // 实付行
    const paidLabel = c.role === '源头' ? '自购通行证' : '副券'
    out.push(`<text x="${left}" y="${sep1 + 18}" font-size="11" fill="${C.sub}">${paidLabel}</text>`)
    out.push(
      `<text x="${right}" y="${sep1 + 18}" font-size="12" font-weight="600" fill="${C.text}" text-anchor="end">${c.paid} 元</text>`,
    )

    // 结算行:从 items 里找 transfer 项(主源头写在 items 但不在 transfers 里)
    const tLine = (c.items || []).find(
      (it) => it.type === 'transfer-in' || it.type === 'transfer-out',
    )
    const settleY = sep1 + 37
    if (tLine) {
      const isOut = tLine.type === 'transfer-out'
      // 解析对手名字:「转账给 X(结算差额)」取 X
      const m = tLine.label.match(/(?:转账给|收到|收)(\S+?)(?:（|\(|$)/)
      const toName = m ? m[1] : (isOut ? '车头' : '车头')
      out.push(
        `<text x="${left}" y="${settleY}" font-size="11" fill="${C.sub}">${isOut ? '转给 ' : '收 '}${esc(cut(toName, 6))}</text>`,
      )
      out.push(
        `<text x="${right}" y="${settleY}" font-size="12" font-weight="600" fill="${isOut ? C.text : C.leaf}" text-anchor="end">${isOut ? '-' : '+'}${tLine.amount} 元</text>`,
      )
    } else {
      out.push(`<text x="${left}" y="${settleY}" font-size="11" fill="${C.sub}">结算</text>`)
      out.push(`<text x="${right}" y="${settleY}" font-size="11" fill="${C.sub}" text-anchor="end">无需转账</text>`)
    }

    // 分隔
    const sep2 = p.y + 124
    out.push(`<line x1="${left}" y1="${sep2}" x2="${right}" y2="${sep2}" stroke="${C.line}" stroke-width="0.8"/>`)

    // 净支出 + 省
    // 净支出 + 省 各占一行(两个右对齐文本不再挤在一行重叠)
    out.push(`<text x="${left}" y="${sep2 + 22}" font-size="11" fill="${C.sub}">净支出</text>`)
    out.push(
      `<text x="${right}" y="${sep2 + 23}" font-size="17" font-weight="800" fill="${role}" text-anchor="end">${c.netExpense} 元</text>`,
    )
    out.push(
      `<text x="${right}" y="${sep2 + 38}" font-size="10.5" fill="${C.leaf}" text-anchor="end">省 ${c.saving} 元</text>`,
    )
  }

  // 连线
  for (const c of ordered) {
    if (c.parentId == null) continue
    const parent = byId.get(c.parentId)
    if (!parent) continue
    const from = posOf(parent)
    const to = posOf(c)
    if (!from || !to) continue
    if (from.y === to.y && to.x > from.x) {
      const yy = from.y + NODE_H / 2
      out.push(
        `<line x1="${from.x + nodeW + 5}" y1="${yy}" x2="${to.x - 9}" y2="${yy}" stroke="${C.arrow}" stroke-width="2" marker-end="url(#arw)"/>`,
      )
    } else {
      const x1 = from.x + nodeW / 2
      const y1 = from.y + NODE_H
      const x2 = to.x + nodeW / 2
      const y2 = to.y
      const mid = y1 + Math.max(12, (y2 - y1) / 2)
      out.push(
        `<path d="M ${x1} ${y1 + 4} L ${x1} ${mid} L ${x2} ${mid} L ${x2} ${y2 - 9}" fill="none" stroke="${C.arrow}" stroke-width="2" stroke-dasharray="5 4" marker-end="url(#arw)"/>`,
      )
    }
  }

  // 纵向时用层数、横向时用行数来推进 y
  const treeRows = horizontal ? rows.length : maxDepth
  y += treeRows * NODE_H + (treeRows - 1) * GAP_Y + 22

  // ===== 收款汇总(一行,不重复列每个人) =====
  const cb = plan.collectBill
  if (cb && cb.head) {
    out.push(`<line x1="${PAD}" y1="${y}" x2="${W - PAD}" y2="${y}" stroke="${C.line}" stroke-width="1"/>`)
    y += 22
    const pay = cb.payItems || []
    const ref = cb.refundItems || []
    if (!pay.length && !ref.length) {
      out.push(
        `<text x="${PAD}" y="${y + 12}" font-size="12" fill="${C.sub}">无需转账，各自按上面的金额付款即可</text>`,
      )
      y += 26
    } else {
      // 只列前 4 个,其余用「等 N 人」带过。
      // 直接 cut() 硬截断的话,人多时会停在半个人名上(「…普通3」),
      // 看起来像算错了。
      const all = [
        ...pay.map((it) => `${it.person.name} ${it.amount}`),
        ...ref.map((it) => `${it.person.name} 退 ${it.amount}`),
      ]
      const shown = all.slice(0, 4).join(' · ')
      const restN = all.length - 4
      const detail = shown + (restN > 0 ? ` 等 ${restN} 人` : '')
      out.push(
        `<text x="${PAD}" y="${y + 12}" font-size="12.5" font-weight="600" fill="${C.title}">${esc(cut(cb.head.name, 8))} 收款 ${cb.receive} 元${cb.refund > 0 ? `，需退 ${cb.refund} 元` : ''}</text>`,
      )
      y += 20
      out.push(`<text x="${PAD}" y="${y + 12}" font-size="11" fill="${C.sub}">${esc(detail)}</text>`)
      y += 26
    }
  }

  // ===== 好友 / 补人提示 =====
  if (plan.friendWarnings && plan.friendWarnings.length) {
    // 同样只列前 3 对,其余「等 N 对」
    const fw = plan.friendWarnings
    const shown = fw.slice(0, 3).map((w) => `${w.from} ↔ ${w.to}`).join('、')
    const restN = fw.length - 3
    const names = shown + (restN > 0 ? ` 等 ${restN} 对` : '')
    out.push(`<rect x="${PAD}" y="${y}" width="${INNER}" height="34" rx="10" fill="#FFF3EC"/>`)
    out.push(
      `<text x="${PAD + 14}" y="${y + 21}" font-size="11.5" fill="${C.accent}">动手前需先加好友：${esc(names)}</text>`,
    )
    y += 44
  } else if (!plan.noGift) {
    out.push(`<rect x="${PAD}" y="${y}" width="${INNER}" height="34" rx="10" fill="#EAF9F0"/>`)
    out.push(
      `<text x="${PAD + 14}" y="${y + 21}" font-size="11.5" fill="#1E9E51">所有赠送双方已互为好友，可直接按方案执行</text>`,
    )
    y += 44
  }
  if (plan.gapSuggestion) {
    const g = plan.gapSuggestion
    const txt = `再拉 ${g.count} 个要「${g.elfName}」的${g.tier === 'premium' ? '豪华版' : '普通版'}，人均可省从 ${g.savingNow} 涨到 ${g.savingAfter} 元`
    out.push(`<rect x="${PAD}" y="${y}" width="${INNER}" height="34" rx="10" fill="#FFF9E8"/>`)
    out.push(`<text x="${PAD + 14}" y="${y + 21}" font-size="11.5" fill="#B8860B">${esc(cut(txt, 40))}</text>`)
    y += 44
  }

  const H = Math.round(y + PAD)
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" ` +
    `font-family="-apple-system,BlinkMacSystemFont,'PingFang SC','Hiragino Sans GB','Microsoft YaHei','Noto Sans CJK SC',sans-serif">` +
    `<defs>` +
    `<marker id="arw" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">` +
    `<path d="M0,0 L10,5 L0,10 z" fill="${C.arrow}"/></marker>` +
    defs.join('') +
    `</defs>` +
    `<rect x="0" y="0" width="${W}" height="${H}" rx="18" fill="${C.bg}"/>` +
    out.join('') +
    `</svg>`

  return { svg, width: W, height: H }
}
