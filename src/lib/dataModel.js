// 저장소 안의 파일 구조:
//   config.json                  -> { members: [{ id, displayName, color, ..., checklistFields }], customReactions: [...] }
//                                    (체크리스트 항목은 멤버마다 따로 관리됩니다)
//   index.json                   -> { "2026-09-13": ["minji", "yohan"], ... }  (날짜별 작성자 인덱스, 조회 속도용)
//   entries/YYYY-MM-DD/{id}.json          -> (예전 방식) 한 사람의 그 날짜 첫 일기. 그대로 읽혀요. postId = 'main'
//   entries/YYYY-MM-DD/{id}.{postId}.json -> (새 방식) 한 사람이 그 날짜에 쓴 일기 여러 개. 스레드로 이어 붙여 보여줘요.
//   images/YYYY-MM-DD/{id}-xxx   -> 댓글에 첨부된 이미지

export const CONFIG_PATH = 'config.json'
export const INDEX_PATH = 'index.json'

export const REACTIONS = [
  { emoji: '👍', label: '따봉' },
  { emoji: '❤️', label: '하트' },
  { emoji: '🍀', label: '네잎클로버' },
  { emoji: '🤗', label: '안아주기' },
  { emoji: '😆', label: '웃김' },
  { emoji: '😢', label: '토닥토닥' },
]

export const DEFAULT_CHECKLIST_FIELDS = [
  { key: 'medication', label: '약', icon: '💊' },
  { key: 'outing', label: '외출/운동', icon: '🚶' },
  { key: 'cleaning', label: '청소', icon: '🧹' },
  { key: 'delivery', label: '배달 주문', icon: '🛵' },
]

export function getChecklistFields(member) {
  return member?.checklistFields || DEFAULT_CHECKLIST_FIELDS
}

