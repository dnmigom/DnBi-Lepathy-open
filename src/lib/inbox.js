// 댓글 알림함: inbox/{멤버id}.json  →  { items: [...] }
// 누가 댓글을 달면, 댓글을 단 사람의 브라우저가 받을 사람의 알림함 파일에 한 줄을 추가해요.
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
