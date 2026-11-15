import React, { useCallback, useEffect, useState } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'
import Setup from './components/Setup.jsx'
import Layout from './components/Layout.jsx'
import CalendarPage from './components/CalendarPage.jsx'
import UserFeedView from './components/UserFeedView.jsx'
import SettingsModal from './components/SettingsModal.jsx'
import SearchModal from './components/SearchModal.jsx'
import { todayStr } from './lib/dataModel.js'
import { postDomId } from './lib/format.js'
import { DEFAULT_BG_GRADIENT } from './lib/theme.js'
import './app.css'

function Shell() {
  const auth = useAuth()
  const [activeMemberId, setActiveMemberId] = useState(null) // null = 캘린더 보기
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [homeDate, setHomeDate] = useState(todayStr()) // 모두의 일기 달력에서 고른 날짜
  const [feedDate, setFeedDate] = useState(null) // 모아보기 달력에서 고른 날짜 (null = 전체)

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
    }
  }, [activeMemberId, auth.members])

  const closeSearch = useCallback(() => setSearchOpen(false), [])

  // 메뉴에서 사람을 바꾸면 모아보기는 '전체'부터 보여줘요.
  const selectMember = useCallback((id) => {
    setActiveMemberId(id)
    setFeedDate(null)
  }, [])

  // 검색 결과를 누르면: 그 날짜로 이동 → 해당 글이 화면에 나타나면 스크롤하고 잠깐 강조해요.
  const handlePick = useCallback(({ date, memberId, postId }) => {
    if (activeMemberId) setFeedDate(date)
    else setHomeDate(date)
    const id = postDomId(date, memberId, postId)
    let tries = 0
    const timer = setInterval(() => {
      const el = document.getElementById(id)
      if (el || ++tries > 40) clearInterval(timer)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        el.classList.add('flash')
        setTimeout(() => el.classList.remove('flash'), 1800)
      }
    }, 150)
  }, [activeMemberId])

  const ready = auth.status === 'ready' && auth.currentMember

  if (!ready) return <Setup />

  return (
    <Layout
      activeMemberId={activeMemberId}
      onSelectMember={selectMember}
      onOpenSettings={() => setSettingsOpen(true)}
      onOpenSearch={() => setSearchOpen(true)}
    >
      {activeMemberId
        ? <UserFeedView memberId={activeMemberId} selectedDate={feedDate} onSelectDate={setFeedDate} />
        : <CalendarPage selectedDate={homeDate} onSelectDate={setHomeDate} />}
      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
      {searchOpen && (
        <SearchModal scopeMemberId={activeMemberId} onPick={handlePick} onClose={closeSearch} />
      )}
    </Layout>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  )
}
