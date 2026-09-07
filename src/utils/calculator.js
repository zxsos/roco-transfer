// 传火方案核心算法。
//
// —— 规则(2026-09 由玩家确认,与旧版最大的区别是**结构从链变成了树**)——
//
//   买普通版·精灵X(68元)  → 可送 1 张「普通副券」,只能是精灵Y(Y≠X)
//   买豪华版·精灵X(128元) → 可送 2 张:1 张「豪华副券」+ 1 张「普通副券」,都只能是精灵Y
//   副券价格:普通 40 / 豪华 80(接收者按**自己的档次**付)
//   副券类型必须匹配:想要豪华的人只能收豪华副券,普通同理
//
// 旧版所有人只能送 1 张,所以最优解一定是一条链;豪华版能送 2 张,一个人可以
// 同时激活两个人,结构就是**树**。这也是为什么不能沿用旧的线性 DFS。
//
// 另一个关键简化:**精灵只有两种**,所以一旦树根的精灵定了,整棵树各层的精灵
// 就被"隔层交替"唯一确定(第 0 层 = 根精灵,第 1 层 = 另一个,第 2 层 = 根精灵…)。
// 于是搜索空间从"给每人分配精灵"收缩为"给每个根分配精灵 + 决定树的父子关系"。

const elfNames = { elf1: '离心舞者', elf2: '胡桃王子' }

const PRICE = {
  normal: { pass: 68, coupon: 40 },
  premium: { pass: 128, coupon: 80 },
}

// GRANTS 是各档次买家可送出的副券类型(数组即额度,顺序无关)。
const GRANTS = {
  normal: ['normal'],
  premium: ['premium', 'normal'],
}

// 被赠相对于自购能省下的钱,用于匹配时排序(优先让豪华的人被赠)。
const SAVING = { normal: 28, premium: 48 }

// 补人建议的最低人均节省额。低于这个数就不提示 —— 为了每人省几毛钱去
// 再拉一个人进群(还要沟通、协调、等他付款)不值得,提示了也是噪音。
const GAP_MIN_SAVE = 5

const otherElf = (e) => (e === 'elf1' ? 'elf2' : 'elf1')

function validatePeople(people) {
  if (people.length < 2) {
    return { valid: false, error: '至少需要2个人才能组成传火方案' }
  }
  const headList = people.filter((p) => p.isHead)
  if (headList.length > 1) {
    return { valid: false, error: '只能有一个车头，当前有 ' + headList.length + ' 人被标记为车头' }
  }
  // 车头必须豪华:它是自购源头且要发起群收款,普通版送不出豪华副券会让树长不开。
  // UI 侧已强制(普通按钮禁用),这里是防导入的脏数据。
  if (headList.length === 1 && headList[0].tier !== 'premium') {
    return {
      valid: false,
      error: `车头「${headList[0].name || '未命名'}」必须是豪华版（当前为普通版）`,
    }
  }
  return { valid: true, error: null }
}

function buildFriendshipMap(people, friendMatrix) {
  const map = new Map()
  for (const p of people) map.set(p.id, new Set())
  if (!friendMatrix || friendMatrix.length === 0) return map
  for (const [idA, idB] of friendMatrix) {
    if (map.has(idA)) map.get(idA).add(idB)
    if (map.has(idB)) map.get(idB).add(idA)
  }
  return map
}

function areFriends(friendMap, idA, idB) {
  if (!friendMap.has(idA)) return false
  return friendMap.get(idA).has(idB)
}

// combinations 从 arr 中取 k 个的所有组合(k 很小,直接递归即可)。
function combinations(arr, k) {
  if (k === 0) return [[]]
  if (arr.length < k) return []
  const out = []
  const [first, ...rest] = arr
  for (const c of combinations(rest, k - 1)) out.push([first, ...c])
  for (const c of combinations(rest, k)) out.push(c)
  return out
}

