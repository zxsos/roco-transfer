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

// actualPassPrice 车头自购通行证实际花的钱。
//
// 车头不一定从官方渠道买(代充、活动价、手上有折扣等),所以允许填一个自购价;
// 但**上限就是官方价** —— 比官方价还贵的话本来就该直接在官方买,填进来只会让
// 账上多出一笔没必要的钱(手滑把 128 敲成 1280 尤其容易,而它会摊到全团头上)。
// 没填或填了非法值一律退回官方价 —— 宁可少算,也不能因为脏数据算出负成本。
function actualPassPrice(p, price) {
  const v = Number(p.headPrice)
  return Number.isFinite(v) && v > 0 && v <= price.pass ? v : price.pass
}

// computeCost 根自购通行证、其余人付副券。
//
// 返回两个总额:
//   total   实际总支付(车头按他填的自购价)
//   nominal 名义总支付(车头按官方价)
// 两者之差就是车头自购渠道带来的盈亏,分摊时**只由车头本人承担**(见 splitShares)。
function computeCost(people, built) {
  let total = 0
  let nominal = 0
  const payOf = new Map()
  for (const p of people) {
    const isRoot = built.depthOf.get(p.id) === 0
    const price = PRICE[p.tier] || PRICE.normal
    const official = isRoot ? price.pass : price.coupon
    // 自购价只对「车头本人且是自购源头」生效:普通源头没有这个入口,
    // 非车头的人即使带着脏数据也不该享受。
    const amt = isRoot && p.isHead ? actualPassPrice(p, price) : official
    payOf.set(p.id, amt)
    total += amt
    nominal += official
  }
  return { total, nominal, payOf }
}

