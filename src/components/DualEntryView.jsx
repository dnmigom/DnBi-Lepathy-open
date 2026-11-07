import React, { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { listPosts } from '../lib/dataModel.js'
import EntryThread from './EntryThread.jsx'

export default function DualEntryView({ date, onChanged }) {
  const auth = useAuth()
  const [posts, setPosts] = useState(undefined) // undefined = 불러오는 중, [] = 없음
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setPosts(undefined)
    setError(null)
    listPosts(auth.client, date)
      .then((list) => { if (!cancelled) setPosts(list) })
      .catch((e) => { if (!cancelled) { setPosts([]); setError(e.message || '불러오지 못했어요.') } })
    return () => { cancelled = true }
  }, [date, auth.members.length])

  return (
    <div className="dual-view">
      {error && <p className="setup-error">{error}</p>}
      {auth.members.map((m) => (
        <div className="dual-column" key={m.id}>
          {posts === undefined ? (
            <div className="card skeleton-card" />
          ) : (
            <EntryThread
              member={m}
              date={date}
              posts={posts.filter((p) => p.memberId === m.id)}
              onAdded={(post) => {
                setPosts((prev) => [...(prev || []), post])
                onChanged?.()
              }}
              onRemoved={(postId) => {
                setPosts((prev) => (prev || []).filter((p) => !(p.memberId === m.id && p.postId === postId)))
                onChanged?.()
              }}
            />
          )}
        </div>
      ))}
    </div>
  )
}
