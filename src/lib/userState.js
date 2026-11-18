// 사람마다 따로 갖는 개인 상태: users/{멤버id}.json
//   { bookmarks: [...], notifSeenAt: ISO 시각 }
// 화면에서는 자기 파일만 읽고 써요. (북마크는 나만 보여요)
import { enqueue, updateJsonFile } from './jsonStore.js'

export function userStatePath(memberId) {
  return `users/${memberId}.json`
}

export function emptyUserState() {
  return { bookmarks: [], notifSeenAt: null }
}

export async function loadUserState(client, memberId) {
  const res = await client.getJson(userStatePath(memberId), { fresh: true })
  return { ...emptyUserState(), ...(res?.json || {}) }
}

/** mutate(현재 상태) → 새 상태. 내 쓰기는 한 줄로 세워서 순서대로 저장돼요. */
export function updateUserState(client, memberId, mutate) {
  return enqueue(`user:${memberId}`, () => updateJsonFile(
    client,
    userStatePath(memberId),
    (cur) => mutate({ ...emptyUserState(), ...cur }),
    { fallback: emptyUserState, message: `개인 설정 (${memberId})` },
  ))
}

// ── 북마크 / 인용 대상 ──
// target: { type: 'post' | 'comment', date, memberId(글쓴이), postId, commentId? }
export function targetKey(t) {
  return t.type === 'comment'
    ? `c:${t.date}:${t.memberId}:${t.postId}:${t.commentId}`
    : `p:${t.date}:${t.memberId}:${t.postId}`
}

/** 북마크·인용에 함께 저장해 두는 요약 (원문이 지워져도 무엇이었는지 알 수 있게) */
export function makeSnapshot({ type, date, memberId, postId, entry, comment }) {
  const source = type === 'comment' ? comment : entry
  const images = type === 'comment' ? (comment?.image ? [comment.image] : []) : (entry?.images || [])
  return {
    type,
    date,
    memberId,
    postId,
    ...(type === 'comment' ? { commentId: comment.id } : {}),
    author: type === 'comment' ? comment.author : memberId,
    text: (source?.content ?? source?.text ?? '').slice(0, 200),
    image: images[0] || null,
    createdAt: source?.createdAt || null,
  }
}