// elfAssignments 枚举各根可能的精灵分配(笛卡尔积)。
// 根若指定了具体精灵则只有一种选择;'any' 才有 elf1/elf2 两种。
function elfAssignments(rootIds, byId) {
  let acc = [new Map()]
  for (const rid of rootIds) {
    const p = byId.get(rid)
    const opts = p.needElf === 'any' ? ['elf1', 'elf2'] : [p.needElf]
    const next = []
    for (const m of acc) {
      for (const e of opts) {
        const nm = new Map(m)
        nm.set(rid, e)
        next.push(nm)
      }
    }
    acc = next
  }
  return acc
}

// tryBuild 在给定根集合与各根精灵的前提下,逐层构造森林。
//
// 构造方式:第 0 层是各根;每一层把"待分配的人"匹配到"上一层节点提供的副券槽位"
// 上。匹配成功的人成为下一层的节点,继续提供槽位,直到所有人分配完。
//
// 只有两种精灵 ⇒ 每层的精灵由"所在树的根精灵 + 层数奇偶"唯一决定,
// 因此无需在构造时再为每个节点挑选精灵。
function tryBuild(people, rootIds, rootElfAssign, friendMap, byId) {
  const depthOf = new Map()
  const parentOf = new Map()
  const elfOf = new Map()

  for (const rid of rootIds) {
    depthOf.set(rid, 0)
    elfOf.set(rid, rootElfAssign.get(rid))
  }

  const remaining = new Set(people.map((p) => p.id).filter((id) => !depthOf.has(id)))
  let frontier = [...rootIds]
  let depth = 1

  while (remaining.size > 0) {
    if (frontier.length === 0) return null

    // 上一层每个节点按档次提供副券槽位
    const slots = []
    for (const fid of frontier) {
      const f = byId.get(fid)
      for (const ct of GRANTS[f.tier] || []) slots.push({ from: fid, couponType: ct })
    }
    if (slots.length === 0) return null

    // remaining 存的是 id,这里要换成 person 对象再交给匹配 —— 直接传 id 的话
    // p.tier / p.needElf 全是 undefined,会导致一次都匹配不上、退化成全员自购。
    const assign = matchLevel(
      slots,
      [...remaining].map((id) => byId.get(id)),
      byId,
      friendMap,
      depth,
      rootElfAssign,
      parentOf,
    )
    if (assign.length === 0) return null // 本层一个人都放不下 ⇒ 这条根配置走不通

    for (const a of assign) {
      parentOf.set(a.person.id, a.slot.from)
      depthOf.set(a.person.id, depth)
      elfOf.set(a.person.id, a.elf)
      remaining.delete(a.person.id)
    }
    frontier = assign.map((a) => a.person.id)
    depth++
  }

  return { depthOf, parentOf, elfOf }
}

// matchLevel 把候选者匹配到本层槽位上。
//
// 约束:槽位的副券类型必须等于候选者的档次;候选者所在层的精灵(由父节点所在树
// 的根精灵与层数决定)若与其指定需求冲突则不能放这一层。
//
// "本层不放"也是一个分支 —— 留到下一层时精灵会翻转,那时可能就匹配了。
function matchLevel(slots, cands, byId, friendMap, depth, rootElfAssign, parentOf) {
  const rootOf = (id) => {
    let cur = id
    while (parentOf.has(cur)) cur = parentOf.get(cur)
    return cur
  }
  const elfUnder = (fromId) => {
    const re = rootElfAssign.get(rootOf(fromId))
    return depth % 2 === 0 ? re : otherElf(re)
  }

  // 优先安排省得多的人(豪华 48 > 普通 28):先放他们能让高价值的人占住槽位。
  const sorted = [...cands].sort(
    (a, b) => (SAVING[b.tier] || 0) - (SAVING[a.tier] || 0),
  )

  // 候选较多时(>12)回溯会爆炸,退化成贪心:先把省得多的塞进好友槽位。
  if (sorted.length > 12) return greedyMatch(slots, sorted, friendMap, elfUnder)

  let best = []
  let bestScore = -1
  const used = new Array(slots.length).fill(false)
  const cur = []

  const dfs = (i, score) => {
    if (i === sorted.length) {
      if (cur.length > best.length || (cur.length === best.length && score > bestScore)) {
        best = cur.map((x) => ({ ...x }))
        bestScore = score
      }
      return
    }
    const p = sorted[i]
    for (let s = 0; s < slots.length; s++) {
      if (used[s]) continue
      const slot = slots[s]
      if (slot.couponType !== p.tier) continue
      const elf = elfUnder(slot.from)
      if (p.needElf !== 'any' && p.needElf !== elf) continue
      used[s] = true
      cur.push({ person: p, slot, elf })
      dfs(i + 1, score + (areFriends(friendMap, p.id, slot.from) ? 1 : 0))
      cur.pop()
      used[s] = false
    }
    dfs(i + 1, score) // 本层不放,留到下一层(精灵翻转)
  }
  dfs(0, 0)
  return best
}

