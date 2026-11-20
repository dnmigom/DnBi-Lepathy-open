import React, { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { loadIndex } from '../lib/dataModel.js'
import { loadPostsForDates } from '../lib/allPosts.js'
import { memberThemeStyle } from '../lib/theme.js'
import { DIARY_WORD } from '../config.js'
import MemberTabs from './MemberTabs.jsx'
import EntryThread from './EntryThread.jsx'

// 태그 모아보기: 사람별로 그 사람이 쓴 태그를 전부, 쓰인 횟수와 함께 보여줘요.
// 태그를 누르면 바로 아래에 그 태그가 쓰인 일기들이 모여요. (한 번 더 누르면 닫혀요)
export default function TagsView() {
  const auth = useAuth()
  const [memberId, setMemberId] = useState(auth.currentMember?.id)
  const [posts, setPosts] = useState(null)
  const [selectedTag, setSelectedTag] = useState(null)

  useEffect(() => {
    let cancelled = false
    setPosts(null)
    setSelectedTag(null)
    ;(async () => {
      const { json: index } = await loadIndex(auth.client)
      const dates = Object.keys(index).filter((d) => (index[d] || []).includes(memberId))
      const list = await loadPostsForDates(auth.client, dates, { memberId, isCancelled: () => cancelled })
      if (!cancelled) setPosts(list)
    })().catch(() => { if (!cancelled) setPosts([]) })
    return () => { cancelled = true }
  }, [auth.client, memberId])

  // [{ tag, count }] 많이 쓴 순
  const tags = useMemo(() => {
    const counts = new Map()
    for (const p of posts || []) {
      for (const t of new Set(p.json.moodTags || [])) counts.set(t, (counts.get(t) || 0) + 1)
    }
    return [...counts].map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, 'ko'))
  }, [posts])

  // 고른 태그가 쓰인 글을 날짜별로 (최신 날짜부터)
  const groups = useMemo(() => {
    if (!selectedTag || !posts) return []
    const byDate = new Map()
    for (const p of posts) {
      if (!(p.json.moodTags || []).includes(selectedTag)) continue
      if (!byDate.has(p.date)) byDate.set(p.date, [])
      byDate.get(p.date).push(p)
    }
    return [...byDate].sort((a, b) => (a[0] < b[0] ? 1 : -1))
  }, [posts, selectedTag])

  const member = auth.members.find((m) => m.id === memberId)
  const matchCount = groups.reduce((n, [, list]) => n + list.length, 0)

  return (
    <div className="feed-view tags-view">
      <h2 className="detail-heading">태그{posts === null ? '' : ` · ${tags.length}개`}</h2>

      <MemberTabs value={memberId} onChange={setMemberId} />

      {posts === null && <p className="feed-loading">태그 모으는 중...</p>}
      {posts !== null && tags.length === 0 && (
        <p className="feed-empty">{member?.displayName}님이 쓴 태그가 아직 없어요.</p>
      )}

      {tags.length > 0 && (
        // 태그가 많아져도 아래 일기까지 멀리 내려가지 않도록, 달력과 같은 높이의 상자 안에서 스크롤돼요.
        <div className="card tag-box member-theme" style={memberThemeStyle(member)}>
        <div className="tag-cloud">
          {tags.map(({ tag, count }) => (
            <button
              key={tag} type="button"
              className={`tag-chip ${selectedTag === tag ? 'active' : ''}`}
              onClick={() => setSelectedTag((cur) => (cur === tag ? null : tag))}
              aria-pressed={selectedTag === tag}
            >
              <span>{tag}</span>
              <span className="tag-count">{count}</span>
            </button>
          ))}
        </div>
        </div>
      )}

      {selectedTag && (
        <>
          <div className="feed-filter-row">
            <span className="feed-filter-label">{selectedTag} · {matchCount}개의 {DIARY_WORD}</span>
            <button type="button" className="btn btn-small" onClick={() => setSelectedTag(null)}>닫기</button>
          </div>
          <div className="feed-list">
            {groups.map(([date, list]) => (
              <EntryThread
                key={`${selectedTag}:${date}`}
                member={member}
                date={date}
                posts={list}
                showDate
                allowCompose={false}
                onRemoved={(postId) => setPosts((prev) => prev.filter((p) => !(p.date === date && p.postId === postId)))}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