// splitShares 按「等额优惠」把总支出摊回每个人:每人净支出 = 自己档次原价 − 人均节省额。
//
// **不能**简单 total / n 平摊:档次不同意味着拿到的东西不同(豪华 128 / 普通 68),
// 平摊会让买豪华的人拿走几乎全部优惠、买普通的人几乎不省甚至倒贴 ——
// 例:1 豪华 + 1 普通,总价 168,平摊 84,而普通版原价才 68,等于让他倒贴 16 元,
// 不可能有人接受。等额优惠下两人各省 14 元:豪华 114 / 普通 54,谁都划算。
// 全员同档次时本函数退化成平摊,与旧行为一致。
//
// 取整到「分」并做余额补差:保证 sum(shares) 严格等于 total,不出现对不上账的尾差。
function splitShares(people, total, headId = null, headDelta = 0) {
  const n = people.length
  const soloCents = people.map((p) => Math.round((PRICE[p.tier] || PRICE.normal).pass * 100))
  const soloTotalCents = soloCents.reduce((s, v) => s + v, 0)
  const totalCents = Math.round(total * 100)
  const avgSaveCents = (soloTotalCents - totalCents) / n

  const raw = soloCents.map((v) => v - avgSaveCents)
  const cents = raw.map((v) => Math.floor(v))
  // 小数部分大的优先补 1 分(最大余额法),补到总额恰好等于 total
  const order = raw
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac)
  let rest = totalCents - cents.reduce((s, v) => s + v, 0)
  for (let k = 0; rest > 0; k++, rest--) cents[order[k % order.length].i] += 1
  // rest < 0 只在极端浮点下出现,从小数部分最小的份额里扣回,保持总额不变
  for (let k = order.length - 1; rest < 0; k--, rest++) {
    cents[order[((k % order.length) + order.length) % order.length].i] -= 1
  }

  // 车头自购渠道的盈亏**只算在车头自己头上**:
  // 他找到便宜渠道不该让全团跟着沾光,买贵了更不该让别人替他背锅 ——
  // 否则填个 9999 的自购价,总支出会超过全员自购,所有人都被他拖下水。
  // 此时 sum(shares) = nominal + delta = 实际总支付,账目仍闭合。
  if (headId != null && headDelta) {
    const i = people.findIndex((p) => p.id === headId)
    if (i >= 0) cents[i] += Math.round(headDelta * 100)
  }

  // 净支出不能为负。
  //
  // 车头的份额是「自购价 − 人均节省额」,自购价一旦低于人均节省(常见 20~48 元)
  // 就会翻负 —— 等于参加拼团还倒收钱,而且会连带出现「省的钱比原价还多」。
  // 真金白银的场景不能有负数:截断到 0,再从净支出为正的人身上按额度扣回
  // (他们相应少付),保证 sum(shares) 仍严格等于总支付。
  const negSum = cents.reduce((s, v) => s + (v < 0 ? -v : 0), 0)
  if (negSum > 0) {
    for (let i = 0; i < cents.length; i++) if (cents[i] < 0) cents[i] = 0
    const pool = cents.map((v, i) => ({ v, i })).filter((x) => x.v > 0)
    const poolSum = pool.reduce((s, x) => s + x.v, 0)
    if (poolSum > 0) {
      const owed = Math.min(negSum, poolSum)
      let left = owed
      for (const x of pool) {
        const take = Math.min(x.v, Math.floor((owed * x.v) / poolSum))
        cents[x.i] -= take
        left -= take
      }
      // 整除剩下的零星几分,从当前份额最大的人那里逐分扣
      while (left > 0) {
        let pick = -1
        for (const x of pool) {
          if (cents[x.i] > 0 && (pick === -1 || cents[x.i] > cents[pick])) pick = x.i
        }
        if (pick === -1) break
        cents[pick] -= 1
        left -= 1
      }
    }
  }

  const shareOf = new Map()
  people.forEach((p, i) => shareOf.set(p.id, cents[i] / 100))
  return { shareOf, savingPerPerson: Math.round(avgSaveCents) / 100 }
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
            // 字符串 id:真实成员 id 也是字符串(多人合并需要)。用下划线前缀避免与
            // 随机 hex id 混淆,也避免历史上 -1000-i 的负数形式被当成数字处理。
            id: '__fill' + i,
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
        // 用「人均可省」而不是「总人均支出」来挑补法:档次不同时总人均会被
        // 拉进来的普通版稀释,看起来便宜了,其实原有成员一分没多省。
        const savingPerPerson = (soloAll - b.cost.total) / all.length
        if (!bestFill || savingPerPerson > bestFill.savingPerPerson) {
          bestFill = {
            count: g,
            tier,
            elf,
            elfName: elfNames[elf],
            avg: b.cost.total / all.length,
            savingPerPerson,
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
  // perPerson 是「实际人均」(总支出 / 人数),只作参考:各档次净支出不同,
  // 真正该付多少看每张卡的 share(见 splitShares)。
  const perPerson = Math.round((best.cost.total / n) * 100) / 100
  // 分摊基准是**名义总额**(车头按官方价),车头自购价的差额单独算给他本人
  const headPerson = people.find((p) => p.isHead)
  const { shareOf, savingPerPerson } = splitShares(
    people,
    best.cost.nominal,
    headPerson ? headPerson.id : null,
    best.cost.total - best.cost.nominal,
  )

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
    const share = shareOf.get(p.id)
    const price = PRICE[p.tier] || PRICE.normal
    const mainRootId = best.rootIds[0]
    const isMainRoot = p.id === mainRootId

    // 明细只列**自己掏钱**的项目:
    //   · 自购通行证 / 收下副券 → 自己付给游戏,是支出
    //   · 送出副券 → 副券费由接收者付(见规则注释),自己不掏钱,不能记成支出
    // 旧版把「送出副券」按接收者的券价记在自己头上,源头卡片会出现
    // 「128 + 40 = 168」而净支出却写 62 这种自相矛盾的账。
    const items = []
    if (isRoot) {
      // amount 用 paid 而不是定价:车头可能按自购价买,写定价会和实付对不上
      const custom = paid !== price.pass
      items.push({
        label: `自购「${elfNames[myElf]}」通行证${custom ? '（自购价）' : ''}`,
        amount: paid,
        type: 'expense',
      })
    } else {
      const giver = byId.get(parent)
      items.push({
        label: `付副券费收下「${elfNames[myElf]}」（来自 ${giver ? giver.name : '?'}）`,
        amount: price.coupon,
        type: 'expense',
      })
    }
    for (const c of children) {
      const kid = byId.get(c)
      const kidPrice = PRICE[kid.tier] || PRICE.normal
      items.push({
        label: `送出「${elfNames[elfOf.get(c)]}」副券（给 ${kid.name}，其自付 ${kidPrice.coupon} 元）`,
        amount: 0,
        type: 'gift',
      })
    }

    // 结算:与车头(主源头)统一结清 —— 实付比应摊少的,把差额转给车头;
    // 实付比应摊多的(车头本人,或另一个自购源头),由车头退回去。
    //
    // **车头本人也要列这一行**:他的明细只有「自购 128」,不列收款的话
    // 128 和净支出 107 对不上,同样看着像算错。
    const transfers = []
    const settle = Math.round((share - paid) * 100) / 100
    const rootPerson = byId.get(mainRootId)
    if (!isMainRoot) {
      transfers.push({
        direction: settle >= 0 ? 'out' : 'in',
        to: rootPerson ? rootPerson.name : '车头',
        amount: Math.abs(settle),
        reason: `应摊 ${share} 元 - 实付 ${paid} 元`,
      })
    }
    if (settle !== 0) {
      items.push({
        label:
          settle > 0
            ? `转账给 ${rootPerson ? rootPerson.name : '车头'}（结算差额）`
            : isMainRoot
              ? '收到其他人转账（结算差额）'
              : `收 ${rootPerson ? rootPerson.name : '车头'} 转账（结算差额）`,
        amount: Math.abs(settle),
        type: settle > 0 ? 'transfer-out' : 'transfer-in',
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
      // share 是这个人最终该承担的净支出(等额优惠分摊后);
      // netExpense 沿用旧字段名,语义从「人均额」变为「自己那份净支出」。
      share,
      // soloPrice 这个人档次的自购原价。省的钱是**跟它**比的:
      // 原价 68 − 省 21 = 净支出 47。卡上把三者一起列出来,否则
      // 「实付 40」和「省 21」并排会让人误以为 40 + 21 该等于原价。
      soloPrice: price.pass,
      saving: Math.round((price.pass - share) * 100) / 100,
      netExpense: share,
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

  return { cards, perPerson, savingPerPerson, childrenOf }
}

// buildCollectBill 群收款账单:主源头(第一个根)垫付最多,其余人把
// 「应摊 - 实付」的净差额转给它。沿用旧版语义,只是 head 变成树的主根。
//
// 差额为负的人(比如另一个自购源头,实付已超过自己那份)不是「待支付」
// 而是车头要退钱给他,单独放进 refundItems —— 群收款收不了负数,
// 混在一起会显示成「待支付 ¥-44.00」。
function buildCollectBill(people, cards, best, byId) {
  const headId = best.rootIds[0]
  const head = byId.get(headId)
  const payItems = []
  const refundItems = []
  let receive = 0
  let refund = 0
  for (const c of cards) {
    if (c.person.id === headId) continue
    const amount = Math.round((c.share - c.paid) * 100) / 100
    if (amount >= 0) {
      payItems.push({ person: c.person, amount })
      receive += amount
    } else {
      refundItems.push({ person: c.person, amount: Math.abs(amount) })
      refund += Math.abs(amount)
    }
  }
  return {
    head,
    payItems,
    refundItems,
    receive: Math.round(receive * 100) / 100,
    refund: Math.round(refund * 100) / 100,
    // total 保留旧字段名(=车头实际收到的总额),旧代码按它渲染
    total: Math.round(receive * 100) / 100,
  }
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
    const { cards, savingPerPerson: gapSavingPerPerson } = buildResultCards(
      all,
      gBest,
      allById,
      friendMap,
    )
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
      // cards 必须挂上去:结果区与树状图都读 planResult.cards。
      // 这里原本是 `...cards`(展开数组 → 0/1/2... 数字键),根本没有 cards 字段,
      // 补人方案下整棵树会读不到数据。resultCards 是旧字段,一并保留。
      cards,
      resultCards: cards,
      collectBill: buildCollectBill(all, cards, gBest, allById),
      total: gBest.cost.total,
      avg: Math.round((gBest.cost.total / nAll) * 100) / 100,
      // 等额优惠下真实成员与补位成员各省一样多,直接取卡片算好的值;
      // savings 是「真实成员这部分人」的节省额,按人头占比从总额里切出来。
      savingPerPerson: gapSavingPerPerson,
      savings: Math.round((soloTotal - (gBest.cost.total * nReal) / nAll) * 100) / 100,
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

  const { cards, perPerson, savingPerPerson, childrenOf } = buildResultCards(
    people,
    best,
    byId,
    friendMap,
  )
  const soloTotal = people.reduce((s, p) => s + (PRICE[p.tier] || PRICE.normal).pass, 0)

  // 补人建议:即使当前已经成链,若"再拉 1~2 人"能让人均更低,也提示出来。
  // 补人后总支出一定更高(多了几个人),所以比较的是**人均**而不是总额 ——
  // 群里每个人的决策依据是"我掏多少",不是"总共掏多少"。
  let gapSuggestion = null
  if (fill) {
    // 判据是「人均可省」提高:只有原有成员真的能多省钱才值得去拉人。
    const gain = fill.savingPerPerson - savingPerPerson
    if (gain >= GAP_MIN_SAVE) {
      gapSuggestion = {
        count: fill.count,
        tier: fill.tier,
        elf: fill.elf,
        elfName: fill.elfName,
        savingNow: Math.round(savingPerPerson * 100) / 100,
        savingAfter: Math.round(fill.savingPerPerson * 100) / 100,
        savePerPerson: Math.round(gain * 100) / 100,
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
    // 人均可省:等额优惠分摊后每个人相对自购省下的钱(各档次一致)
    savingPerPerson,
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