function greedyMatch(slots, sorted, friendMap, elfUnder) {
  const used = new Array(slots.length).fill(false)
  const out = []
  for (const p of sorted) {
    let pick = -1
    let pickFriend = false
    for (let s = 0; s < slots.length; s++) {
      if (used[s]) continue
      const slot = slots[s]
      if (slot.couponType !== p.tier) continue
      const elf = elfUnder(slot.from)
      if (p.needElf !== 'any' && p.needElf !== elf) continue
      const isF = areFriends(friendMap, p.id, slot.from)
      if (pick === -1 || (isF && !pickFriend)) {
        pick = s
        pickFriend = isF
      }
    }
    if (pick === -1) continue
    used[pick] = true
    out.push({ person: p, slot: slots[pick], elf: elfUnder(slots[pick].from) })
  }
  return out
}

// computeCost 根自购通行证、其余人付副券。
function computeCost(people, built) {
  let total = 0
  const payOf = new Map()
  for (const p of people) {
    const isRoot = built.depthOf.get(p.id) === 0
    const price = PRICE[p.tier] || PRICE.normal
    const amt = isRoot ? price.pass : price.coupon
    payOf.set(p.id, amt)
    total += amt
  }
  return { total, payOf }
}

// searchBest 枚举根集合(1..3 个)与各根精灵,取总成本最低者。
//
// 根数上限取 3:根越多意味着越多的人要自购正价,实际场景(十来人的群)里
// 不会比 3 个更多;再放宽也只是在浪费枚举时间。
function searchBest(people, friendMap, byId, headId = null) {
  const ids = people.map((p) => p.id)
  let best = null
  const maxRoots = Math.min(3, people.length)

  for (let k = 1; k <= maxRoots; k++) {
    for (const combo of combinations(ids, k)) {
      // 指定了车头 ⇒ 它必须是自购源头之一,否则这个根组合直接不成立
      if (headId != null && !combo.includes(headId)) continue

      // 车头固定在 rootIds[0]:rootIds[0] 决定 buildCollectBill 的收款人
      // (群收款由车头发起)。用旋转而非跳过,避免把合法组合整个丢掉。
      // 根集合内部顺序不影响 tryBuild(elves 按 id 建键、槽位与顺序无关)。
      const rootIds =
        headId != null ? [headId, ...combo.filter((id) => id !== headId)] : combo

      for (const assign of elfAssignments(rootIds, byId)) {
        const built = tryBuild(people, rootIds, assign, friendMap, byId)
        if (!built) continue
        const cost = computeCost(people, built)
        // 成本相同时取根更少的(方案更简洁,转账更好解释)
        if (!best || cost.total < best.cost.total ||
            (cost.total === best.cost.total && rootIds.length < best.rootIds.length)) {
          best = { rootIds, built, cost, rootElfAssign: assign }
        }
      }
    }
  }
  return best
}

