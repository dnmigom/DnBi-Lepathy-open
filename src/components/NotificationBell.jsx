import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useApp } from '../context/AppContext.jsx'
import { loadInbox, NOTIFY_KEEP_DAYS } from '../lib/inbox.js'
import { timeAgo } from '../lib/format.js'
import { findReaction } from '../lib/reactions.js'
import { NOTIFY_DOT_COLOR } from '../icons.js'
import { DIARY_WORD } from '../config.js'
import Avatar from './Avatar.jsx'
import Icon from './Icon.jsx'

const POLL_MS = 60 * 1000 // 1분마다 새 알림 확인 (창을 보고 있을 때만)

// 알림창 안의 필터
const FILTERS = [
  { key: 'all', label: '전체' },
  { key: 'comment', label: '댓글' },
  { key: 'quote', label: '인용' },
  { key: 'reaction', label: '반응' },
]
const typeOf = (it) => it.type || 'comment' // 예전 알림은 type이 없어서 댓글로 봐요

// 받침이 있으면 '을', 없으면 '를' (텔레파시를 / 댓글을)
function withEulReul(word) {
  const code = word.charCodeAt(word.length - 1) - 0xac00
  const hasBatchim = code >= 0 && code <= 11171 && code % 28 !== 0
  return `${word}${hasBatchim ? '을' : '를'}`
}

// 종 버튼: 새 댓글 알림이 있으면 오른쪽 위에 작은 동그라미가 떠요.
// 누르면 최근 3일 치 댓글 알림이 드롭다운으로 펼쳐지고, 누르면 그 댓글로 이동해요.
export default function NotificationBell() {
  const auth = useAuth()
  const app = useApp()
  const me = auth.currentMember?.id
  const [items, setItems] = useState([])
  const [open, setOpen] = useState(false)
  const [seenBeforeOpen, setSeenBeforeOpen] = useState(null) // 열기 직전의 '읽은 시각' (새 알림 강조용)
  const [filter, setFilter] = useState('all')
  const wrapRef = useRef(null)

  const refresh = useCallback(async () => {
    if (!me) return
    try { setItems(await loadInbox(auth.client, me)) } catch (_) { /* 다음에 다시 */ }
  }, [auth.client, me])

  useEffect(() => {
    refresh()
    const timer = setInterval(() => { if (document.visibilityState === 'visible') refresh() }, POLL_MS)
    const onFocus = () => refresh()
    window.addEventListener('focus', onFocus)
    return () => { clearInterval(timer); window.removeEventListener('focus', onFocus) }
  }, [refresh])

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

  const seenAt = app?.notifSeenAt || ''
  const newCount = items.filter((it) => it.createdAt > seenAt).length
  const hasNew = newCount > 0

  function toggle() {
    if (!open) {
      setSeenBeforeOpen(seenAt)
      refresh()
      if (hasNew) app.markNotifSeen()
    }
    setOpen((v) => !v)
  }

  function pick(it) {
    setOpen(false)
    app.goTo({
      date: it.date, memberId: it.memberId, postId: it.postId,
      ...(typeOf(it) === 'comment' ? { commentId: it.commentId } : {}),
    })
  }

  // 알림 한 줄의 문장
  function sentence(it) {
    const owner = auth.members.find((m) => m.id === it.memberId)
    const t = typeOf(it)
    if (t === 'quote') return `님이 내 ${withEulReul(it.quotedType === 'comment' ? '댓글' : DIARY_WORD)} 인용했어요`
    if (t === 'reaction') {
      const r = findReaction(auth.config, it.reaction)
      return (
        <>
          님이 내 {DIARY_WORD}에{' '}
          {r.type === 'image' ? <img src={r.value} alt={r.label} className="notif-reaction-img" /> : r.value}
          {' '}반응을 남겼어요
        </>
      )
    }
    if (it.kind === 'my-post') return `님이 내 ${DIARY_WORD}에 댓글을 남겼어요`
    // 글쓴이가 자기 글에 댓글을 단 경우 ('비비님이 비비님의 …'처럼 어색하지 않게)
    if (it.from === it.memberId) return `님이 내가 댓글 단 ${DIARY_WORD}에 댓글을 남겼어요`
    return `님이 ${owner?.displayName || it.memberId}님의 ${DIARY_WORD}에 댓글을 남겼어요`
  }

  const shown = filter === 'all' ? items : items.filter((it) => typeOf(it) === filter)
  const newBy = (key) => items.filter((it) => it.createdAt > (seenBeforeOpen || '') && (key === 'all' || typeOf(it) === key)).length

  return (
    <div className="member-menu notif-menu" ref={wrapRef}>
      <button
        className="round-btn notif-trigger"
        onClick={toggle}
        title="알림" aria-label={hasNew ? `알림 (새 알림 ${newCount}개)` : '알림'}
        aria-haspopup="menu" aria-expanded={open}
      >
        <Icon name="bell" />
        {hasNew && (
          <span className="notif-badge" style={{ background: NOTIFY_DOT_COLOR }} aria-hidden="true">
            {newCount > 99 ? '99+' : newCount}
          </span>
        )}
      </button>

      {open && (
        <div className="member-menu-panel notif-panel" role="menu">
          <div className="notif-panel-title">알림 <small>최근 {NOTIFY_KEEP_DAYS}일</small></div>
          <div className="notif-filters" role="tablist">
            {FILTERS.map((f) => {
              const n = newBy(f.key)
              return (
                <button
                  key={f.key} type="button" role="tab" aria-selected={filter === f.key}
                  className={`notif-filter ${filter === f.key ? 'active' : ''}`}
                  onClick={() => setFilter(f.key)}
                >
                  {f.label}{n > 0 && <span className="notif-filter-count">{n}</span>}
                </button>
              )
            })}
          </div>
          {shown.length === 0 && (
            <p className="notif-empty">
              최근 {NOTIFY_KEEP_DAYS}일 동안 {filter === 'all' ? '' : `${FILTERS.find((f) => f.key === filter).label} `}알림이 없어요.
            </p>
          )}
          {shown.map((it) => {
            const from = auth.members.find((m) => m.id === it.from)
            const isNew = it.createdAt > (seenBeforeOpen || '')
            return (
              <button
                key={it.id} role="menuitem" type="button"
                className={`notif-item ${isNew ? 'new' : ''}`}
                onClick={() => pick(it)}
              >
                <Avatar member={from} size={30} />
                <span className="notif-item-body">
                  <span className="notif-item-line">
                    <b style={from?.color ? { color: from.color } : undefined}>{from?.displayName || it.from}</b>
                    {sentence(it)}
                  </span>
                  {it.text && <span className="notif-item-text">{it.text}</span>}
                  <span className="notif-item-time">{timeAgo(it.createdAt)}</span>
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
