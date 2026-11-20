import { REACTIONS } from './dataModel.js'

// 반응 목록과 그룹(설정에서 정한 순서·묶음)을 다루는 도우미.
// config.reactionLayout: [[key, key, ...], [key, ...]]  (key: 기본 반응은 이모지 그 자체, 커스텀은 'custom:id')

/** 사용할 수 있는 모든 반응: [{ key, label, type: 'emoji'|'image', value }] */
export function allReactionsFrom(config) {
  const builtIn = REACTIONS.map((r) => ({ key: r.emoji, label: r.label, type: 'emoji', value: r.emoji }))
  const custom = (config?.customReactions || []).map((r) => ({
    key: `custom:${r.id}`, label: r.name, type: r.emoji ? 'emoji' : 'image', value: r.emoji || r.image,
  }))
  return [...builtIn, ...custom]
}

/** 그룹으로 나눈 반응 목록. 설정에 없던 새 반응은 마지막 그룹 끝에 붙어요. */
export function reactionGroupsFrom(config) {
  const all = allReactionsFrom(config)
  const byKey = new Map(all.map((r) => [r.key, r]))
  const used = new Set()
  const groups = []
  for (const g of Array.isArray(config?.reactionLayout) ? config.reactionLayout : []) {
    const items = (g || []).map((k) => byKey.get(k)).filter((r) => r && !used.has(r.key))
    items.forEach((r) => used.add(r.key))
    if (items.length) groups.push(items)
  }
  const rest = all.filter((r) => !used.has(r.key))
  if (rest.length) {
    if (groups.length) groups[groups.length - 1].push(...rest)
    else groups.push(rest)
  }
  return groups
}

/** 반응 하나를 그려요 (알림 등에서) */
export function findReaction(config, key) {
  return allReactionsFrom(config).find((r) => r.key === key) || { key, label: '반응', type: 'emoji', value: key.startsWith('custom:') ? '💬' : key }
}