// tryFill 尝试补 1~2 个"虚拟人"把方案打通或摊薄,返回人均最低的那种补法。
//
// 虚拟人的**精灵与档次由程序枚举决定** —— 这正是「程序指定」的含义:使用者只
// 需要知道"再拉两个要新月鹭的人进来就通了 / 更便宜",不必自己去推导。
//
// 只有"确实比全员自购便宜"的补法才算数:补人后总支出必然上升(多了几个人),
// 若新方案压根没用上副券,那只是把更多人拉进来一起原价买,毫无意义。
function tryFill(people, friendMap, byId, maxGaps = 0, headId = null) {
  let bestFill = null
  for (let g = 1; g <= maxGaps; g++) {
    for (const tier of ['normal', 'premium']) {
      for (const elf of ['elf1', 'elf2']) {
        const filler = []
        for (let i = 0; i < g; i++) {
          filler.push({
            id: -1000 - i,
            name: '待补成员' + (g > 1 ? i + 1 : ''),
            tier,
            needElf: elf,
            isHead: false,
            _filler: true,
          })
        }
        const all = [...people, ...filler]
        const allById = new Map(all.map((p) => [p.id, p]))
        const b = searchBest(all, friendMap, allById, headId)
        if (!b) continue
        const soloAll = all.reduce((s, p) => s + (PRICE[p.tier] || PRICE.normal).pass, 0)
        if (b.cost.total >= soloAll) continue
        const avg = b.cost.total / all.length
        if (!bestFill || avg < bestFill.avg) {
          bestFill = {
            count: g,
            tier,
            elf,
            elfName: elfNames[elf],
            avg,
            total: b.cost.total,
            best: b,
            all,
            filler,
          }
        }
      }
    }
  }
  return bestFill
}

// buildResultCards 生成每人一张卡片:角色、精灵、上下游、实际支出、转账指令。
function buildResultCards(people, best, byId, friendMap) {
  const { depthOf, parentOf, elfOf } = best.built
  const n = people.length
  const perPerson = Math.round((best.cost.total / n) * 100) / 100

  const childrenOf = new Map()
  for (const [child, parent] of parentOf) {
    if (!childrenOf.has(parent)) childrenOf.set(parent, [])
    childrenOf.get(parent).push(child)
  }

  const cards = people.map((p) => {
    const isRoot = depthOf.get(p.id) === 0
    const parent = parentOf.get(p.id)
    const children = childrenOf.get(p.id) || []
    const myElf = elfOf.get(p.id)
    const paid = best.cost.payOf.get(p.id)
    const price = PRICE[p.tier] || PRICE.normal

    const items = []
    if (isRoot) {
      items.push({ label: `自购「${elfNames[myElf]}」通行证`, amount: price.pass, type: 'expense' })
    } else {
      const giver = byId.get(parent)
      items.push({
        label: `收到「${elfNames[myElf]}」副券（来自 ${giver ? giver.name : '?'}）`,
        amount: price.coupon,
        type: 'info-tag',
      })
    }
    for (const c of children) {
      const kid = byId.get(c)
      const kidPrice = PRICE[kid.tier] || PRICE.normal
      items.push({
        label: `购买「${elfNames[elfOf.get(c)]}」副券（给 ${kid.name}）`,
        amount: kidPrice.coupon,
        type: 'expense',
      })
    }

    // 转账:与旧版同思路 —— 源头垫付最多,其余人把「应摊 - 实付」的差额转给主源头。
    const transfers = []
    const mainRoot = best.rootIds[0]
    if (p.id !== mainRoot) {
      const diff = Math.round((perPerson - paid) * 100) / 100
      const rootPerson = byId.get(mainRoot)
      transfers.push({
        direction: 'out',
        to: rootPerson ? rootPerson.name : '车头',
        amount: diff,
        reason: `应摊 ${perPerson} 元 - 实付 ${paid} 元`,
      })
    }

    return {
      person: p,
      // 「车尾」已随车尾功能一并移除:这里是树的叶子节点,叫「末端」更准。
      // 旧名与新结构无关(树没有单一末端),留着会让人以为还能指定车尾。
      role: isRoot ? '源头' : children.length ? '中间人' : '末端',
      elf: myElf,
      myElfName: elfNames[myElf],
      tier: p.tier,
      depth: depthOf.get(p.id),
      parentId: parent == null ? null : parent,
      children,
      paid,
      perPerson,
      // netExpense 沿用旧字段名:平摊后每个人的净支出就是人均额。
      // 旧版是「实付 + 转账补差」,本版统一由 collectBill 表达,
      // 卡片上直接给人均值,不重复列出转账细节。
      netExpense: perPerson,
      items,
      transfers,
      // 好友提示沿用旧版:只提示,不作为硬约束
      friendHints: [
        ...(parent != null
          ? [{
              type: 'prev',
              name: byId.get(parent) ? byId.get(parent).name : '?',
              isFriend: areFriends(friendMap, p.id, parent),
            }]
          : []),
        ...children.map((c) => ({
          type: 'next',
          name: byId.get(c) ? byId.get(c).name : '?',
          isFriend: areFriends(friendMap, p.id, c),
        })),
      ],
    }
  })

  return { cards, perPerson, childrenOf }
}

