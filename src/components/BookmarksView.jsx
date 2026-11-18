import React, { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useApp } from '../context/AppContext.jsx'
import { loadPostsForDates } from '../lib/allPosts.js'
import { formatClock, formatDateHeading } from '../lib/format.js'
import { memberThemeStyle } from '../lib/theme.js'
import { DIARY_WORD } from '../config.js'
import Avatar from './Avatar.jsx'
import Icon from './Icon.jsx'
import RemoteImage from './RemoteImage.jsx'
import Lightbox from './Lightbox.jsx'
import { Highlight } from './SearchModal.jsx'

// 내 북마크만 모아보는 화면. 북마크는 나에게만 보여요.
// 위쪽 검색칸은 북마크한 글/댓글 안에서만 찾아요.
export default function BookmarksView() {
  const auth = useAuth()
  const app = useApp()
  const [posts, setPosts] = useState(null) // 북마크가 가리키는 날짜들의 현재 글
  const [query, setQuery] = useState('')
  const [lightboxPath, setLightboxPath] = useState(null)

  const bookmarks = useMemo(
    () => [...app.bookmarks].sort((a, b) => ((a.savedAt || '') < (b.savedAt || '') ? 1 : -1)),
    [app.bookmarks],
  )
  const datesKey = useMemo(() => [...new Set(bookmarks.map((b) => b.date))].sort().join(','), [bookmarks])

  // 원문을 최신 상태로 보여주려고 북마크한 날짜들의 글을 불러와요.
  useEffect(() => {
    let cancelled = false
    const dates = datesKey ? datesKey.split(',') : []
    loadPostsForDates(auth.client, dates, { isCancelled: () => cancelled })
      .then((list) => { if (!cancelled) setPosts(list) })
    return () => { cancelled = true }
  }, [auth.client, datesKey])

  // 북마크 → 현재 원문 (지워졌으면 저장해 둔 요약으로)
  const items = useMemo(() => bookmarks.map((b) => {
    const post = posts?.find((p) => p.date === b.date && p.memberId === b.memberId && p.postId === b.postId)
    const comment = b.type === 'comment' ? post?.json.comments?.find((c) => c.id === b.commentId) : null
    const live = b.type === 'comment' ? comment : post?.json
    const authorId = b.type === 'comment' ? (comment?.author || b.author) : b.memberId
    return {
      b,
      missing: posts !== null && !live,
      authorId,
      text: live ? (live.content ?? live.text ?? '') : (b.text || ''),
      tags: b.type === 'post' ? (live?.moodTags || []) : [],
      images: live ? (b.type === 'comment' ? (live.image ? [live.image] : []) : (live.images || [])) : (b.image ? [b.image] : []),
      createdAt: live?.createdAt || b.createdAt,
    }
  }), [bookmarks, posts])

  const terms = useMemo(() => query.trim().toLowerCase().split(/\s+/).filter(Boolean), [query])
  const filtered = useMemo(() => {
    if (terms.length === 0) return items
    return items.filter((it) => {
      const name = auth.members.find((m) => m.id === it.authorId)?.displayName || ''
      const hay = [it.text, it.tags.join(' '), name].join('\n').toLowerCase()
      return terms.every((t) => hay.includes(t))
    })
  }, [items, terms, auth.members])

  return (
    <div className="feed-view bookmarks-view">
      <h2 className="detail-heading">내 북마크</h2>

      <div className="search-input-row inline-search">
        <Icon name="search" />
        <input
          type="search" className="search-input" value={query}
          placeholder="북마크 안에서 검색 (본문 · 댓글 · 태그 · 이름)"
          onChange={(e) => setQuery(e.target.value)}
        />
        {query && <button className="btn btn-ghost btn-small" onClick={() => setQuery('')} aria-label="지우기">✕</button>}
      </div>

      <p className="search-status">
        {bookmarks.length === 0
          ? ''
          : terms.length ? `${filtered.length}개 찾음 · 전체 ${bookmarks.length}개` : `전체 ${bookmarks.length}개`}
      </p>

      {bookmarks.length === 0 && (
        <p className="feed-empty">
          아직 북마크가 없어요. {DIARY_WORD}나 댓글의 <Icon name="bookmark" /> 버튼을 눌러 모아보세요.
        </p>
      )}
      {bookmarks.length > 0 && terms.length > 0 && filtered.length === 0 && (
        <p className="feed-empty">북마크 안에서 찾는 글이 없어요.</p>
      )}

      <div className="feed-list">
        {filtered.map((it) => {
          const { b } = it
          const author = auth.members.find((m) => m.id === it.authorId)
          const owner = auth.members.find((m) => m.id === b.memberId)
          const target = { date: b.date, memberId: b.memberId, postId: b.postId, ...(b.type === 'comment' ? { commentId: b.commentId } : {}) }
          return (
            <article key={b.key} className="card bookmark-card member-theme" style={memberThemeStyle(author)}>
              <header className="bookmark-head">
                <Avatar member={author} size={30} />
                <div className="bookmark-who">
                  <span className="entry-card-name">{author?.displayName || it.authorId}</span>
                  <span className="bookmark-meta">
                    {formatDateHeading(b.date)} {formatClock(it.createdAt)}
                    {' · '}
                    {b.type === 'comment'
                      ? `${owner?.displayName || b.memberId}님의 ${DIARY_WORD}에 남긴 댓글`
                      : DIARY_WORD}
                  </span>
                </div>
                <button
                  className="btn btn-ghost btn-small icon-btn is-on"
                  onClick={() => app.toggleBookmark(b)} title="북마크 해제" aria-label="북마크 해제"
                >
                  <Icon name="bookmarked" />
                </button>
              </header>

              {it.missing && <p className="bookmark-missing">원본이 삭제됐어요. 저장해 둔 내용만 보여요.</p>}
              {it.tags.length > 0 && (
                <div className="entry-mood-tags">
                  {it.tags.map((t) => <span key={t} className="entry-mood-tag"><Highlight text={t} terms={terms} /></span>)}
                </div>
              )}
              {it.text && <p className="entry-content bookmark-text"><Highlight text={it.text} terms={terms} /></p>}
              {it.images.length > 0 && (
                <div className="bookmark-images">
                  {it.images.map((path) => (
                    <button key={path} type="button" className="entry-image-btn" onClick={() => setLightboxPath(path)}>
                      <RemoteImage path={path} className="bookmark-image" lazy />
                    </button>
                  ))}
                </div>
              )}

              {!it.missing && (
                <button type="button" className="fold-toggle bookmark-go" onClick={() => app.goTo(target)}>
                  원래 {b.type === 'comment' ? '댓글' : '글'}로 이동 →
                </button>
              )}
            </article>
          )
        })}
      </div>

      <Lightbox path={lightboxPath} onClose={() => setLightboxPath(null)} />
    </div>
  )
}
