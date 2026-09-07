const elfNames = { elf1: '离心舞者', elf2: '胡桃王子' }

const PRICE = {
  normal: { pass: 68, coupon: 40 },
  premium: { pass: 128, coupon: 80 },
}

const otherElf = (e) => (e === 'elf1' ? 'elf2' : 'elf1')

function validatePeople(people) {
  if (people.length < 2) {
    return { valid: false, error: '至少需要2个人才能组成传火链条' }
  }
  const headList = people.filter((p) => p.isHead)
  if (headList.length > 1) {
    return { valid: false, error: '只能有一个车头，当前有 ' + headList.length + ' 人被标记为车头' }
  }
  const tailList = people.filter((p) => p.isTail)
  if (tailList.length > 1) {
    return { valid: false, error: '只能有一个车尾，当前有 ' + tailList.length + ' 人被标记为车尾' }
  }
  if (headList.length > 0 && tailList.length > 0 && headList[0].id === tailList[0].id) {
    return { valid: false, error: '车头和车尾不能是同一个人' }
  }
  return { valid: true, error: null }
}

function buildFriendshipMap(people, friendMatrix) {
  const map = new Map()
  for (const p of people) {
    map.set(p.id, new Set())
  }
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

/**
 * DFS + 回溯搜索精灵交替链条（不约束好友关系）
 * 支持 needElf = 'any'：该人可放在 elf1 或 elf2 位置
 * chain 中每项为 { person, assignedElf }
 * @returns {Array|null}
 */
function searchChain(people, friendMap) {
  const N = people.length
  const headPerson = people.find((p) => p.isHead)
  const tailPerson = people.find((p) => p.isTail)

  const tailCandidates = tailPerson
    ? [tailPerson]
    : people.filter((p) => !headPerson || p.id !== headPerson.id)

  let bestChain = null
  let bestScore = -1

  for (const tail of tailCandidates) {
    const tailElfOptions = tail.needElf === 'any' ? ['elf1', 'elf2'] : [tail.needElf]

    for (const tailElf of tailElfOptions) {
      const chain = new Array(N).fill(null)
      chain[N - 1] = { person: tail, assignedElf: tailElf }
      const used = new Set([tail.id])
      if (headPerson) used.add(headPerson.id)

      function dfs(pos, friendEdgeCount) {
        if (pos < 0) {
          if (friendEdgeCount > bestScore) {
            bestScore = friendEdgeCount
            bestChain = chain.map((c) => ({ person: c.person, assignedElf: c.assignedElf }))
          }
          return
        }

        if (pos === 0 && headPerson) {
          const nextElf = chain[1].assignedElf
          const needElf = otherElf(nextElf)
          if (headPerson.needElf === needElf || headPerson.needElf === 'any') {
            chain[0] = { person: headPerson, assignedElf: needElf }
            const isFriendEdge = areFriends(friendMap, headPerson.id, chain[1].person.id)
            dfs(-1, friendEdgeCount + (isFriendEdge ? 1 : 0))
            chain[0] = null
          }
          return
        }

        const nextPerson = chain[pos + 1].person
        const nextAssignedElf = chain[pos + 1].assignedElf
        const needElf = otherElf(nextAssignedElf)

        const candidates = people.filter((p) => {
          if (used.has(p.id)) return false
          if (headPerson && p.id === headPerson.id) return false
          return p.needElf === needElf || p.needElf === 'any'
        })

        const sorted = candidates.sort((a, b) => {
          const aFriend = areFriends(friendMap, a.id, nextPerson.id) ? 1 : 0
          const bFriend = areFriends(friendMap, b.id, nextPerson.id) ? 1 : 0
          return bFriend - aFriend
        })

        const maxPossibleRemaining = pos
        if (friendEdgeCount + maxPossibleRemaining + 1 <= bestScore) return

        for (const c of sorted) {
          const isFriendEdge = areFriends(friendMap, c.id, nextPerson.id)
          chain[pos] = { person: c, assignedElf: needElf }
          used.add(c.id)
          dfs(pos - 1, friendEdgeCount + (isFriendEdge ? 1 : 0))
          used.delete(c.id)
          chain[pos] = null
        }
      }

      dfs(N - 2, 0)
    }
  }

  return bestChain
}

/**
 * 核心：生成传火链条方案
 * @param {Array} people - [{ id, name, needElf, isHead, isTail }]  needElf: 'elf1'|'elf2'|'any'
 * @param {string} tier - 'normal' | 'premium'
 * @param {Object} names - { elf1, elf2 }
 * @param {Array} friendMatrix - [[idA, idB], ...] 双向好友关系（仅用于提示）
 */
export function generatePlan(people, tier, names, friendMatrix) {
  elfNames.elf1 = names.elf1 || '离心舞者'
  elfNames.elf2 = names.elf2 || '胡桃王子'

  const validation = validatePeople(people)
  if (!validation.valid) {
    return { success: false, error: validation.error }
  }

  const friendMap = buildFriendshipMap(people, friendMatrix)

  const chain = searchChain(people, friendMap)

  if (!chain) {
    const elf1Count = people.filter((p) => p.needElf === 'elf1').length
    const elf2Count = people.filter((p) => p.needElf === 'elf2').length
    const anyCount = people.filter((p) => p.needElf === 'any').length
    return {
      success: false,
      error:
        `无法生成满足精灵交替规则的传火链条。` +
        `当前有 ${elf1Count} 人选「${elfNames.elf1}」、${elf2Count} 人选「${elfNames.elf2}」、${anyCount} 人选都行，` +
        `共 ${people.length} 人。请调整需求配置，确保两种精灵的人数能交替排列。`,
    }
  }

  const price = PRICE[tier]
  const resultCards = buildResultCards(chain, price, friendMap)
  const collectBill = buildCollectBill(chain, resultCards)

  const friendWarnings = []
  for (let i = 0; i < chain.length - 1; i++) {
    const a = chain[i].person
    const b = chain[i + 1].person
    if (!areFriends(friendMap, a.id, b.id)) {
      friendWarnings.push({ from: a.name, to: b.name })
    }
  }

  const n = chain.length
  const P = price.pass
  const S = price.coupon
  const totalGamePayment = P + (n - 1) * S
  const savings = (n - 1) * (P - S)

  return {
    success: true,
    chain: chain.map((c) => c.person),
    chainWithElf: chain,
    resultCards,
    collectBill,
    friendWarnings,
    tier,
    totalGamePayment,
    savings,
  }
}

// 群收款账单：由车头（源头）统一发起，其余成员各转给车头一笔净差额
function buildCollectBill(chain, cards) {
  const head = chain[0].person
  const perPerson = cards[0].perPerson
  const items = []
  for (let i = 1; i < chain.length; i++) {
    const out = cards[i].transfers.find((t) => t.direction === 'out')
    if (!out) continue
    items.push({ person: chain[i].person, amount: out.amount })
  }
  const total = Math.round(items.reduce((s, it) => s + it.amount, 0) * 100) / 100
  return { head, perPerson, total, items }
}

function buildResultCards(chain, price, friendMap) {
  const cards = []
  const n = chain.length
  const P = price.pass
  const S = price.coupon

  const totalGamePayment = P + (n - 1) * S
  const perPerson = Math.round((totalGamePayment / n) * 100) / 100

  for (let i = 0; i < n; i++) {
    const { person, assignedElf } = chain[i]
    const isFirst = i === 0
    const isLast = i === n - 1

    let role
    if (n === 1) role = '唯一成员'
    else if (isFirst) role = '源头'
    else if (isLast) role = '车尾'
    else role = '中间人'

    const myElfName = elfNames[assignedElf]

    const items = []

    if (isFirst) {
      items.push({
        label: `购买「${myElfName}」通行证`,
        amount: P,
        type: 'expense',
      })
      if (n > 1) {
        const nextElfName = elfNames[chain[1].assignedElf]
        items.push({
          label: `购买「${nextElfName}」副券（给 ${chain[1].person.name}）`,
          amount: S,
          type: 'expense',
        })
      }
    } else if (!isLast) {
      const nextElfName = elfNames[chain[i + 1].assignedElf]
      items.push({
        label: `购买「${nextElfName}」副券（给 ${chain[i + 1].person.name}）`,
        amount: S,
        type: 'expense',
      })
    }

    if (!isFirst) {
      items.push({
        label: `收到「${myElfName}」副券（来自 ${chain[i - 1].person.name}，用于激活通行证）`,
        amount: S,
        type: 'info-tag',
      })
    }

    let gamePayment
    if (isFirst) gamePayment = P + S
    else if (isLast) gamePayment = 0
    else gamePayment = S

    // 简化结算：源头 A 现场代付最多，其余人只需把「应摊金额 - 各自现场代付」的净差额直接转给源头
    const transfers = []

    if (isFirst) {
      for (let j = 1; j < n; j++) {
        const draftPaid = j === n - 1 ? 0 : S
        const amt = Math.round((perPerson - draftPaid) * 100) / 100
        transfers.push({
          direction: 'in',
          from: chain[j].person.name,
          amount: amt,
          reason: `应摊 ${perPerson} 元 - 现场代付 ${draftPaid} 元`,
        })
      }
    } else {
      transfers.push({
        direction: 'out',
        to: chain[0].person.name,
        amount: Math.round((perPerson - gamePayment) * 100) / 100,
        reason: `应摊 ${perPerson} 元 - 现场代付 ${gamePayment} 元`,
      })
    }

    const friendHints = []
    if (!isFirst) {
      const prevPerson = chain[i - 1].person
      friendHints.push({
        type: 'prev',
        name: prevPerson.name,
        isFriend: areFriends(friendMap, person.id, prevPerson.id),
      })
    }
    if (!isLast) {
      const nextPerson = chain[i + 1].person
      friendHints.push({
        type: 'next',
        name: nextPerson.name,
        isFriend: areFriends(friendMap, person.id, nextPerson.id),
      })
    }

    cards.push({
      person,
      role,
      assignedElf,
      myElfName,
      gamePayment,
      totalCost: totalGamePayment,
      perPerson,
      netExpense: perPerson,
      totalIn: Math.round(transfers.filter((t) => t.direction === 'in').reduce((s, t) => s + t.amount, 0) * 100) / 100,
      totalOut: Math.round(transfers.filter((t) => t.direction === 'out').reduce((s, t) => s + t.amount, 0) * 100) / 100,
      items,
      transfers,
      friendHints,
    })
  }

  return cards
}

export { elfNames, PRICE }