// buildCollectBill 群收款账单:主源头(第一个根)垫付最多,其余人把
// 「应摊 - 实付」的净差额转给它。沿用旧版语义,只是 head 变成树的主根。
function buildCollectBill(people, cards, best, byId) {
  const headId = best.rootIds[0]
  const head = byId.get(headId)
  const perPerson = cards.length ? cards[0].perPerson : 0
  const items = []
  let total = 0
  for (const c of cards) {
    if (c.person.id === headId) continue
    const amount = Math.round((perPerson - c.paid) * 100) / 100
    items.push({ person: c.person, amount })
    total += amount
  }
  return { head, perPerson, total: Math.round(total * 100) / 100, items }
}

export function generatePlan(people, names, friendMatrix, opts = {}) {
  elfNames.elf1 = names.elf1 || '离心舞者'
  elfNames.elf2 = names.elf2 || '胡桃王子'

  const validation = validatePeople(people)
  if (!validation.valid) return { success: false, error: validation.error }

  const friendMap = buildFriendshipMap(people, friendMatrix)
  const byId = new Map(people.map((p) => [p.id, p]))

  // 车头:由 UI 指定(唯一),算法保证它是自购源头且为群收款收款人。
  const head = people.find((p) => p.isHead)
  const headId = head ? head.id : null

  const best = searchBest(people, friendMap, byId, headId)
  // maxGaps 默认 0:只给确定方案。想要「再拉人能省多少」时由使用者显式放开。
  const maxGaps = opts.maxGaps ?? 0
  const fill = maxGaps > 0 ? tryFill(people, friendMap, byId, maxGaps, headId) : null

  if (!best) {
    const gap = fill
    if (!gap) {
      const c1 = people.filter((p) => p.needElf === 'elf1').length
      const c2 = people.filter((p) => p.needElf === 'elf2').length
      const any = people.filter((p) => p.needElf === 'any').length
      return {
        success: false,
        error:
          `无法生成满足规则的传火方案。当前 ${c1} 人选「${elfNames.elf1}」、` +
          `${c2} 人选「${elfNames.elf2}」、${any} 人选都行，共 ${people.length} 人。` +
          `请检查精灵需求与档次搭配：豪华版可送 1 豪华 + 1 普通副券，普通版只能送 1 张普通副券，` +
          `且副券必须是另一种精灵。`,
      }
    }
    const { best: gBest, all, filler, elfName, tier: gapTierSel } = gap
    const allById = new Map(all.map((p) => [p.id, p]))
    const { cards } = buildResultCards(all, gBest, allById, friendMap)
    const nAll = all.length
    const nReal = people.length
    const soloTotal = people.reduce((s, p) => s + (PRICE[p.tier] || PRICE.normal).pass, 0)
    return {
      success: true,
      hasGaps: true,
      gaps: filler.map((f) => ({ tier: f.tier, elf: f.needElf, elfName: elfNames[f.needElf] })),
      gapHint:
        `还差 ${filler.length} 人（都要「${elfName}」、${gapTierSel === 'premium' ? '豪华版' : '普通版'}），` +
        `补齐后 ${nAll} 人成链`,
      soloTotal,
      soloAvg: Math.round((soloTotal / nReal) * 100) / 100,
      resultCards: cards,
      ...cards,
      collectBill: buildCollectBill(all, cards, gBest, allById),
      total: gBest.cost.total,
      avg: Math.round((gBest.cost.total / nAll) * 100) / 100,
      savings: Math.round((soloTotal / nReal - gBest.cost.total / nAll) * 100) / 100,
      chain: all.map((p) => p),
      chainWithElf: all.map((p) => ({
        person: p,
        assignedElf: gBest.built.elfOf.get(p.id),
      })),
      tier: 'mixed',
      friendWarnings: [],
      totalGamePayment: gBest.cost.total,
    }
  }

  const { cards, perPerson, childrenOf } = buildResultCards(people, best, byId, friendMap)
  const soloTotal = people.reduce((s, p) => s + (PRICE[p.tier] || PRICE.normal).pass, 0)

  // 补人建议:即使当前已经成链,若"再拉 1~2 人"能让人均更低,也提示出来。
  // 补人后总支出一定更高(多了几个人),所以比较的是**人均**而不是总额 ——
  // 群里每个人的决策依据是"我掏多少",不是"总共掏多少"。
  let gapSuggestion = null
  if (fill) {
    const curAvg = best.cost.total / people.length
    if (fill.avg + GAP_MIN_SAVE <= curAvg) {
      gapSuggestion = {
        count: fill.count,
        tier: fill.tier,
        elf: fill.elf,
        elfName: fill.elfName,
        avgNow: Math.round(curAvg * 100) / 100,
        avgAfter: Math.round(fill.avg * 100) / 100,
        savePerPerson: Math.round((curAvg - fill.avg) * 100) / 100,
        totalAfter: fill.total,
      }
    }
  }

  // 非好友相邻的提醒(软约束)
  const friendWarnings = []
  for (const [child, parent] of best.built.parentOf) {
    if (!areFriends(friendMap, child, parent)) {
      const a = byId.get(parent)
      const b = byId.get(child)
      friendWarnings.push({ from: a ? a.name : '?', to: b ? b.name : '?' })
    }
  }

  // 全员自购(没有任何赠送发生)时如实说明:此时 savings=0,若只显示
  // "省 0 元"会让人以为算错了,实际是这组配置根本串不起来。
  const noGift = best.built.parentOf.size === 0

  return {
    success: true,
    hasGaps: false,
    noGift,
    noGiftHint: noGift
      ? '当前配置无法形成赠送关系（精灵需求或档次搭配串不起来），所有人都需自购通行证'
      : null,
    gapSuggestion,
    cards,
    resultCards: cards, // 旧字段名,结果区多处引用
    childrenOf,
    perPerson,
    collectBill: buildCollectBill(people, cards, best, byId),
    total: best.cost.total,
    soloTotal,
    savings: soloTotal - best.cost.total,
    chain: people,
    chainWithElf: people.map((p) => ({
      person: p,
      assignedElf: best.built.elfOf.get(p.id),
    })),
    tier: 'mixed',
    friendWarnings,
    totalGamePayment: best.cost.total,
  }
}

export { elfNames, PRICE }
