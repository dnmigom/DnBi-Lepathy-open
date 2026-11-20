import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useApp } from '../context/AppContext.jsx'
import { notifyComment, notifyReaction, unnotifyComment } from '../lib/inbox.js'
import { makeSnapshot, targetKey } from '../lib/userState.js'
import { changeQuoteRefs } from '../lib/quoteRefs.js'
import {
  deleteEntry, getChecklistFields, imagePath, makeCommentId, saveEntry, toggleReaction,
  withEditedComment, withNewComment, withoutComment,
} from '../lib/dataModel.js'
import { resizeImageFile } from '../lib/image.js'
import { clearFoldState, useFoldState } from '../lib/foldState.js'
import { commentDomId, formatClock, postDomId } from '../lib/format.js'
import { DEFAULT_BODY_OPEN, DEFAULT_COMMENTS_OPEN, PREVIEW_HEIGHT_PX } from '../config.js'
import RemoteImage from './RemoteImage.jsx'
import Lightbox from './Lightbox.jsx'
import ReactionBar from './ReactionBar.jsx'
import CommentList from './CommentList.jsx'
import CommentForm from './CommentForm.jsx'
import EntryEditor from './EntryEditor.jsx'
import Icon from './Icon.jsx'
import QuoteBox from './QuoteBox.jsx'

