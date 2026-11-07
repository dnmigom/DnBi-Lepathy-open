import React, { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { listDatesForMember, listPosts } from '../lib/dataModel.js'
import { DIARY_WORD } from '../config.js'
import EntryThread from './EntryThread.jsx'

const PAGE_SIZE = 8

export default function UserFeedView({ memberId }) {
  const auth = useAuth()
  const [dates, setDates] = useState([])
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [threads, setThreads] = useState({}) // date -> [posts] | 'loading'
  const [loadingDates, setLoadingDates] = useState(true)

  useEffect(() => {
    setDates([])
    setVisibleCount(PAGE_SIZE)
    setThreads({})
    setLoadingDates(true)
    listDatesForMember(auth.client, memberId).then((ds) => {
      setDates(ds) // 최신 날짜가 먼저 오도록 정렬되어 있음
      setLoadingDates(false)
    })
  }, [memberId])

  const visibleDates = dates.slice(0, visibleCount)

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

  function removeDate(date) {
    setDates((prev) => prev.filter((d) => d !== date))
    setThreads((prev) => {
      const next = { ...prev }
      delete next[date]
      return next
    })
  }

  return (
    <div className="feed-view">
      <p className="feed-eyebrow">모아보기</p>
      <h2 className="detail-heading">{member?.displayName}의 {DIARY_WORD}</h2>

      {loadingDates && <p className="feed-loading">불러오는 중...</p>}
      {!loadingDates && dates.length === 0 && (
        <p className="feed-empty">{member?.displayName}님이 아직 쓴 {DIARY_WORD}가 없어요.</p>
      )}

      <div className="feed-list">
        {member && visibleDates.map((date) => {
          const list = threads[date]
          if (!list || list === 'loading') {
            return <div className="card skeleton-card" key={date} />
          }
          if (list.length === 0) return null
          return (
            <EntryThread
              key={date}
              member={member}
              date={date}
              posts={list}
              showDate
              onAdded={(post) => setThreads((prev) => ({ ...prev, [date]: [...(prev[date] || []), post] }))}
              onRemoved={(postId) => {
                const rest = list.filter((p) => p.postId !== postId)
                if (rest.length === 0) removeDate(date)
                else setThreads((prev) => ({ ...prev, [date]: rest }))
              }}
            />
          )
        })}
      </div>

      {visibleCount < dates.length && (
        <button className="btn" onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}>
          더 보기
        </button>
      )}
    </div>
  )
}
