// 把方案画成一张 SVG。
//
// 为什么不用 html2canvas 截 DOM:截图是按**页面布局**来的,树状图一横向滚动,
// 要么被裁(只渲染可视区)、要么把画布撑到两三千像素宽 —— 在微信里既看不清也存不下。
// 这里改为按数据重新画一张:宽度固定 750(手机上一屏能看完),传火结构放不下就
// 自动换行,矢量渲染放大也不糊。

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
}

const esc = (s) =>
  String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

// clip 长文本:名字太长会撑破节点
function cut(s, n) {
  const t = String(s == null ? '' : s)
  return t.length > n ? t.slice(0, n - 1) + '…' : t
}

const initialOf = (name) => {
  const s = String(name || '').trim()
  return s ? Array.from(s)[0] : '?'
}

const tierText = (t) => (t === 'premium' ? '豪华' : '普通')
const roleColor = (c) => {
  if (c.role === '源头') return C.root
  return (c.children || []).length ? C.mid : C.leaf
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
  y += 34
  const channel = Math.round((plan.savings - plan.savingPerPerson * cards.length) * 100) / 100
  out.push(
    `<text x="${PAD}" y="${y + 15}" font-size="13.5" fill="${C.sub}">` +
      `共 ${cards.length} 人 · 总支付 ${plan.total} 元 · 人均可省 ${plan.savingPerPerson} 元 · 共省 ${plan.savings} 元` +
      (channel > 0.005 ? `（含车头渠道省 ${channel} 元）` : '') +
      `</text>`,
  )
  y += 34

  // ===== 传火结构 =====
  out.push(
    `<text x="${PAD}" y="${y + 14}" font-size="14" font-weight="700" fill="${C.title}">传火结构</text>`,
  )
  y += 26

  const NODE_H = 74
  const GAP_X = 26
  const GAP_Y = 34
  const MIN_W = 78
  const MAX_W = 118

  // 先按「一行放得下」算节点宽;算出的宽度小于 MIN_W 就改成多行
  const n = ordered.length
  let perRow = n
  let nodeW = MAX_W
  const fit = (count) => (INNER - GAP_X * (count - 1)) / count
  if (n > 0) {
    nodeW = Math.min(MAX_W, fit(n))
    if (nodeW < MIN_W) {
      perRow = Math.max(2, Math.floor((INNER + GAP_X) / (MIN_W + GAP_X)))
      nodeW = Math.min(MAX_W, fit(perRow))
    }
  }

  const rows = []
  for (let i = 0; i < n; i += perRow) rows.push(ordered.slice(i, i + perRow))

  const rowTop = []
  rows.forEach((row, ri) => {
    const rowW = row.length * nodeW + GAP_X * (row.length - 1)
    const startX = PAD + (INNER - rowW) / 2
    const top = y + ri * (NODE_H + GAP_Y)
    rowTop.push(top)
    row.forEach((c, ci) => {
      const x = startX + ci * (nodeW + GAP_X)
      drawNode(out, defs, c, x, top, nodeW, NODE_H)
    })
  })
  const treeBottom = y + rows.length * NODE_H + (rows.length - 1) * GAP_Y

  // 连线:同一行内左右相邻;跨行时从上行末节点底部绕到下行首节点顶部
  // (走两行之间的空隙,不会压到别的节点)
  rows.forEach((row, ri) => {
    row.forEach((c, ci) => {
      if (c.parentId == null) return
      const parent = byId.get(c.parentId)
      if (!parent) return
      const pi = row.indexOf(parent)
      if (pi >= 0 && pi === ci - 1) {
        const x1 = nodeX(rows, ri, pi, nodeW, GAP_X) + nodeW
        const x2 = nodeX(rows, ri, ci, nodeW, GAP_X)
        const yy = rowTop[ri] + NODE_H / 2
        out.push(
          `<line x1="${x1 + 4}" y1="${yy}" x2="${x2 - 8}" y2="${yy}" stroke="#C7C7CC" stroke-width="1.6" marker-end="url(#arw)"/>`,
        )
      } else {
        // 父节点在别处(上一行或跨层),画一条折线
        const from = posOf(rows, parent, nodeW, GAP_X, rowTop, NODE_H)
        const to = posOf(rows, c, nodeW, GAP_X, rowTop, NODE_H)
        if (!from || !to) return
        const x1 = from.x + nodeW / 2
        const y1 = from.y + NODE_H
        const x2 = to.x + nodeW / 2
        const y2 = to.y
        const mid = y1 + Math.max(10, (y2 - y1) / 2)
        out.push(
          `<path d="M ${x1} ${y1} L ${x1} ${mid} L ${x2} ${mid} L ${x2} ${y2 - 8}" fill="none" stroke="#C7C7CC" stroke-width="1.6" stroke-dasharray="4 3" marker-end="url(#arw)"/>`,
        )
      }
    })
  })

  y = treeBottom + 26
  out.push(`<line x1="${PAD}" y1="${y}" x2="${W - PAD}" y2="${y}" stroke="${C.line}" stroke-width="1"/>`)
  y += 24

  // ===== 每人结算 =====
  out.push(
    `<text x="${PAD}" y="${y + 13}" font-size="14" font-weight="700" fill="${C.title}">每人结算</text>`,
  )
  y += 24

  const ROW_H = 46
  for (const c of ordered) {
    const role = roleColor(c)
    out.push(
      `<rect x="${PAD}" y="${y}" width="${INNER}" height="${ROW_H - 8}" rx="10" fill="${C.card}"/>`,
    )
    out.push(`<rect x="${PAD}" y="${y}" width="3.5" height="${ROW_H - 8}" rx="2" fill="${role}"/>`)

    const av = c.person.avatar
    const cx = PAD + 15 + 14
    const cy = y + (ROW_H - 8) / 2
    if (av && av.startsWith('data:image/')) {
      const id = 'av' + c.person.id.replace(/[^a-zA-Z0-9]/g, '')
      defs.push(`<clipPath id="${id}"><circle cx="${cx}" cy="${cy}" r="14"/></clipPath>`)
      out.push(
        // xlink:href 是给 Safari 的:SVG → Image 渲染时它对新式 href 支持不稳
      `<image x="${cx - 14}" y="${cy - 14}" width="28" height="28" href="${esc(av)}" xlink:href="${esc(av)}" clip-path="url(#${id})" preserveAspectRatio="xMidYMid slice"/>`,
      )
    } else {
      out.push(`<circle cx="${cx}" cy="${cy}" r="14" fill="${role}"/>`)
      out.push(
        `<text x="${cx}" y="${cy + 5}" font-size="13" font-weight="700" fill="#fff" text-anchor="middle">${esc(
          initialOf(c.person.name),
        )}</text>`,
      )
    }

    out.push(
      `<text x="${PAD + 40}" y="${cy - 2}" font-size="13.5" font-weight="600" fill="${C.title}">${esc(
        cut(c.person.name, 10),
      )} <tspan font-size="11" font-weight="500" fill="${C.sub}">${tierText(c.tier)}·${esc(
        c.myElfName,
      )}</tspan></text>`,
    )
    const settle = c.transfers && c.transfers[0]
    const detail =
      (c.role === '源头' ? `自购 ${c.paid} 元` : `副券 ${c.paid} 元`) +
      (settle
        ? settle.direction === 'out'
          ? ` + 转出 ${settle.amount}`
          : ` − 收 ${settle.amount}`
        : '') +
      ` · 省 ${c.saving} 元`
    out.push(
      `<text x="${PAD + 40}" y="${cy + 14}" font-size="11" fill="${C.sub}">${esc(detail)}</text>`,
    )
    out.push(
      `<text x="${W - PAD - 14}" y="${cy + 5}" font-size="15" font-weight="700" fill="${role}" text-anchor="end">${c.netExpense} 元</text>`,
    )
    y += ROW_H
  }

  // ===== 转账 =====
  const cb = plan.collectBill
  if (cb && cb.head && ((cb.payItems && cb.payItems.length) || (cb.refundItems && cb.refundItems.length))) {
    y += 6
    out.push(`<line x1="${PAD}" y1="${y}" x2="${W - PAD}" y2="${y}" stroke="${C.line}" stroke-width="1"/>`)
    y += 24
    out.push(
      `<text x="${PAD}" y="${y + 12}" font-size="13" font-weight="600" fill="${C.title}">${esc(
        cb.head.name,
      )} 收款 ${cb.receive} 元</text>`,
    )
    y += 22
    let line = ''
    for (const it of cb.payItems || []) line += `${it.person.name} ${it.amount} 元 · `
    for (const it of cb.refundItems || []) line += `${it.person.name} 需退 ${it.amount} 元 · `
    out.push(
      `<text x="${PAD}" y="${y + 12}" font-size="12" fill="${C.sub}">${esc(line.replace(/ · $/, ''))}</text>`,
    )
    y += 26
  }

  // ===== 好友提醒 =====
  if (plan.friendWarnings && plan.friendWarnings.length) {
    const names = plan.friendWarnings.map((w) => `${w.from} ↔ ${w.to}`).join('、')
    out.push(
      `<rect x="${PAD}" y="${y}" width="${INNER}" height="30" rx="8" fill="#FFF3EC"/>`,
    )
    out.push(
      `<text x="${PAD + 12}" y="${y + 19}" font-size="11.5" fill="${C.accent}">需先加好友：${esc(
        cut(names, 46),
      )}</text>`,
    )
    y += 40
  }

  const H = y + PAD - 6

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" ` +
    `font-family="-apple-system,BlinkMacSystemFont,'PingFang SC','Hiragino Sans GB','Microsoft YaHei',sans-serif">` +
    `<defs>` +
    `<marker id="arw" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto">` +
    `<path d="M0,0 L8,4 L0,8 z" fill="#C7C7CC"/></marker>` +
    defs.join('') +
    `</defs>` +
    `<rect x="0" y="0" width="${W}" height="${H}" rx="18" fill="${C.bg}"/>` +
    out.join('') +
    `</svg>`

  return { svg, width: W, height: H }
}

