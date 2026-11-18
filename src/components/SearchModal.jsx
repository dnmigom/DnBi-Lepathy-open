import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { listPosts, loadIndex } from '../lib/dataModel.js'
import { formatClock, formatDateHeading } from '../lib/format.js'
import { DIARY_WORD } from '../config.js'
import Avatar from './Avatar.jsx'
import Icon from './Icon.jsx'

const CONCURRENCY = 6 // 동시에 불러올 날짜 수
const MAX_RESULTS = 100

// 글 본문 · 댓글 · 태그를 검색해요.
// scopeMemberId가 있으면(모아보기 중) 그 사람의 글만, 없으면 모두의 글을 검색해요.
// 결과를 누르면 onPick({ date, memberId, postId })로 그 날짜로 이동해요.
export default function SearchModal({ scopeMemberId = null, onPick, onClose }) {
  const auth = useAuth()
  const [query, setQuery] = useState('')
  const [posts, setPosts] = useState([]) // [{ date, memberId, postId, json }]
  const [progress, setProgress] = useState({ done: 0, total: null })
  const [error, setError] = useState(null)
  const inputRef = useRef(null)

  const scopeMember = auth.members.find((m) => m.id === scopeMemberId)

  // 열릴 때 글을 모두 불러와요 (불러오는 중에도 이미 받은 글부터 바로 검색돼요)
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { json: index } = await loadIndex(auth.client)
        const dates = Object.keys(index)
          .filter((d) => !scopeMemberId || (index[d] || []).includes(scopeMemberId))
          .sort((a, b) => (a < b ? 1 : -1))
        if (cancelled) return
        setProgress({ done: 0, total: dates.length })
        let cursor = 0
        const worker = async () => {
          while (!cancelled && cursor < dates.length) {
            const date = dates[cursor++]
            try {
              const list = await listPosts(auth.client, date, scopeMemberId)
              if (cancelled) return
              setPosts((prev) => [...prev, ...list.map((p) => ({ ...p, date }))])
            } catch (_) { /* 한 날짜가 실패해도 나머지는 계속 */ }
            if (!cancelled) setProgress((prev) => ({ ...prev, done: prev.done + 1 }))
          }
        }
        await Promise.all(Array.from({ length: CONCURRENCY }, worker))
      } catch (e) {
        if (!cancelled) setError(e.message || '불러오지 못했어요.')
      }
    })()
    return () => { cancelled = true }
  }, [auth.client, scopeMemberId])

  useEffect(() => {
    inputRef.current?.focus()
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const terms = useMemo(() => query.trim().toLowerCase().split(/\s+/).filter(Boolean), [query])

  const results = useMemo(() => {
    if (terms.length === 0) return []
    const found = []
    for (const p of posts) {
      const m = matchPost(p.json, terms, auth.members)
      if (m) found.push({ ...p, ...m })
    }
    found.sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1
      return (a.json.createdAt || '') < (b.json.createdAt || '') ? 1 : -1
    })
    return found
  }, [posts, terms, auth.members])

  const loading = progress.total === null || progress.done < progress.total

  return (
    <div className="modal-overlay search-overlay" onClick={onClose}>
      <div className="modal card search-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="검색">
        <div className="search-input-row">
          <Icon name="search" />
          <input
            ref={inputRef}
            type="search"
            className="search-input"
            placeholder={scopeMember ? `${scopeMember.displayName}의 ${DIARY_WORD}에서 검색` : `모든 ${DIARY_WORD}에서 검색`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="btn btn-ghost btn-small" onClick={onClose} aria-label="닫기">✕</button>
        </div>

        <p className="search-status">
          {error
            ? error
            : loading
              ? `글 불러오는 중... ${progress.total ? `(${progress.done}/${progress.total}일)` : ''}`
              : `본문 · 댓글 · 태그에서 찾아요${terms.length ? ` · ${results.length}개 찾음` : ''}`}
        </p>

        <ul className="search-results">
          {terms.length > 0 && results.length === 0 && !loading && (
            <li className="search-empty">찾는 글이 없어요.</li>
          )}
          {results.slice(0, MAX_RESULTS).map((r) => {
            const author = auth.members.find((m) => m.id === r.memberId)
            return (
              <li key={`${r.date}:${r.memberId}:${r.postId}`}>
                <button
                  type="button"
                  className="search-result"
                  style={{ '--author-color': author?.color || 'var(--accent)' }}
                  onClick={() => { onPick({ date: r.date, memberId: r.memberId, postId: r.postId }); onClose() }}
                >
                  <div className="search-result-head">
                    {author && <Avatar member={author} size={22} />}
                    <span className="search-result-name">{author?.displayName || r.memberId}</span>
                    <span className="search-result-date">{formatDateHeading(r.date)} {formatClock(r.json.createdAt)}</span>
                  </div>
                  <p className="search-result-snippet"><Highlight text={r.snippet} terms={terms} /></p>
                  <div className="search-result-where">
                    {r.where.map((w) => <span key={w} className="search-where-chip">{w}</span>)}
                  </div>
                </button>
              </li>
            )
          })}
          {results.length > MAX_RESULTS && (
            <li className="search-empty">결과가 많아서 최근 {MAX_RESULTS}개만 보여요. 검색어를 더 넣어보세요.</li>
          )}
        </ul>
      </div>
    </div>
  )
}

/** 모든 검색어가 (본문+태그+댓글 어딘가에) 들어 있으면 { where, snippet } */
function matchPost(entry, terms, members) {
  const content = entry.content || ''
  const tags = (entry.moodTags || []).join(' ')
  const comments = (entry.comments || []).map((c) => ({
    text: c.text || '',
    name: members.find((m) => m.id === c.author)?.displayName || c.author,
  }))
  const all = [content, tags, ...comments.map((c) => c.text)].join('\n').toLowerCase()
  if (!terms.every((t) => all.includes(t))) return null

  const has = (s) => terms.some((t) => s.toLowerCase().includes(t))
  const where = []
  if (has(content)) where.push('본문')
  const hitComment = comments.find((c) => has(c.text))
  if (hitComment) where.push('댓글')
  if (has(tags)) where.push('태그')

  let snippet
  if (has(content)) snippet = cut(content, terms)
  else if (hitComment) snippet = `${hitComment.name}: ${cut(hitComment.text, terms)}`
  else snippet = tags
  return { where, snippet }
}

/** 첫 번째로 걸린 검색어 주변만 잘라서 보여주기 */
function cut(text, terms, radius = 45) {
  const lower = text.toLowerCase()
  const pos = Math.min(...terms.map((t) => lower.indexOf(t)).filter((i) => i >= 0))
  if (!Number.isFinite(pos)) return text.slice(0, radius * 2)
  const start = Math.max(0, pos - radius)
  const end = Math.min(text.length, pos + radius)
  return `${start > 0 ? '…' : ''}${text.slice(start, end).replace(/\s+/g, ' ')}${end < text.length ? '…' : ''}`
}

export function Highlight({ text, terms }) {
  if (!terms.length) return text
  const escaped = terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const parts = text.split(new RegExp(`(${escaped.join('|')})`, 'gi'))
  return parts.map((part, i) => (
    terms.includes(part.toLowerCase()) ? <mark key={i}>{part}</mark> : <React.Fragment key={i}>{part}</React.Fragment>
  ))
}
