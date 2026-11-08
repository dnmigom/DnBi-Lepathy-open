import React, { useEffect, useState } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'
import Setup from './components/Setup.jsx'
import Layout from './components/Layout.jsx'
import CalendarPage from './components/CalendarPage.jsx'
import UserFeedView from './components/UserFeedView.jsx'
import SettingsModal from './components/SettingsModal.jsx'
import './app.css'

const DEFAULT_BG_GRADIENT = 'linear-gradient(165deg, #fdf1f3 0%, #fbeef1 45%, #f7e9ee 100%)'

function Shell() {
  const auth = useAuth()
  const [activeMemberId, setActiveMemberId] = useState(null) // null = 캘린더 보기
  const [settingsOpen, setSettingsOpen] = useState(false)

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

  const ready = auth.status === 'ready' && auth.currentMember

  if (!ready) return <Setup />

  return (
    <Layout activeMemberId={activeMemberId} onSelectMember={setActiveMemberId} onOpenSettings={() => setSettingsOpen(true)}>
      {activeMemberId ? <UserFeedView memberId={activeMemberId} /> : <CalendarPage />}
      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
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
