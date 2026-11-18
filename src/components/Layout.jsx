import React, { useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { SITE_TITLE } from '../config.js'
import Avatar from './Avatar.jsx'
import Icon from './Icon.jsx'
import NotificationBell from './NotificationBell.jsx'

// 화면 구성: 맨 위 가운데에 제목(누르면 모두의 달력으로), 오른쪽 위에 [검색 · 알림 · 유저] 버튼.
// 유저 버튼을 누르면 아래로 동그란 아이콘 메뉴가 펼쳐져요.
export default function Layout({ view, onGoHome, onOpenView, onOpenSettings, onOpenSearch, children }) {
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
        <button className="logo" onClick={onGoHome} title={`${SITE_TITLE} (모두의 달력)`}>
          {SITE_TITLE}
        </button>
        <div className="topbar-actions">
          <button className="round-btn" onClick={onOpenSearch} title="검색" aria-label="검색">
            <Icon name="search" />
          </button>
          <NotificationBell />
          <UserMenu view={view} onOpenView={onOpenView} onOpenSettings={onOpenSettings} />
        </div>
      </header>

      <main className="main-area">{children}</main>
    </div>
  )
}

// 유저 버튼(내 프로필 사진) → 동그란 아이콘들이 세로로 펼쳐져요.
// 메뉴 순서를 바꾸고 싶으면 아래 items 배열의 순서만 바꾸면 돼요.
function UserMenu({ view, onOpenView, onOpenSettings }) {
  const auth = useAuth()
  const me = auth.currentMember
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const outside = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false) }
    const key = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', outside)
    document.addEventListener('touchstart', outside)
    document.addEventListener('keydown', key)
    return () => {
      document.removeEventListener('mousedown', outside)
      document.removeEventListener('touchstart', outside)
      document.removeEventListener('keydown', key)
    }
  }, [open])

  const items = [
    { key: 'feed', icon: 'home', label: `${me?.displayName || ''}레파시 모아보기`, run: () => onOpenView('feed') },
    { key: 'gallery', icon: 'gallery', label: '갤러리 모아보기', run: () => onOpenView('gallery') },
    { key: 'bookmarks', icon: 'bookmarks', label: '북마크 모아보기', run: () => onOpenView('bookmarks') },
    { key: 'tags', icon: 'tags', label: '태그 모아보기', run: () => onOpenView('tags') },
    { key: 'settings', icon: 'settings', label: '설정', run: onOpenSettings },
    { key: 'logout', icon: 'logout', label: '로그아웃', run: auth.logout },
  ]

  return (
    <div className="user-menu" ref={wrapRef}>
      <button
        className={`round-btn user-menu-trigger ${open ? 'open' : ''}`}
        style={{ '--author-color': me?.color }}
        onClick={() => setOpen((v) => !v)}
        title={`${me?.displayName || ''} 메뉴`}
        aria-label="유저 메뉴"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Avatar member={me} size={34} />
      </button>

      {open && (
        <div className="user-menu-icons" role="menu">
          {items.map((it, i) => (
            <button
              key={it.key}
              role="menuitem"
              className={`round-btn user-menu-item ${view === it.key ? 'active' : ''}`}
              style={{ animationDelay: `${i * 25}ms` }}
              onClick={() => { setOpen(false); it.run() }}
              title={it.label}
              aria-label={it.label}
            >
              <Icon name={it.icon} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
