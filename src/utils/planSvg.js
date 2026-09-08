// 把方案画成一张 SVG。
//
// 为什么不用 html2canvas 截 DOM:截图是按**页面布局**来的,树状图一横向滚动,
// 要么被裁(只渲染可视区)、要么把画布撑到两三千像素宽 —— 在微信里既看不清也存不下。
// 这里改为按数据重新画一张,宽度固定 750(手机上一屏能看完),内容覆盖结果区的
// 全部信息:费用总览 → 传火结构 → 群收款 → 每人结算 → 好友/补人提示。
// 矢量渲染,放大不糊。

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
  card: '#F7F7F9',
  arrow: '#AEAEB2',
}

const esc = (s) =>
  String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

// cut 截断长文本:SVG 的 <text> 不会自动换行,超长会溢出到画布外
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

// 头像:有图用圆裁剪,没图用角色色圆 + 首字。
// 返回占用的右边界,方便调用方接着排文字(避免文字压到头像上)。
function drawAvatar(out, defs, person, cx, cy, r, color, key) {
  const av = person && person.avatar
  if (av && av.startsWith('data:image/')) {
    const id = 'av' + key + String(person.id).replace(/[^a-zA-Z0-9]/g, '')
    defs.push(`<clipPath id="${id}"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath>`)
    // xlink:href 是给 Safari 的:SVG → Image 渲染时它对新式 href 支持不稳
    out.push(
      `<image x="${cx - r}" y="${cy - r}" width="${r * 2}" height="${r * 2}" href="${esc(av)}" xlink:href="${esc(av)}" clip-path="url(#${id})" preserveAspectRatio="xMidYMid slice"/>`,
    )
  } else {
    out.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}"/>`)
    out.push(
      `<text x="${cx}" y="${cy + r * 0.36}" font-size="${r * 0.95}" font-weight="700" fill="#fff" text-anchor="middle">${esc(initialOf(person && person.name))}</text>`,
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

  // ===== 费用总览:四个数字块 =====
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
  y += STAT_H + 22

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
  y += 6

  // ===== 传火结构 =====
  out.push(
    `<text x="${PAD}" y="${y + 13}" font-size="14" font-weight="700" fill="${C.title}">传火结构</text>`,
  )
  y += 24

  // 节点用**横向**布局(头像在左、文字在右):连线走在节点之间的空隙里、
  // 高度取节点垂直中心,不会和头像或文字打架。
  const NODE_H = 62
  const GAP_X = 34
  const GAP_Y = 32
  const MIN_W = 116
  const MAX_W = 168
  const AV_R = 15

  const n = ordered.length
  const fit = (count) => (INNER - GAP_X * (count - 1)) / count
  let perRow = n
  let nodeW = Math.min(MAX_W, fit(n))
  if (nodeW < MIN_W) {
    perRow = Math.max(1, Math.floor((INNER + GAP_X) / (MIN_W + GAP_X)))
    nodeW = Math.min(MAX_W, fit(perRow))
  }

  const rows = []
  for (let i = 0; i < n; i += perRow) rows.push(ordered.slice(i, i + perRow))
  const rowX = (ri) => {
    const rowW = rows[ri].length * nodeW + GAP_X * (rows[ri].length - 1)
    return PAD + (INNER - rowW) / 2
  }

  // 先画节点,再画连线(连线在上层,箭头不会被节点盖住)
  const posOf = (card) => {
    for (let ri = 0; ri < rows.length; ri++) {
      const ci = rows[ri].indexOf(card)
      if (ci >= 0) return { x: rowX(ri) + ci * (nodeW + GAP_X), y: y + ri * (NODE_H + GAP_Y) }
    }
    return null
  }

  rows.forEach((row, ri) => {
    row.forEach((c) => {
      const p = posOf(c)
      const role = roleColor(c)
      out.push(
        `<rect x="${p.x}" y="${p.y}" width="${nodeW}" height="${NODE_H}" rx="12" fill="${C.card}" stroke="${role}" stroke-width="1.2"/>`,
      )
      const cx = p.x + 12 + AV_R
      const cy = p.y + NODE_H / 2
      drawAvatar(out, defs, c.person, cx, cy, AV_R, role, 'n')
      const tx = cx + AV_R + 10
      const maxW = p.x + nodeW - 12 - tx
      const maxChars = Math.max(3, Math.floor(maxW / 13))
      out.push(
        `<text x="${tx}" y="${cy - 3}" font-size="13" font-weight="600" fill="${C.title}">${esc(cut(c.person.name, maxChars))}</text>`,
      )
      out.push(
        `<text x="${tx}" y="${cy + 15}" font-size="10.5" fill="${C.sub}">${tierText(c.tier)}·${esc(cut(c.myElfName, Math.max(3, Math.floor(maxW / 11))))}</text>`,
      )
    })
  })

  for (const c of ordered) {
    if (c.parentId == null) continue
    const parent = byId.get(c.parentId)
    if (!parent) continue
    const from = posOf(parent)
    const to = posOf(c)
    if (!from || !to) continue
    const sameRow = from.y === to.y && to.x > from.x
    if (sameRow) {
      const yy = from.y + NODE_H / 2
      const x1 = from.x + nodeW + 5
      const x2 = to.x - 9
      out.push(
        `<line x1="${x1}" y1="${yy}" x2="${x2}" y2="${yy}" stroke="${C.arrow}" stroke-width="2" marker-end="url(#arw)"/>`,
      )
    } else {
      // 跨行:从上行节点底部出发,走两行之间的空隙,再落到下行节点顶部
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

  y += rows.length * NODE_H + (rows.length - 1) * GAP_Y + 24
  out.push(`<line x1="${PAD}" y1="${y}" x2="${W - PAD}" y2="${y}" stroke="${C.line}" stroke-width="1"/>`)
  y += 24

  // ===== 群收款 =====
  const cb = plan.collectBill
  if (cb && cb.head) {
    out.push(
      `<text x="${PAD}" y="${y + 13}" font-size="14" font-weight="700" fill="${C.title}">群收款 · ${esc(cut(cb.head.name, 10))} 发起</text>`,
    )
    y += 26
    const items = [...(cb.payItems || []), ...(cb.refundItems || []).map((r) => ({ ...r, refund: true }))]
    if (!items.length) {
      out.push(`<text x="${PAD}" y="${y + 12}" font-size="12" fill="${C.sub}">无需转账，各自付款即可</text>`)
      y += 26
    } else {
      const ROW = 34
      for (const it of items) {
        const cx = PAD + 14
        const cy = y + ROW / 2
        drawAvatar(out, defs, it.person, cx, cy, 12, C.arrow, 'b')
        out.push(
          `<text x="${cx + 20}" y="${cy + 4}" font-size="12.5" fill="${C.text}">${esc(cut(it.person.name, 12))}</text>`,
        )
        out.push(
          `<text x="${W - PAD - 6}" y="${cy + 4}" font-size="12.5" font-weight="600" fill="${it.refund ? C.leaf : C.title}" text-anchor="end">${it.refund ? '需退 ' : ''}${it.amount} 元</text>`,
        )
        y += ROW
      }
      y += 4
      out.push(
        `<text x="${W - PAD - 6}" y="${y + 6}" font-size="12" fill="${C.sub}" text-anchor="end">合计收款 ${cb.receive} 元${cb.refund > 0 ? ` · 需退 ${cb.refund} 元` : ''}</text>`,
      )
      y += 22
    }
    out.push(`<line x1="${PAD}" y1="${y}" x2="${W - PAD}" y2="${y}" stroke="${C.line}" stroke-width="1"/>`)
    y += 24
  }

  // ===== 每人结算 =====
  out.push(
    `<text x="${PAD}" y="${y + 13}" font-size="14" font-weight="700" fill="${C.title}">每人结算</text>`,
  )
  y += 24

  for (const c of ordered) {
    const role = roleColor(c)
    const lines = c.items || []
    // 头部 28(头像/名字/角色/净支出)+ 12 分隔 + 明细 + 14 底部
    const CARD_H = 28 + 12 + lines.length * 19 + 14
    out.push(`<rect x="${PAD}" y="${y}" width="${INNER}" height="${CARD_H}" rx="12" fill="${C.card}"/>`)
    out.push(`<rect x="${PAD}" y="${y}" width="4" height="${CARD_H}" rx="2" fill="${role}"/>`)

    // 头部:头像 + 名字 + 角色标签(左);净支出 + 省(右)
    const cx = PAD + 18 + 15
    const cy = y + 24
    drawAvatar(out, defs, c.person, cx, cy, 15, role, 'p')
    const tx = cx + 15 + 12
    out.push(
      `<text x="${tx}" y="${cy - 1}" font-size="13.5" font-weight="700" fill="${C.title}">${esc(cut(c.person.name, 10))}</text>`,
    )
    // 角色标签放在名字右侧
    const nameEnd = tx + Math.min(String(c.person.name).length, 10) * 14 + 8
    const roleLabel = c.role
    const lw = roleLabel.length * 12 + 14
    out.push(`<rect x="${nameEnd}" y="${cy - 14}" width="${lw}" height="18" rx="9" fill="${role}" opacity="0.14"/>`)
    out.push(
      `<text x="${nameEnd + lw / 2}" y="${cy - 1}" font-size="10.5" font-weight="700" fill="${role}" text-anchor="middle">${esc(roleLabel)}</text>`,
    )
    out.push(
      `<text x="${tx}" y="${cy + 14}" font-size="11" fill="${C.sub}">${tierText(c.tier)}·${esc(c.myElfName)}</text>`,
    )

    // 右:净支出 + 省
    out.push(
      `<text x="${W - PAD - 14}" y="${cy - 1}" font-size="20" font-weight="800" fill="${role}" text-anchor="end">${c.netExpense} 元</text>`,
    )
    out.push(
      `<text x="${W - PAD - 14}" y="${cy + 14}" font-size="10.5" fill="${C.sub}" text-anchor="end">省 ${c.saving} 元</text>`,
    )

    // 分隔
    const sepY = y + 40
    out.push(`<line x1="${PAD + 18}" y1="${sepY}" x2="${W - PAD - 18}" y2="${sepY}" stroke="${C.line}" stroke-width="0.8"/>`)

    // 明细行
    let ly = sepY + 16
    for (const it of lines) {
      if (it.type === 'gift') {
        out.push(
          `<text x="${PAD + 18}" y="${ly}" font-size="11.5" fill="${C.sub}">${esc(cut(it.label, 46))}</text>`,
        )
        out.push(`<text x="${W - PAD - 14}" y="${ly}" font-size="11" fill="${C.sub}" text-anchor="end">送出</text>`)
      } else {
        const isIn = it.type === 'transfer-in'
        out.push(
          `<text x="${PAD + 18}" y="${ly}" font-size="11.5" fill="${C.text}">${esc(cut(it.label, 44))}</text>`,
        )
        out.push(
          `<text x="${W - PAD - 14}" y="${ly}" font-size="11.5" font-weight="600" fill="${isIn ? C.leaf : C.text}" text-anchor="end">${isIn ? '+' : '-'}${it.amount}</text>`,
        )
      }
      ly += 19
    }
    y += CARD_H + 12
  }

  // ===== 好友状态 =====
  if (plan.friendWarnings && plan.friendWarnings.length) {
    const names = plan.friendWarnings.map((w) => `${w.from} ↔ ${w.to}`).join('、')
    out.push(`<rect x="${PAD}" y="${y}" width="${INNER}" height="34" rx="10" fill="#FFF3EC"/>`)
    out.push(
      `<text x="${PAD + 14}" y="${y + 21}" font-size="11.5" fill="${C.accent}">动手前需先加好友：${esc(cut(names, 40))}</text>`,
    )
    y += 44
  } else if (!plan.noGift) {
    out.push(`<rect x="${PAD}" y="${y}" width="${INNER}" height="34" rx="10" fill="#EAF9F0"/>`)
    out.push(
      `<text x="${PAD + 14}" y="${y + 21}" font-size="11.5" fill="#1E9E51">所有赠送双方已互为好友，可直接按方案执行</text>`,
    )
    y += 44
  }

  // ===== 补人建议 =====
  if (plan.gapSuggestion) {
    const g = plan.gapSuggestion
    const txt = `再拉 ${g.count} 个要「${g.elfName}」的${g.tier === 'premium' ? '豪华版' : '普通版'}，人均可省从 ${g.savingNow} 涨到 ${g.savingAfter} 元`
    out.push(`<rect x="${PAD}" y="${y}" width="${INNER}" height="34" rx="10" fill="#FFF9E8"/>`)
    out.push(
      `<text x="${PAD + 14}" y="${y + 21}" font-size="11.5" fill="#B8860B">${esc(cut(txt, 40))}</text>`,
    )
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