// 스레드 안의 글 하나. 작성자 이름/아바타는 스레드(EntryThread) 머리에 한 번만 보여요.
export default function EntryCard({
  entry: initialEntry, sha: initialSha, date, memberId, postId,
  showChecklist = true, isLastOfMember = true, onDeleted,
}) {
  const auth = useAuth()
  const app = useApp()
  const [entry, setEntry] = useState(initialEntry)
  const [sha, setSha] = useState(initialSha)
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [lightboxPath, setLightboxPath] = useState(null)

  const foldKey = `${auth.session?.owner}/${auth.session?.repo}:${date}:${memberId}:${postId}`
  const [bodyOpen, toggleBody, setBodyOpen] = useFoldState(`${foldKey}:body`, DEFAULT_BODY_OPEN)
  const [commentsOpen, toggleComments, setCommentsOpen] = useFoldState(`${foldKey}:comments`, DEFAULT_COMMENTS_OPEN)

  // 알림·검색·북마크·인용에서 이 글(또는 이 글의 댓글)로 이동해 왔을 때:
  // 필요한 부분을 펼치고, 그 위치로 스크롤해서 잠깐 강조해요.
  // (타이머는 이 글이 화면에서 사라질 때만 멈춰요. 이동 요청을 지우는 순간 멈추면 스크롤이 안 돼요)
  const focus = app?.focus
  const focusTimer = useRef(null)
  useEffect(() => () => clearInterval(focusTimer.current), [])
  useEffect(() => {
    if (!focus || focus.date !== date || focus.memberId !== memberId || focus.postId !== postId) return
    if (focus.commentId) setCommentsOpen(true)
    else setBodyOpen(true)
    app.clearFocus()
    const id = focus.commentId ? commentDomId(focus.commentId) : postDomId(date, memberId, postId)
    const block = focus.commentId ? 'center' : 'start'
    let tries = 0
    clearInterval(focusTimer.current)
    focusTimer.current = setInterval(() => {
      const el = document.getElementById(id)
      if (el || ++tries > 30) clearInterval(focusTimer.current)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block })
        el.classList.add('flash')
        setTimeout(() => el.classList.remove('flash'), 1800)
      }
    }, 100)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus])

  // 본문이 미리보기 높이보다 길 때만 접기/펼치기 버튼을 보여줘요.
  const bodyInnerRef = useRef(null)
  const [canFold, setCanFold] = useState(false)
  useLayoutEffect(() => {
    const el = bodyInnerRef.current
    if (!el) return undefined
    const measure = () => setCanFold(el.scrollHeight > PREVIEW_HEIGHT_PX + 24)
    measure()
    if (typeof ResizeObserver === 'undefined') return undefined
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [editing, entry.content, entry.images?.length, entry.quotes?.length])

  const author = auth.members.find((m) => m.id === memberId)
  const isMine = auth.currentMember?.id === memberId
  const moodTags = entry.moodTags || []

  async function persist(nextEntry) {
    const { entry: saved, sha: nextSha } = await saveEntry(auth.client, date, memberId, postId, nextEntry, sha)
    setEntry(saved)
    setSha(nextSha)
  }

  async function handleToggleReaction(emoji) {
    if (busy) return
    setBusy(true)
    const prev = entry
    const optimistic = toggleReaction(entry, emoji, auth.currentMember.id)
    const added = (optimistic.reactions?.[emoji] || []).includes(auth.currentMember.id)
    setEntry(optimistic)
    try {
      await persist(optimistic)
      // 다른 사람 글에 반응을 남기면 글쓴이에게 알림 (취소하면 알림도 지워져요)
      notifyReaction(auth.client, {
        me: auth.currentMember.id, date, postAuthor: memberId, postId, reactionKey: emoji, added, postText: entry.content,
      })
    } catch (e) {
      setEntry(prev) // 실패하면 되돌리기
    } finally {
      setBusy(false)
    }
  }

  async function handleAddComment({ text, imageFile }) {
    let imgPath = null
    if (imageFile) {
      const { base64, extension } = await resizeImageFile(imageFile)
      imgPath = imagePath(date, auth.currentMember.id, `comment.${extension}`)
      await auth.client.putBase64File(imgPath, base64, { message: `댓글 이미지 (${date})` })
    }
    const comment = {
      id: makeCommentId(),
      author: auth.currentMember.id,
      text,
      image: imgPath,
      createdAt: new Date().toISOString(),
    }
    const before = entry.comments || []
    await persist(withNewComment(entry, comment))
    // 글쓴이와 이 글에 댓글을 단 사람들에게 알림 (실패해도 댓글 자체에는 영향 없음)
    notifyComment(auth.client, {
      me: auth.currentMember.id, date, postAuthor: memberId, postId, comment, existingComments: before,
    })
  }

  async function handleEditComment(commentId, text) {
    await persist(withEditedComment(entry, commentId, text))
  }

  async function handleDeleteComment(commentId) {
    await persist(withoutComment(entry, commentId))
    unnotifyComment(auth.client, { members: auth.members, me: auth.currentMember.id, commentId })
  }

  async function handleDelete() {
    if (busy) return
    if (!window.confirm('정말 이 글을 삭제할까요? 댓글과 반응도 함께 사라지고, 되돌릴 수 없어요.')) return
    setBusy(true)
    try {
      await deleteEntry(auth.client, date, memberId, postId, sha, { keepIndexed: !isLastOfMember })
      clearFoldState(foldKey)
      // 이 글이 인용하던 것들의 인용 기록에서도 빼요
      const qKeys = (entry.quotes || []).map((q) => q.key || targetKey(q))
      if (qKeys.length) {
        changeQuoteRefs(auth.client, { remove: qKeys, ref: { date, memberId, postId } })
          .then((items) => items && app?.setQuoteRefs(items)).catch(() => {})
      }
      onDeleted?.()
    } catch (e) {
      window.alert(e.message || '삭제에 실패했어요.')
      setBusy(false)
    }
  }

  const images = entry.images || (entry.image ? [entry.image] : [])
  const commentCount = entry.comments?.length || 0
  const collapsed = canFold && !bodyOpen
  const hasChecklistData = getChecklistFields(author).some((f) => entry.checklist?.[f.key])
  const quotes = entry.quotes || []
  const postSnapshot = () => makeSnapshot({ type: 'post', date, memberId, postId, entry })
  const myKey = targetKey({ type: 'post', date, memberId, postId })
  const bookmarked = app?.isBookmarked(myKey)
  // 내 글이면 인용된 횟수·북마크된 횟수를 아이콘 옆에 보여줘요
  const quotedCount = isMine ? (app?.quoteRefsFor(myKey).length || 0) : 0
  const bookmarkedCount = isMine ? (app?.bookmarkCountFor(myKey) || 0) : 0

  return (
    <article className="entry-post" id={postDomId(date, memberId, postId)}>
      <header className="entry-post-header">
        <span className="entry-post-time">{formatClock(entry.createdAt)}</span>
        {!editing && (
          <div className="entry-card-actions">
            <button
              className="btn btn-ghost btn-small icon-btn" onClick={() => app.addQuote(postSnapshot())}
              title="인용" aria-label="인용"
            >
              <Icon name="quote" />
            </button>
            {quotedCount > 0 && (
              <button
                type="button" className="action-count clickable" onClick={() => app.openQuoteList(myKey)}
                title="이 글을 인용한 글 보기" aria-label={`인용 ${quotedCount}회, 목록 보기`}
              >
                {quotedCount}
              </button>
            )}
            <button
              className={`btn btn-ghost btn-small icon-btn ${bookmarked ? 'is-on' : ''}`}
              onClick={() => app.toggleBookmark(postSnapshot())}
              title={bookmarked ? '북마크 해제' : '북마크'} aria-label="북마크" aria-pressed={!!bookmarked}
            >
              <Icon name={bookmarked ? 'bookmarked' : 'bookmark'} />
            </button>
            {bookmarkedCount > 0 && (
              <span className="action-count" title={`${bookmarkedCount}명이 북마크했어요`}>{bookmarkedCount}</span>
            )}
            {isMine && <>
            <button
              className="btn btn-ghost btn-small icon-btn" onClick={() => setEditing(true)}
              title="수정" aria-label="수정"
            >
              <Icon name="edit" />
            </button>
            <button
              className="btn btn-ghost btn-small btn-danger icon-btn" onClick={handleDelete} disabled={busy}
              title="삭제" aria-label="삭제"
            >
              <Icon name="delete" />
            </button>
            </>}
          </div>
        )}
      </header>

      {moodTags.length > 0 && !editing && (
        <div className="entry-mood-tags">
          {moodTags.map((tag) => (
            <span key={tag} className="entry-mood-tag">{tag}</span>
          ))}
        </div>
      )}

      {editing ? (
        <EntryEditor
          date={date}
          memberId={memberId}
          postId={postId}
          initialEntry={entry}
          initialSha={sha}
          showChecklist={showChecklist || hasChecklistData}
          onSaved={(e, s) => { setEntry(e); setSha(s); setEditing(false) }}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <>
          {(showChecklist || hasChecklistData) && (
            <div className="checklist-row readonly">
              {getChecklistFields(author).map((f) => {
                const on = !!entry.checklist?.[f.key]
                return (
                  <span key={f.key} className={`chip checklist-status ${on ? 'on' : 'off'}`}>
                    {f.label}:{on ? 'O' : 'X'}
                  </span>
                )
              })}
            </div>
          )}

          <div
            className={`entry-body ${collapsed ? 'collapsed' : ''}`}
            style={collapsed ? { maxHeight: PREVIEW_HEIGHT_PX } : undefined}
          >
            <div ref={bodyInnerRef}>
              {entry.content ? (
                <p className="entry-content">{entry.content}</p>
              ) : quotes.length === 0 && (
                <p className="entry-content empty">글 없이 기록만 남겼어요.</p>
              )}
              {quotes.length > 0 && (
                <div className="quote-list">
                  {quotes.map((q) => <QuoteBox key={q.key || targetKey(q)} quote={q} />)}
                </div>
              )}
              {images.length > 0 && (
                <div className="entry-image-grid">
                  {images.map((path) => (
                    <button
                      type="button"
                      key={path}
                      className="entry-image-btn"
                      onClick={() => setLightboxPath(path)}
                      aria-label="사진 크게 보기"
                      tabIndex={collapsed ? -1 : 0}
                    >
                      <RemoteImage path={path} className="entry-image" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          {canFold && (
            <button type="button" className="fold-toggle" onClick={toggleBody} aria-expanded={bodyOpen}>
              {bodyOpen ? <>접기 <Icon name="sortUp" inherit className="caret-up" /></> : <>펼쳐서 전체 보기{images.length > 0 ? ` (사진 ${images.length}장)` : ''} <Icon name="sortDown" inherit className="caret-down" /></>}
            </button>
          )}
        </>
      )}

      <div className="entry-post-footer">
        <ReactionBar entry={entry} onToggle={handleToggleReaction} />
        <button
          type="button"
          className={`comment-toggle ${commentsOpen ? 'open' : ''}`}
          onClick={toggleComments}
          aria-expanded={commentsOpen}
        >
          {commentsOpen ? <>댓글 접기 <Icon name="sortUp" inherit className="caret-up" /></> : <>{commentCount > 0 ? `댓글 ${commentCount}개` : '댓글 달기'} <Icon name="sortDown" inherit className="caret-down" /></>}
        </button>
      </div>

      {commentsOpen && (
        <div className="comment-section">
          <CommentList
            comments={entry.comments}
            date={date}
            postAuthor={memberId}
            postId={postId}
            onEditComment={handleEditComment}
            onDeleteComment={handleDeleteComment}
          />
          <CommentForm onSubmit={handleAddComment} />
        </div>
      )}

      <Lightbox path={lightboxPath} onClose={() => setLightboxPath(null)} />
    </article>
  )
}
