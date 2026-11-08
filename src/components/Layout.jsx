import React, { useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { SITE_TITLE } from '../config.js'
import Avatar from './Avatar.jsx'
import Icon from './Icon.jsx'

// 화면 구성: 맨 위 가운데에 제목, 오른쪽 위에 [모아보기 선택 · 설정 · 로그아웃] 버튼.
export default function Layout({ activeMemberId, onSelectMember, onOpenSettings, children }) {
  const auth = useAuth()

  return (
    <div className="app-shell">
      {auth.repoPublic && (
        <div className="security-banner" role="alert">
          ⚠️ 데이터 레포가 <b>공개(Public)</b> 상태예요. 일기와 사진을 누구나 볼 수 있어요.
          GitHub 레포 Settings → General → 맨 아래 Change visibility에서 Private으로 바꿔주세요.
        </div>
      )}

      <header className="topbar">
        <div className="topbar-spacer" aria-hidden="true" />
        <button className="logo" onClick={() => onSelectMember(null)} title="캘린더로 돌아가기">
          {SITE_TITLE}
        </button>
        <div className="topbar-actions">
          <MemberMenu activeMemberId={activeMemberId} onSelectMember={onSelectMember} />
          <button className="round-btn" onClick={onOpenSettings} title="설정" aria-label="설정">
            <Icon name="settings" />
          </button>
          <button className="round-btn" onClick={auth.logout} title="로그아웃" aria-label="로그아웃">
            <Icon name="logout" />
          </button>
        </div>
      </header>

      <main className="main-area">{children}</main>
    </div>
  )
}

// 동그란 버튼을 누르면 '홈(캘린더)'과 멤버 목록이 아래로 펼쳐져요.
function MemberMenu({ activeMemberId, onSelectMember }) {
  const auth = useAuth()
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)
  const active = auth.members.find((m) => m.id === activeMemberId)

  useEffect(() => {
    if (!open) return undefined
    function handleOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    function handleKey(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    document.addEventListener('touchstart', handleOutside)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      document.removeEventListener('touchstart', handleOutside)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  function pick(id) {
    onSelectMember(id)
    setOpen(false)
  }

  return (
    <div className="member-menu" ref={wrapRef}>
      <button
        className={`round-btn member-menu-trigger ${active ? 'has-member' : ''}`}
        style={active ? { '--author-color': active.color } : undefined}
        onClick={() => setOpen((v) => !v)}
        title={active ? `${active.displayName}의 글 모아보는 중` : '모아볼 사람 고르기'}
        aria-label="모아볼 사람 고르기"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {active ? <Avatar member={active} size={34} /> : <HomeIcon />}
      </button>

      {open && (
        <div className="member-menu-panel" role="menu">
          <button
            role="menuitem"
            className={`member-nav-item ${activeMemberId === null ? 'active' : ''}`}
            onClick={() => pick(null)}
          >
            <span className="home-nav-icon" aria-hidden="true"><HomeIcon /></span>
            <span className="member-nav-name">홈 (캘린더)</span>
          </button>
          {auth.members.map((m) => (
            <button
              role="menuitem"
              key={m.id}
              className={`member-nav-item ${activeMemberId === m.id ? 'active' : ''}`}
              style={{ '--author-color': m.color }}
              onClick={() => pick(m.id)}
              title={`${m.displayName}의 글 모아보기`}
            >
              <Avatar member={m} size={30} />
              <span className="member-nav-name">{m.displayName}</span>
              {m.id === auth.currentMember?.id && <span className="me-badge">나</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function HomeIcon() {
  return (
    <svg className="home-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d="M4 10.8 12 4l8 6.8V19a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1v-8.2Z"
        stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round"
      />
    </svg>
  )
}
