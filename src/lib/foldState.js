import { useCallback, useState } from 'react'

// 글 본문/댓글을 접었는지 펼쳤는지를 이 브라우저(localStorage)에 기억해요.
// 글마다, 댓글칸마다 따로 저장돼서 다음에 들어와도 마지막 상태 그대로 보여요.
const PREFIX = 'exchange-diary:fold:'

function read(key, fallback) {
  try {
    const v = window.localStorage.getItem(PREFIX + key)
    if (v === '1') return true
    if (v === '0') return false
  } catch (_) { /* 저장소를 못 쓰는 환경이면 기본값 */ }
  return fallback
}

function write(key, value) {
  try {
    window.localStorage.setItem(PREFIX + key, value ? '1' : '0')
  } catch (_) { /* 무시 */ }
}

/** [열림 여부, 토글 함수] */
export function useFoldState(key, defaultOpen) {
  const [open, setOpen] = useState(() => read(key, defaultOpen))
  const toggle = useCallback(() => {
    setOpen((prev) => {
      const next = !prev
      write(key, next)
      return next
    })
  }, [key])
  return [open, toggle]
}

/** 글을 지우면 그 글의 접기 기록도 같이 정리 */
export function clearFoldState(keyPrefix) {
  try {
    ;['body', 'comments'].forEach((part) => window.localStorage.removeItem(`${PREFIX}${keyPrefix}:${part}`))
  } catch (_) { /* 무시 */ }
}
