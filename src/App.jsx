import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'
import { AppContext } from './context/AppContext.jsx'
import Setup from './components/Setup.jsx'
import Layout from './components/Layout.jsx'
import CalendarPage from './components/CalendarPage.jsx'
import UserFeedView from './components/UserFeedView.jsx'
import BookmarksView from './components/BookmarksView.jsx'
import GalleryView from './components/GalleryView.jsx'
import TagsView from './components/TagsView.jsx'
import SettingsModal from './components/SettingsModal.jsx'
import SearchModal from './components/SearchModal.jsx'
import { todayStr } from './lib/dataModel.js'
import { loadUserState, targetKey, updateUserState } from './lib/userState.js'
import { DEFAULT_BG_GRADIENT } from './lib/theme.js'
import './app.css'

function Shell() {
  const auth = useAuth()
  // view: 'home'(모두의 달력) | 'feed'(텔레파시 모아보기) | 'gallery' | 'bookmarks' | 'tags'
  const [view, setView] = useState('home')
  const [activeMemberId, setActiveMemberId] = useState(null) // view === 'feed'일 때 누구의 글인지
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [homeDate, setHomeDate] = useState(todayStr()) // 모두의 일기 달력에서 고른 날짜
  const [feedDate, setFeedDate] = useState(null) // 모아보기 달력에서 고른 날짜 (null = 전체)
  const [focus, setFocus] = useState(null) // 이동 요청 { date, memberId, postId, commentId?, n }
  const [userState, setUserState] = useState({ bookmarks: [], notifSeenAt: null })
  const [quoteDraft, setQuoteDraft] = useState([]) // 새 글에 넣을 인용들

  const me = auth.currentMember?.id

  useEffect(() => {
    if (auth.currentMember?.color) {
      document.documentElement.style.setProperty('--accent', auth.currentMember.color)
      document.documentElement.style.setProperty('--accent-soft', `${auth.currentMember.color}22`)
    }
    const bg = auth.currentMember?.bgColor
    document.documentElement.style.setProperty('--bg-gradient', bg || DEFAULT_BG_GRADIENT)
    // 단색 배경이면 버튼 hover·테두리·카드 그라데이션 같은 옅은 색들도 이 색을 따라가요.
    if (bg && bg.startsWith('#')) document.documentElement.style.setProperty('--bg-solid', bg)
    else document.documentElement.style.removeProperty('--bg-solid')
  }, [auth.currentMember?.color, auth.currentMember?.bgColor])

  // 멤버가 삭제되는 등으로 더 이상 존재하지 않으면 캘린더 보기로 되돌립니다.
  useEffect(() => {
    if (activeMemberId && !auth.members.some((m) => m.id === activeMemberId)) {
      setActiveMemberId(null)
      setView('home')
    }
  }, [activeMemberId, auth.members])

  // 내 개인 상태(북마크, 알림 읽은 시각) 불러오기
  useEffect(() => {
    if (!me || auth.status !== 'ready') return
    let cancelled = false
    loadUserState(auth.client, me).then((s) => { if (!cancelled) setUserState(s) }).catch(() => {})
    return () => { cancelled = true }
  }, [me, auth.status, auth.client])

  const closeSearch = useCallback(() => setSearchOpen(false), [])

  // 메뉴에서 사람을 고르면 모아보기('전체'부터), null이면 모두의 달력
  const selectMember = useCallback((id) => {
    setActiveMemberId(id)
    setFeedDate(null)
    setView(id ? 'feed' : 'home')
  }, [])

  // 특정 글/댓글로 이동. 지금 그 사람의 모아보기 중이면 모아보기 안에서, 아니면 모두의 달력에서 열어요.
  const goTo = useCallback((target) => {
    if (view === 'feed' && activeMemberId === target.memberId) {
      setFeedDate(target.date)
    } else {
      setView('home')
      setActiveMemberId(null)
      setHomeDate(target.date)
    }
    setFocus({ ...target, n: Date.now() })
  }, [view, activeMemberId])

  const clearFocus = useCallback(() => setFocus(null), [])

  // ── 북마크 ──
  const bookmarkKeys = useMemo(() => new Set((userState.bookmarks || []).map((b) => b.key)), [userState.bookmarks])

  const toggleBookmark = useCallback((snapshot) => {
    const key = targetKey(snapshot)
    const apply = (state) => {
      const list = state.bookmarks || []
      const exists = list.some((b) => b.key === key)
      return {
        ...state,
        bookmarks: exists
          ? list.filter((b) => b.key !== key)
          : [{ ...snapshot, key, savedAt: new Date().toISOString() }, ...list],
      }
    }
    setUserState(apply) // 화면에는 바로 반영
    updateUserState(auth.client, me, apply)
      .then((saved) => saved && setUserState(saved))
      .catch(() => window.alert('북마크를 저장하지 못했어요. 잠시 후 다시 시도해 주세요.'))
  }, [auth.client, me])

  const markNotifSeen = useCallback(() => {
    const now = new Date().toISOString()
    setUserState((s) => ({ ...s, notifSeenAt: now }))
    updateUserState(auth.client, me, (s) => ({ ...s, notifSeenAt: now })).catch(() => {})
  }, [auth.client, me])

  // ── 인용: 고르면 오늘 날짜의 새 글 작성칸으로 이동해요 ──
  const addQuote = useCallback((snapshot) => {
    const key = targetKey(snapshot)
    setQuoteDraft((prev) => (prev.some((q) => q.key === key) ? prev : [...prev, { ...snapshot, key }]))
    setView('home')
    setActiveMemberId(null)
    setHomeDate(todayStr())
  }, [])
  const removeQuote = useCallback((key) => setQuoteDraft((prev) => prev.filter((q) => q.key !== key)), [])
  const clearQuotes = useCallback(() => setQuoteDraft([]), [])

  const appValue = useMemo(() => ({
    goTo,
    focus,
    clearFocus,
    bookmarks: userState.bookmarks || [],
    isBookmarked: (key) => bookmarkKeys.has(key),
    toggleBookmark,
    notifSeenAt: userState.notifSeenAt,
    markNotifSeen,
    quoteDraft,
    addQuote,
    removeQuote,
    clearQuotes,
  }), [goTo, focus, clearFocus, userState, bookmarkKeys, toggleBookmark, markNotifSeen, quoteDraft, addQuote, removeQuote, clearQuotes])

  const ready = auth.status === 'ready' && auth.currentMember

  if (!ready) return <Setup />

  let content
  if (view === 'feed' && activeMemberId) {
    content = (
      <UserFeedView
        memberId={activeMemberId} selectedDate={feedDate} onSelectDate={setFeedDate} onSelectMember={selectMember}
      />
    )
  } else if (view === 'bookmarks') {
    content = <BookmarksView />
  } else if (view === 'gallery') {
    content = <GalleryView />
  } else if (view === 'tags') {
    content = <TagsView />
  } else {
    content = <CalendarPage selectedDate={homeDate} onSelectDate={setHomeDate} />
  }

  return (
    <AppContext.Provider value={appValue}>
      <Layout
        view={view}
        onGoHome={() => selectMember(null)}
        onOpenView={(v) => {
          // '(이름)레파시 모아보기'는 내 글부터 보여주고, 달력 아래 버튼으로 다른 사람으로 바꿀 수 있어요.
          if (v === 'feed') { selectMember(me); return }
          setView(v)
          setActiveMemberId(null)
        }}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenSearch={() => setSearchOpen(true)}
      >
        {content}
        {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
        {searchOpen && (
          <SearchModal
            scopeMemberId={view === 'feed' ? activeMemberId : null}
            onPick={goTo}
            onClose={closeSearch}
          />
        )}
      </Layout>
    </AppContext.Provider>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  )
}
