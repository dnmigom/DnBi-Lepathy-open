import { useEffect, useState } from 'react'

// 화면 폭이 640px 이하면 모바일 화면으로 봐요 (CSS의 모바일 기준과 같아요)
const QUERY = '(max-width: 640px)'

export function useIsMobile() {
  const [mobile, setMobile] = useState(() => {
    try { return window.matchMedia(QUERY).matches } catch (_) { return false }
  })
  useEffect(() => {
    let mq
    try { mq = window.matchMedia(QUERY) } catch (_) { return undefined }
    const onChange = () => setMobile(mq.matches)
    mq.addEventListener?.('change', onChange)
    return () => mq.removeEventListener?.('change', onChange)
  }, [])
  return mobile
}
