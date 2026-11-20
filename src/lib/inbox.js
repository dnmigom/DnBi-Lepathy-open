// 알림함: inbox/{멤버id}.json  →  { items: [...] }
// 누가 댓글·인용·반응을 남기면, 남긴 사람의 브라우저가 받을 사람의 알림함 파일에 한 줄을 추가해요.
// item.type: 'comment'(예전 알림은 type이 없으면 댓글) | 'quote' | 'reaction'
import { enqueue, updateJsonFile } from './jsonStore.js'

export const NOTIFY_KEEP_DAYS = 3 // 알림창에는 최근 3일 치만 보여요 (그보다 오래된 건 저장할 때 정리)
const KEEP_MS = NOTIFY_KEEP_DAYS * 24 * 60 * 60 * 1000

export function inboxPath(memberId) {
  return `inbox/${memberId}.json`
}

export function isFresh(item, now = Date.now()) {
  const t = Date.parse(item?.createdAt || '')
  return Number.isFinite(t) && now - t < KEEP_MS
}

export async function loadInbox(client, memberId) {
  const res = await client.getJson(inboxPath(memberId), { fresh: true })
  const items = Array.isArray(res?.json?.items) ? res.json.items : []
  return items.filter((it) => isFresh(it)).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
}

/**
 * 댓글이 달렸을 때 알림 보내기.
 * 받는 사람: 글쓴이 + 그 글에 댓글을 단 적 있는 사람들 (나 자신은 제외)
 */
export function notifyComment(client, { me, date, postAuthor, postId, comment, existingComments }) {
  const recipients = new Set([postAuthor, ...(existingComments || []).map((c) => c.author)])
  recipients.delete(me)
  const text = (comment.text || '').slice(0, 120) || (comment.image ? '(사진)' : '')
  return Promise.allSettled([...recipients].map((to) => enqueue(`inbox:${to}`, () => updateJsonFile(
    client,
    inboxPath(to),
    (cur) => {
      const items = (Array.isArray(cur.items) ? cur.items : []).filter((it) => isFresh(it))
      if (items.some((it) => it.commentId === comment.id)) return undefined
      items.push({
        id: comment.id,
        type: 'comment',
        kind: to === postAuthor ? 'my-post' : 'thread', // 내 글에 달린 댓글 / 내가 댓글 단 글에 달린 댓글
        from: me,
        date,
        memberId: postAuthor,
        postId,
        commentId: comment.id,
        text,
        createdAt: comment.createdAt,
      })
      return { items }
    },
    { fallback: () => ({ items: [] }), message: `알림 (${to})` },
  ))))
}

/** 댓글을 지우면 그 댓글 알림도 지워요 (알림함에 있는 경우에만 저장) */
export function unnotifyComment(client, { members, me, commentId }) {
  return Promise.allSettled(members.filter((m) => m.id !== me).map((m) => enqueue(`inbox:${m.id}`, () => updateJsonFile(
    client,
    inboxPath(m.id),
    (cur) => {
      const items = Array.isArray(cur.items) ? cur.items : []
      if (!items.some((it) => it.commentId === commentId)) return undefined
      return { items: items.filter((it) => it.commentId !== commentId && isFresh(it)) }
    },
    { fallback: () => ({ items: [] }), message: `알림 정리 (${m.id})` },
  ))))
}


// ── 공용: 한 사람의 알림함에 넣기 / 빼기 ──
function pushInbox(client, to, item) {
  return enqueue(`inbox:${to}`, () => updateJsonFile(
    client,
    inboxPath(to),
    (cur) => {
      const items = (Array.isArray(cur.items) ? cur.items : []).filter((it) => isFresh(it))
      if (items.some((it) => it.id === item.id)) return undefined
      items.push(item)
      return { items }
    },
    { fallback: () => ({ items: [] }), message: `알림 (${to})` },
  ))
}

function removeFromInbox(client, to, id) {
  return enqueue(`inbox:${to}`, () => updateJsonFile(
    client,
    inboxPath(to),
    (cur) => {
      const items = Array.isArray(cur.items) ? cur.items : []
      if (!items.some((it) => it.id === id)) return undefined
      return { items: items.filter((it) => it.id !== id && isFresh(it)) }
    },
    { fallback: () => ({ items: [] }), message: `알림 정리 (${to})` },
  ))
}

/** 반응 알림 id (같은 사람이 같은 반응을 다시 누르면 같은 알림) */
function reactionId(date, postAuthor, postId, from, key) {
  return `r:${date}:${postAuthor}:${postId}:${from}:${key}`
}

/** 내 글이 아닌 글에 반응을 남기면 글쓴이에게 알림. 반응을 취소하면 알림도 지워요. */
export function notifyReaction(client, { me, date, postAuthor, postId, reactionKey, added, postText }) {
  if (postAuthor === me) return Promise.resolve()
  const id = reactionId(date, postAuthor, postId, me, reactionKey)
  if (!added) return removeFromInbox(client, postAuthor, id).catch(() => {})
  return pushInbox(client, postAuthor, {
    id, type: 'reaction', from: me, date, memberId: postAuthor, postId,
    reaction: reactionKey, text: (postText || '').slice(0, 80), createdAt: new Date().toISOString(),
  }).catch(() => {})
}

/** 새 글에서 다른 사람의 글/댓글을 인용하면 원래 쓴 사람에게 알림 (누르면 인용한 새 글로 이동) */
export function notifyQuotes(client, { me, date, postId, content, quotes }) {
  const createdAt = new Date().toISOString()
  return Promise.allSettled((quotes || []).filter((q) => q.author && q.author !== me).map((q) => pushInbox(client, q.author, {
    id: `q:${date}:${me}:${postId}:${q.key}`,
    type: 'quote', from: me, date, memberId: me, postId,
    quotedType: q.type, quotedText: (q.text || '').slice(0, 60),
    text: (content || '').slice(0, 100), createdAt,
  })))
}
