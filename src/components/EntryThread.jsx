import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { DIARY_WORD, THREAD_NEWEST_FIRST } from '../config.js'
import Avatar from './Avatar.jsx'
import EntryCard from './EntryCard.jsx'
import EntryEditor from './EntryEditor.jsx'

// 한 사람이 한 날짜에 쓴 글들을 스레드로 이어 붙여 보여줘요.
// posts: [{ postId, json, sha }] (먼저 쓴 글이 앞)
export default function EntryThread({ member, date, posts, showDate = false, onAdded, onRemoved }) {
  const auth = useAuth()
  const isMine = auth.currentMember?.id === member.id
  const [composing, setComposing] = useState(false)

  // 체크리스트는 그날 첫 글에만 붙여요.
  const headPostId = posts[0]?.postId
  const ordered = THREAD_NEWEST_FIRST ? [...posts].reverse() : posts
  const empty = posts.length === 0

  if (empty && !isMine) {
    return (
      <div className="card empty-slot">
        <Avatar member={member} />
        <p>{member.displayName}님이 아직 이 날의 {DIARY_WORD}를 쓰지 않았어요.</p>
      </div>
    )
  }

  const composer = (
    <div className="thread-composer">
      <EntryEditor
        date={date}
        memberId={member.id}
        initialEntry={null}
        initialSha={undefined}
        showChecklist={empty}
        onSaved={(entry, sha, postId) => {
          onAdded?.({ memberId: member.id, postId, json: entry, sha })
          setComposing(false)
        }}
        onCancel={empty ? undefined : () => setComposing(false)}
      />
    </div>
  )

  const showComposer = isMine && (empty || composing)

  return (
    <section className="entry-card card thread" style={{ '--author-color': member.color || 'var(--accent)' }}>
      <header className="entry-card-header">
        <div className="entry-card-who">
          <Avatar member={member} />
          <div>
            <div className="entry-card-name">{member.displayName}</div>
            {showDate && <div className="entry-card-date">{formatDate(date)}</div>}
          </div>
        </div>
        {posts.length > 1 && <span className="thread-count">{posts.length}개의 {DIARY_WORD}</span>}
      </header>

      {/* 이어서 쓰기 버튼과 작성칸은 항상 스레드 맨 위(이름 바로 아래)에 있어요 */}
      {isMine && !empty && !composing && (
        <button type="button" className="thread-add-btn" onClick={() => setComposing(true)}>
          + 이어서 쓰기
        </button>
      )}
      {showComposer && composer}

      {!empty && (
        <ol className="thread-list">
          {ordered.map((p) => (
            <li className="thread-item" key={p.postId}>
              <EntryCard
                entry={p.json}
                sha={p.sha}
                date={date}
                memberId={member.id}
                postId={p.postId}
                showChecklist={p.postId === headPostId}
                isLastOfMember={posts.length === 1}
                onDeleted={() => onRemoved?.(p.postId)}
              />
            </li>
          ))}
        </ol>
      )}

    </section>
  )
}

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-')
  return `${y}년 ${Number(m)}월 ${Number(d)}일`
}
