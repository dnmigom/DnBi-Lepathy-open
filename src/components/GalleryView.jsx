import React, { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useApp } from '../context/AppContext.jsx'
import { loadAllPosts } from '../lib/allPosts.js'
import { formatDateHeading } from '../lib/format.js'
import { memberThemeStyle } from '../lib/theme.js'
import { DIARY_WORD } from '../config.js'
import MemberTabs from './MemberTabs.jsx'
import Icon from './Icon.jsx'
import RemoteImage from './RemoteImage.jsx'

// 사진 갤러리: 사람별로 그 사람이 일기·댓글에 첨부한 사진을 모아 보여줘요. (모두가 서로의 사진을 볼 수 있어요)
export default function GalleryView() {
  const auth = useAuth()
  const app = useApp()
  const [memberId, setMemberId] = useState(auth.currentMember?.id)
  const [posts, setPosts] = useState([])
  const [progress, setProgress] = useState({ done: 0, total: null })
  const [viewerIndex, setViewerIndex] = useState(null)

  useEffect(() => {
    let cancelled = false
    setPosts([])
    loadAllPosts(auth.client, {
      isCancelled: () => cancelled,
      onChunk: (list) => setPosts((prev) => [...prev, ...list]),
      onProgress: (done, total) => setProgress({ done, total }),
    }).catch(() => {})
    return () => { cancelled = true }
  }, [auth.client])

  // 사진 목록: { path, author, date, memberId(글쓴이), postId, commentId?, createdAt }
  const photos = useMemo(() => {
    const out = []
    for (const p of posts) {
      const e = p.json
      if (p.memberId === memberId) {
        const imgs = e.images || (e.image ? [e.image] : [])
        imgs.forEach((path) => out.push({ path, date: p.date, memberId: p.memberId, postId: p.postId, createdAt: e.createdAt || '' }))
      }
      for (const c of e.comments || []) {
        if (c.author === memberId && c.image) {
          out.push({ path: c.image, date: p.date, memberId: p.memberId, postId: p.postId, commentId: c.id, createdAt: c.createdAt || '' })
        }
      }
    }
    return out.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
  }, [posts, memberId])

  const member = auth.members.find((m) => m.id === memberId)
  const loading = progress.total === null || progress.done < progress.total

  return (
    <div className="gallery-view">
      <h2 className="detail-heading">갤러리{loading ? '' : ` · ${photos.length}개`}</h2>

      <MemberTabs value={memberId} onChange={(id) => { setMemberId(id); setViewerIndex(null) }} />

      {/* 사진 개수는 제목(갤러리 · n개)에 보여요. 모으는 동안만 진행 상황 표시 */}
      {loading && (
        <p className="search-status gallery-status">
          사진 모으는 중... {progress.total ? `(${progress.done}/${progress.total}일)` : ''}
        </p>
      )}

      {!loading && photos.length === 0 && (
        <p className="feed-empty">{member?.displayName}님이 {DIARY_WORD}나 댓글에 첨부한 사진이 아직 없어요.</p>
      )}

      <div className="gallery-grid member-theme" style={memberThemeStyle(member)}>
        {photos.map((ph, i) => (
          <button
            key={`${ph.path}:${i}`} type="button" className="gallery-cell"
            onClick={() => setViewerIndex(i)} aria-label="사진 크게 보기"
          >
            <RemoteImage path={ph.path} className="gallery-thumb" lazy />
            {ph.commentId && <span className="gallery-badge">댓글</span>}
          </button>
        ))}
      </div>

      {viewerIndex !== null && photos[viewerIndex] && (
        <GalleryViewer
          photo={photos[viewerIndex]}
          index={viewerIndex}
          count={photos.length}
          onMove={(d) => setViewerIndex((i) => Math.min(photos.length - 1, Math.max(0, i + d)))}
          onClose={() => setViewerIndex(null)}
          onGo={(ph) => {
            setViewerIndex(null)
            app.goTo({ date: ph.date, memberId: ph.memberId, postId: ph.postId, ...(ph.commentId ? { commentId: ph.commentId } : {}) })
          }}
        />
      )}
    </div>
  )
}

function GalleryViewer({ photo, index, count, onMove, onClose, onGo }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') onMove(-1)
      if (e.key === 'ArrowRight') onMove(1)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, onMove])

  return (
    <div className="lightbox-overlay" onClick={onClose}>
      <button type="button" className="lightbox-close" onClick={onClose} aria-label="닫기">✕</button>
      <div className="lightbox-content gallery-viewer" onClick={(e) => e.stopPropagation()}>
        <RemoteImage path={photo.path} className="lightbox-image" />
        <div className="gallery-viewer-bar">
          <button type="button" className="btn btn-small" onClick={() => onMove(-1)} disabled={index === 0} aria-label="이전 사진"><Icon name="prev" /></button>
          <span className="gallery-viewer-info">
            {formatDateHeading(photo.date)}{photo.commentId ? ' · 댓글' : ''} · {index + 1}/{count}
          </span>
          <button type="button" className="btn btn-small" onClick={() => onMove(1)} disabled={index === count - 1} aria-label="다음 사진"><Icon name="next" /></button>
          <button type="button" className="btn btn-primary btn-small" onClick={() => onGo(photo)}>
            {photo.commentId ? '댓글로 이동' : '글로 이동'}
          </button>
        </div>
      </div>
    </div>
  )
}
