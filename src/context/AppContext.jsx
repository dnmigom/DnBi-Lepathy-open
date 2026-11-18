import { createContext, useContext } from 'react'

// 화면 여기저기서 같이 쓰는 기능들:
//   goTo(target)          특정 글/댓글로 이동 (해당 날짜를 열고, 스크롤해서 잠깐 강조)
//   focus / clearFocus    이동 요청 (EntryCard가 받아서 처리)
//   bookmarks, isBookmarked(key), toggleBookmark(snapshot)
//   quoteDraft, addQuote(snapshot), removeQuote(key), clearQuotes()
//   notifSeenAt, markNotifSeen()
export const AppContext = createContext(null)

export function useApp() {
  return useContext(AppContext)
}
