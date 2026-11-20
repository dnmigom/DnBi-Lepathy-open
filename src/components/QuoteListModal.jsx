import React, { useEffect } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { formatClock, formatDateHeading } from '../lib/format.js'
import { DIARY_WORD } from '../config.js'
import Avatar from './Avatar.jsx'

// 내 글을 인용한 글 목록 (검색 결과처럼, 지금 화면 위에 떠요)
export default function QuoteListModal({ refs, onPick, onClose }) {
  const auth = useAuth()
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const list = [...refs].sort((a, b) => ((a.createdAt || a.date) < (b.createdAt || b.date) ? 1 : -1))

  return (
    <div className="modal-overlay search-overlay" onClick={onClose}>
      <div className="modal card search-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="인용한 글">
        <div className="quote-list-head">
          <b>이 {DIARY_WORD}를 인용한 글</b>
          <span className="search-status">{list.length}개</span>
          <button className="btn btn-ghost btn-small" onClick={onClose} aria-label="닫기">✕</button>
        </div>
        <ul className="search-results">
          {list.map((r) => {
            const from = auth.members.find((m) => m.id === r.from || m.id === r.memberId)
            return (
              <li key={`${r.date}:${r.memberId}:${r.postId}`}>
                <button
                  type="button" className="search-result"
                  style={{ '--author-color': from?.color || 'var(--accent)' }}
                  onClick={() => { onPick({ date: r.date, memberId: r.memberId, postId: r.postId }); onClose() }}
                >
                  <div className="search-result-head">
                    {from && <Avatar member={from} size={22} />}
                    <span className="search-result-name">{from?.displayName || r.memberId}</span>
                    <span className="search-result-date">{formatDateHeading(r.date)} {formatClock(r.createdAt)}</span>
                  </div>
                  <p className="search-result-snippet">{r.text || '(글 없이 인용만 남겼어요)'}</p>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
