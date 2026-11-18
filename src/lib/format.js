const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

/** '2026-11-07' → '2026년 11월 7일 (토)' */
export function formatDateHeading(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const weekday = WEEKDAYS[new Date(y, m - 1, d).getDay()]
  return `${y}년 ${m}월 ${d}일 (${weekday})`
}

/** ISO 시각 → 'HH:MM' */
export function formatClock(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** 알림 등에서 특정 댓글로 스크롤하기 위한 DOM id (댓글 id는 전체에서 겹치지 않아요) */
export function commentDomId(commentId) {
  return `comment-${commentId}`
}

/** 'n분 전', 'n시간 전', 'n일 전' */
export function timeAgo(iso) {
  const t = Date.parse(iso || '')
  if (!Number.isFinite(t)) return ''
  const min = Math.floor((Date.now() - t) / 60000)
  if (min < 1) return '방금'
  if (min < 60) return `${min}분 전`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}시간 전`
  return `${Math.floor(h / 24)}일 전`
}

/** 검색 결과 등에서 특정 글로 스크롤하기 위한 DOM id */
export function postDomId(date, memberId, postId) {
  return `post-${date}-${memberId}-${postId}`
}