// nodeX 第 ri 行第 ci 列的 x 坐标(与绘制时的算法保持一致)
function nodeX(rows, ri, ci, nodeW, GAP_X) {
  const row = rows[ri]
  const rowW = row.length * nodeW + GAP_X * (row.length - 1)
  return PAD + (INNER - rowW) / 2 + ci * (nodeW + GAP_X)
}

function posOf(rows, card, nodeW, GAP_X, rowTop, NODE_H) {
  for (let ri = 0; ri < rows.length; ri++) {
    const ci = rows[ri].indexOf(card)
    if (ci >= 0) return { x: nodeX(rows, ri, ci, nodeW, GAP_X), y: rowTop[ri] }
  }
  return null
}

// drawNode 画一个传火节点:头像 + 名字 + 精灵/档次 + 净支出
function drawNode(out, defs, c, x, top, w, h) {
  const role = roleColor(c)
  out.push(
    `<rect x="${x}" y="${top}" width="${w}" height="${h}" rx="12" fill="${C.card}" stroke="${role}" stroke-width="1.2"/>`,
  )
  const cx = x + w / 2
  const av = c.person.avatar
  const ay = top + 22
  if (av && av.startsWith('data:image/')) {
    const id = 'an' + c.person.id.replace(/[^a-zA-Z0-9]/g, '')
    defs.push(`<clipPath id="${id}"><circle cx="${cx}" cy="${ay}" r="13"/></clipPath>`)
    out.push(
      `<circle cx="${cx}" cy="${ay}" r="14.5" fill="none" stroke="${role}" stroke-width="1.6"/>` +
        `<image x="${cx - 13}" y="${ay - 13}" width="26" height="26" href="${esc(av)}" xlink:href="${esc(av)}" clip-path="url(#${id})" preserveAspectRatio="xMidYMid slice"/>`,
    )
  } else {
    out.push(`<circle cx="${cx}" cy="${ay}" r="14.5" fill="${role}"/>`)
    out.push(
      `<text x="${cx}" y="${ay + 5}" font-size="13" font-weight="700" fill="#fff" text-anchor="middle">${esc(
        initialOf(c.person.name),
      )}</text>`,
    )
  }
  out.push(
    `<text x="${cx}" y="${top + 50}" font-size="12.5" font-weight="600" fill="${C.title}" text-anchor="middle">${esc(
      cut(c.person.name, 7),
    )}</text>`,
  )
  out.push(
    `<text x="${cx}" y="${top + 65}" font-size="10.5" fill="${C.sub}" text-anchor="middle">${tierText(
      c.tier,
    )}·${esc(c.myElfName)}</text>`,
  )
}
