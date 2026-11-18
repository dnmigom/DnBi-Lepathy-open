import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { listPosts, loadIndex } from '../lib/dataModel.js'
import { formatDateHeading } from '../lib/format.js'
import { DIARY_WORD } from '../config.js'
import Calendar from './Calendar.jsx'
import EntryThread from './EntryThread.jsx'
import MemberTabs from './MemberTabs.jsx'

const PAGE_SIZE = 8

// 한 사람의 글 모아보기.
// 위쪽 달력에는 그 사람이 글을 쓴 날만 점으로 표시돼요.
// selectedDate가 null이면 전체 글을 최신순으로, 날짜를 고르면 그 날짜의 글만 보여줘요.
// onSelectMember: 달력 아래 사람 버튼을 누르면 그 사람의 글로 바꿔요.
export default function UserFeedView({ memberId, selectedDate, onSelectDate, onSelectMember }) {
  const auth = useAuth()
  const [index, setIndex] = useState(null)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [threads, setThreads] = useState({}) // date -> [posts] | 'loading'

  const refreshIndex = useCallback(async () => {
    const { json } = await loadIndex(auth.client)
    setIndex(json)
  }, [auth.client])

  useEffect(() => {
    setIndex(null)
    setVisibleCount(PAGE_SIZE)
    setThreads({})
    refreshIndex()
  }, [memberId, refreshIndex])

  // 이 사람이 글을 쓴 날짜들 (최신순)
  const dates = useMemo(() => Object.keys(index || {})
    .filter((d) => (index[d] || []).includes(memberId))
    .sort((a, b) => (a < b ? 1 : -1)), [index, memberId])

  // 달력에는 이 사람의 점만 찍히도록
  const memberIndex = useMemo(() => Object.fromEntries(dates.map((d) => [d, [memberId]])), [dates, memberId])

  const visibleDates = selectedDate ? [selectedDate] : dates.slice(0, visibleCount)

  useEffect(() => {
    visibleDates.forEach((date) => {
      if (threads[date]) return
      setThreads((prev) => ({ ...prev, [date]: 'loading' }))
      listPosts(auth.client, date, memberId)
        .then((list) => setThreads((prev) => ({ ...prev, [date]: list })))
        .catch(() => setThreads((prev) => ({ ...prev, [date]: [] })))
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleDates.join(','), memberId])

  const member = auth.members.find((m) => m.id === memberId)

  function handleAdded(date, post) {
    setThreads((prev) => ({ ...prev, [date]: [...(Array.isArray(prev[date]) ? prev[date] : []), post] }))
    if (!dates.includes(date)) refreshIndex()
  }

  function handleRemoved(date, postId) {
    setThreads((prev) => ({
      ...prev,
      [date]: (Array.isArray(prev[date]) ? prev[date] : []).filter((p) => p.postId !== postId),
    }))
    refreshIndex() // 그날 마지막 글을 지웠다면 달력 점도 사라지도록
  }

  // 이미 선택한 날짜를 한 번 더 누르면 전체 보기로 돌아가요.
  function handleSelectDate(date) {
    onSelectDate(date === selectedDate ? null : date)
  }

  return (
    <div className="feed-view">
      <h2 className="detail-heading">{member?.displayName}레파시</h2>

      <Calendar index={memberIndex} selectedDate={selectedDate} onSelectDate={handleSelectDate} />

      <MemberTabs value={memberId} onChange={(id) => { if (id !== memberId) onSelectMember(id) }} />

      <div className="feed-filter-row">
        {selectedDate ? (
          <>
            <span className="feed-filter-label">{formatDateHeading(selectedDate)}</span>
            <button type="button" className="btn btn-small" onClick={() => onSelectDate(null)}>전체 보기</button>
          </>
        ) : (
          <span className="feed-filter-label">
            전체 {index ? `· ${dates.length}일` : ''}
          </span>
        )}
      </div>

      {index === null && <p className="feed-loading">불러오는 중...</p>}
      {index !== null && !selectedDate && dates.length === 0 && (
        <p className="feed-empty">{member?.displayName}님이 아직 쓴 {DIARY_WORD}가 없어요.</p>
      )}

      <div className="feed-list">
        {member && index !== null && visibleDates.map((date) => {
          const list = threads[date]
          if (!list || list === 'loading') {
            return <div className="card skeleton-card" key={date} />
          }
          // 전체 보기에서는 빈 날짜를 건너뛰고, 날짜를 골랐을 때는 빈 칸(내 칸이면 작성칸)을 보여줘요.
          if (list.length === 0 && !selectedDate) return null
          return (
            <EntryThread
              key={date}
              member={member}
              date={date}
              posts={list}
              showDate={!selectedDate}
              onAdded={(post) => handleAdded(date, post)}
              onRemoved={(postId) => handleRemoved(date, postId)}
            />
          )
        })}
      </div>

      {!selectedDate && visibleCount < dates.length && (
        <button className="btn" onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}>
          더 보기
        </button>
      )}
    </div>
  )
}