export function todayStr(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export const LEGACY_POST_ID = 'main'

export function entryPath(date, memberId, postId = LEGACY_POST_ID) {
  if (!postId || postId === LEGACY_POST_ID) return `entries/${date}/${memberId}.json`
  return `entries/${date}/${memberId}.${postId}.json`
}

export function entryDirPath(date) {
  return `entries/${date}`
}

/** 파일 이름 → { memberId, postId }. 멤버 id에는 '.'이 들어갈 수 없어서 첫 '.'으로 나눠요. */
export function parseEntryFilename(name) {
  if (typeof name !== 'string' || !name.endsWith('.json')) return null
  const stem = name.slice(0, -5)
  const dot = stem.indexOf('.')
  const memberId = dot === -1 ? stem : stem.slice(0, dot)
  const postId = dot === -1 ? LEGACY_POST_ID : stem.slice(dot + 1)
  if (!ID_RE.test(memberId) || !/^[A-Za-z0-9-]{1,60}$/.test(postId)) return null
  return { memberId, postId }
}

/** 시간순으로 정렬되는 글 id (예: 20261107-123015-a1b2) */
export function makePostId(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0')
  const rand = Math.random().toString(16).slice(2, 6).padEnd(4, '0')
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}-${rand}`
}

export function imagePath(date, memberId, filename) {
  return `images/${date}/${memberId}-${Date.now()}-${filename}`
}

export function emptyEntry(date, memberId, postId) {
  return {
    date,
    author: memberId,
    postId,
    moodTags: [],
    content: '',
    images: [],
    checklist: {
      sleepHours: null,
    },
    reactions: {},
    comments: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

// ── config.json은 공동 작업자가 직접 수정할 수 있는 '신뢰할 수 없는 입력'으로 취급합니다.
const COLOR_RE = /^#[0-9a-fA-F]{3,8}$/
const ID_RE = /^[a-z0-9가-힣-]{1,40}$/
const IMG_DATA_RE = /^data:image\/(png|jpeg|gif|webp);base64,[A-Za-z0-9+/=]+$/

const safeColor = (c, fallback) => (typeof c === 'string' && COLOR_RE.test(c) ? c : fallback)
const safeImg = (u) => (typeof u === 'string' && u.length < 1_500_000 && IMG_DATA_RE.test(u) ? u : null)
const safeText = (t, max = 40) => (typeof t === 'string' ? t.slice(0, max) : '')

export function sanitizeConfig(raw) {
  const cfg = raw && typeof raw === 'object' ? raw : {}
  const members = (Array.isArray(cfg.members) ? cfg.members : [])
    .filter((m) => m && typeof m.id === 'string' && ID_RE.test(m.id))
    .map((m) => ({
      ...m,
      displayName: safeText(m.displayName) || m.id,
      color: safeColor(m.color, '#ff8fb1'),
      bgColor: m.bgColor ? safeColor(m.bgColor, null) : m.bgColor,
      avatar: m.avatar ? safeImg(m.avatar) : m.avatar,
      checklistFields: Array.isArray(m.checklistFields)
        ? m.checklistFields
            .filter((f) => f && typeof f.key === 'string' && /^[A-Za-z0-9_-]{1,60}$/.test(f.key))
            .map((f) => ({ ...f, label: safeText(f.label, 20), icon: safeText(f.icon, 16) }))
            .slice(0, 30)
        : m.checklistFields,
    }))
  const out = { ...cfg, members }
  if (Array.isArray(cfg.customReactions)) {
    out.customReactions = cfg.customReactions
      .filter((r) => r && typeof r.id === 'string' && /^[A-Za-z0-9_-]{1,60}$/.test(r.id))
      .map((r) => ({ ...r, name: safeText(r.name), image: r.image ? safeImg(r.image) : r.image, emoji: r.emoji ? safeText(r.emoji, 16) : r.emoji }))
  }
  return out
}

export async function loadConfig(client) {
  const res = await client.getJson(CONFIG_PATH)
  if (!res) return null
  return { ...res, json: sanitizeConfig(res.json) }
}

export async function initConfig(client, firstMember) {
  const config = { members: [firstMember] }
  await client.putJson(CONFIG_PATH, config, { message: '교환 일지 설정 초기화' })
  await client.putJson(INDEX_PATH, {}, { message: '일지 색인 초기화' })
  return config
}

export async function addMember(client, currentConfig, currentSha, newMember) {
  const updated = { ...currentConfig, members: [...currentConfig.members, newMember] }
  await client.putJson(CONFIG_PATH, updated, { sha: currentSha, message: `${newMember.displayName} 참여` })
  return updated
}

export async function updateMember(client, currentConfig, currentSha, memberId, patch) {
  const updated = {
    ...currentConfig,
    members: currentConfig.members.map((m) => (m.id === memberId ? { ...m, ...patch } : m)),
  }
  await client.putJson(CONFIG_PATH, updated, { sha: currentSha, message: `${memberId} 프로필 수정` })
  return updated
}

export async function removeMember(client, currentConfig, currentSha, memberId) {
  const updated = {
    ...currentConfig,
    members: currentConfig.members.filter((m) => m.id !== memberId),
  }
  await client.putJson(CONFIG_PATH, updated, { sha: currentSha, message: `${memberId} 삭제` })
  return updated
}

export async function addCustomReaction(client, currentConfig, currentSha, reaction) {
  const updated = {
    ...currentConfig,
    customReactions: [...(currentConfig.customReactions || []), reaction],
  }
  await client.putJson(CONFIG_PATH, updated, { sha: currentSha, message: `커스텀 반응 추가: ${reaction.name}` })
  return updated
}

export async function removeCustomReaction(client, currentConfig, currentSha, reactionId) {
  const updated = {
    ...currentConfig,
    customReactions: (currentConfig.customReactions || []).filter((r) => r.id !== reactionId),
  }
  await client.putJson(CONFIG_PATH, updated, { sha: currentSha, message: '커스텀 반응 삭제' })
  return updated
}

export async function addChecklistField(client, currentConfig, currentSha, memberId, field) {
  const member = currentConfig.members.find((m) => m.id === memberId)
  const current = getChecklistFields(member)
  return updateMember(client, currentConfig, currentSha, memberId, { checklistFields: [...current, field] })
}

export async function removeChecklistField(client, currentConfig, currentSha, memberId, key) {
  const member = currentConfig.members.find((m) => m.id === memberId)
  const current = getChecklistFields(member)
  return updateMember(client, currentConfig, currentSha, memberId, { checklistFields: current.filter((f) => f.key !== key) })
}

export async function loadIndex(client) {
  const res = await client.getJson(INDEX_PATH)
  if (!res) return { json: {}, sha: undefined }
  return res
}

async function markIndexed(client, date, memberId) {
  // 낙관적으로 갱신하되, sha 충돌이 나면 한 번 다시 읽어서 재시도합니다.
  for (let attempt = 0; attempt < 3; attempt++) {
    const { json, sha } = await loadIndex(client)
    const authors = new Set(json[date] || [])
    if (authors.has(memberId)) return
    authors.add(memberId)
    const updated = { ...json, [date]: Array.from(authors).sort() }
    try {
      await client.putJson(INDEX_PATH, updated, { sha, message: `색인 갱신 ${date}` })
      return
    } catch (e) {
      if (e.status === 409 || e.status === 422) continue // sha 충돌, 재시도
      throw e
    }
  }
}

async function unmarkIndexed(client, date, memberId) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const { json, sha } = await loadIndex(client)
    const authors = (json[date] || []).filter((id) => id !== memberId)
    const updated = { ...json }
    if (authors.length === 0) delete updated[date]
    else updated[date] = authors
    try {
      await client.putJson(INDEX_PATH, updated, { sha, message: `색인 갱신 ${date}` })
      return
    } catch (e) {
      if (e.status === 409 || e.status === 422) continue
      throw e
    }
  }
}

/** 글이 먼저 쓴 순서대로 오도록 정렬 */
function byCreatedAt(a, b) {
  const ta = a.json?.createdAt || ''
  const tb = b.json?.createdAt || ''
  if (ta !== tb) return ta < tb ? -1 : 1
  return a.postId < b.postId ? -1 : 1
}

/**
 * 그 날짜의 글 목록을 불러옵니다. memberId를 주면 그 사람 글만.
 * 반환: [{ memberId, postId, json, sha }] (먼저 쓴 글이 앞)
 */
export async function listPosts(client, date, memberId = null) {
  const files = await client.listDir(entryDirPath(date))
  const targets = files
    .filter((f) => f.type === 'file')
    .map((f) => parseEntryFilename(f.name))
    .filter((p) => p && (!memberId || p.memberId === memberId))
  const loaded = await Promise.all(targets.map(async (t) => {
    const res = await client.getJson(entryPath(date, t.memberId, t.postId))
    return res ? { ...t, json: res.json, sha: res.sha } : null
  }))
  return loaded.filter(Boolean).sort(byCreatedAt)
}

export async function saveEntry(client, date, memberId, postId, entryData, sha) {
  const payload = { ...entryData, postId, updatedAt: new Date().toISOString() }
  const result = await client.putJson(entryPath(date, memberId, postId), payload, {
    sha,
    message: `${memberId}의 ${date} 일기`,
  })
  await markIndexed(client, date, memberId)
  return { entry: payload, sha: result?.content?.sha }
}

/** keepIndexed: 그 날 이 사람의 다른 글이 아직 남아 있으면 true (캘린더 점을 지우지 않음) */
export async function deleteEntry(client, date, memberId, postId, sha, { keepIndexed = false } = {}) {
  await client.deleteFile(entryPath(date, memberId, postId), sha, { message: `${memberId}의 ${date} 일기 삭제` })
  if (!keepIndexed) await unmarkIndexed(client, date, memberId)
}

export async function listDatesForMember(client, memberId) {
  const { json } = await loadIndex(client)
  return Object.keys(json)
    .filter((date) => (json[date] || []).includes(memberId))
    .sort((a, b) => (a < b ? 1 : -1)) // 최신순
}

export function toggleReaction(entry, emoji, memberId) {
  const current = entry.reactions?.[emoji] || []
  const has = current.includes(memberId)
  const nextList = has ? current.filter((id) => id !== memberId) : [...current, memberId]
  const reactions = { ...entry.reactions, [emoji]: nextList }
  if (nextList.length === 0) delete reactions[emoji]
  return { ...entry, reactions }
}

export function withNewComment(entry, comment) {
  return { ...entry, comments: [...(entry.comments || []), comment] }
}

export function withEditedComment(entry, commentId, text) {
  return {
    ...entry,
    comments: (entry.comments || []).map((c) => (
      c.id === commentId ? { ...c, text, editedAt: new Date().toISOString() } : c
    )),
  }
}

export function withoutComment(entry, commentId) {
  return {
    ...entry,
    comments: (entry.comments || []).filter((c) => c.id !== commentId),
  }
}

export function makeCommentId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID()
  return `c-${Date.now()}-${Math.random().toString(16).slice(2)}`
}
