import React, { useLayoutEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import {
  deleteEntry, getChecklistFields, imagePath, makeCommentId, saveEntry, toggleReaction,
  withEditedComment, withNewComment, withoutComment,
} from '../lib/dataModel.js'
import { resizeImageFile } from '../lib/image.js'
import { clearFoldState, useFoldState } from '../lib/foldState.js'
import { DEFAULT_BODY_OPEN, DEFAULT_COMMENTS_OPEN, PREVIEW_HEIGHT_PX } from '../config.js'
import RemoteImage from './RemoteImage.jsx'
import Lightbox from './Lightbox.jsx'
import ReactionBar from './ReactionBar.jsx'
import CommentList from './CommentList.jsx'
import CommentForm from './CommentForm.jsx'
import EntryEditor from './EntryEditor.jsx'
import Icon from './Icon.jsx'

// 스레드 안의 글 하나. 작성자 이름/아바타는 스레드(EntryThread) 머리에 한 번만 보여요.
export default function EntryCard({
  entry: initialEntry, sha: initialSha, date, memberId, postId,
  showChecklist = true, isLastOfMember = true, onDeleted,
}) {
  const auth = useAuth()
  const [entry, setEntry] = useState(initialEntry)
  const [sha, setSha] = useState(initialSha)
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [lightboxPath, setLightboxPath] = useState(null)

  const foldKey = `${auth.session?.owner}/${auth.session?.repo}:${date}:${memberId}:${postId}`
  const [bodyOpen, toggleBody] = useFoldState(`${foldKey}:body`, DEFAULT_BODY_OPEN)
  const [commentsOpen, toggleComments] = useFoldState(`${foldKey}:comments`, DEFAULT_COMMENTS_OPEN)

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
  }, [editing, entry.content, entry.images?.length])

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
    setEntry(optimistic)
    try {
      await persist(optimistic)
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
    await persist(withNewComment(entry, comment))
  }

  async function handleEditComment(commentId, text) {
    await persist(withEditedComment(entry, commentId, text))
  }

  async function handleDeleteComment(commentId) {
    await persist(withoutComment(entry, commentId))
  }

  async function handleDelete() {
    if (busy) return
    if (!window.confirm('정말 이 글을 삭제할까요? 댓글과 반응도 함께 사라지고, 되돌릴 수 없어요.')) return
    setBusy(true)
    try {
      await deleteEntry(auth.client, date, memberId, postId, sha, { keepIndexed: !isLastOfMember })
      clearFoldState(foldKey)
      onDeleted?.()
    } catch (e) {
      window.alert(e.message || '삭제에 실패했어요.')
      setBusy(false)
    }
  }

  const sleepHours = entry.checklist?.sleepHours
  const images = entry.images || (entry.image ? [entry.image] : [])
  const commentCount = entry.comments?.length || 0
  const collapsed = canFold && !bodyOpen
  const hasChecklistData = getChecklistFields(author).some((f) => entry.checklist?.[f.key]) || sleepHours != null

  return (
    <article className="entry-post">
      <header className="entry-post-header">
        <span className="entry-post-time">{formatTime(entry.createdAt)}</span>
        {isMine && !editing && (
          <div className="entry-card-actions">
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
              {sleepHours != null && <span className="chip checklist-status">{sleepHours}시간 수면</span>}
            </div>
          )}

          <div
            className={`entry-body ${collapsed ? 'collapsed' : ''}`}
            style={collapsed ? { maxHeight: PREVIEW_HEIGHT_PX } : undefined}
          >
            <div ref={bodyInnerRef}>
              {entry.content ? (
                <p className="entry-content">{entry.content}</p>
              ) : (
                <p className="entry-content empty">글 없이 기록만 남겼어요.</p>
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
              {bodyOpen ? '접기 ▴' : `펼쳐서 전체 보기${images.length > 0 ? ` (사진 ${images.length}장)` : ''} ▾`}
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
          {commentsOpen ? '댓글 접기 ▴' : commentCount > 0 ? `댓글 ${commentCount}개 ▾` : '댓글 달기 ▾'}
        </button>
      </div>

      {commentsOpen && (
        <div className="comment-section">
          <CommentList comments={entry.comments} onEditComment={handleEditComment} onDeleteComment={handleDeleteComment} />
          <CommentForm onSubmit={handleAddComment} />
        </div>
      )}

      <Lightbox path={lightboxPath} onClose={() => setLightboxPath(null)} />
    </article>
  )
}

function formatTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
