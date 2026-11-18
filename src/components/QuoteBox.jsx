import React from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useApp } from '../context/AppContext.jsx'
import { formatClock } from '../lib/format.js'
import { memberThemeStyle } from '../lib/theme.js'
import Avatar from './Avatar.jsx'
import RemoteImage from './RemoteImage.jsx'

// 글 속의 글: 인용한 일기/댓글을 축약해서 네모 상자로 보여줘요.
// 누르면 원래 일기/댓글로 이동해요. onRemove가 있으면(작성 중) 오른쪽 위에 ✕ 버튼이 생겨요.
export default function QuoteBox({ quote, onRemove }) {
  const auth = useAuth()
  const app = useApp()
  const author = auth.members.find((m) => m.id === quote.author)
  const [, m, d] = (quote.date || '').split('-')

  function open() {
    if (onRemove) return // 작성 중에는 이동하지 않아요 (쓰던 글이 사라지지 않도록)
    app.goTo({
      date: quote.date, memberId: quote.memberId, postId: quote.postId,
      ...(quote.type === 'comment' ? { commentId: quote.commentId } : {}),
    })
  }

  return (
    <div
      className={`quote-box member-theme ${onRemove ? 'editing' : ''}`}
      style={memberThemeStyle(author)}
      role={onRemove ? undefined : 'button'}
      tabIndex={onRemove ? undefined : 0}
      onClick={open}
      onKeyDown={(e) => { if (!onRemove && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); open() } }}
      title={onRemove ? undefined : '원래 글로 이동'}
    >
      <div className="quote-box-main">
        <div className="quote-box-head">
          {author && <Avatar member={author} size={18} />}
          <span className="quote-box-name">{author?.displayName || quote.author}</span>
          <span className="quote-box-meta">
            {m && `${Number(m)}.${Number(d)}`} {formatClock(quote.createdAt)}
            {quote.type === 'comment' ? ' · 댓글' : ''}
          </span>
        </div>
        <p className="quote-box-text">{quote.text || (quote.image ? '(사진)' : '(내용 없음)')}</p>
      </div>
      {quote.image && <RemoteImage path={quote.image} className="quote-box-thumb" />}
      {onRemove && (
        <button
          type="button" className="quote-box-remove"
          onClick={(e) => { e.stopPropagation(); onRemove() }} aria-label="인용 빼기"
        >✕</button>
      )}
    </div>
  )
}
