import React, { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useApp } from '../context/AppContext.jsx'
import { todayStr } from '../lib/dataModel.js'
import { useFoldState } from '../lib/foldState.js'
import { DEFAULT_REPLIES_OPEN, DIARY_WORD, THREAD_NEWEST_FIRST } from '../config.js'
import Avatar from './Avatar.jsx'
import { memberThemeStyle } from '../lib/theme.js'
import EntryCard from './EntryCard.jsx'
import EntryEditor from './EntryEditor.jsx'
import Icon from './Icon.jsx'

// 한 사람이 한 날짜에 쓴 일기들.
//  - 일기 하나마다 하얀 상자가 하나씩 생겨요.
//  - 각 일기 아래에 '타래'(하위 일기, parentId로 연결)를 이어 달 수 있어요.
//    타래는 그 일기의 상자 안에 한 묶음으로 붙고, 따로 접고 펼칠 수 있어요.
//    (위 일기의 댓글은 위 일기에 붙어 있어서 타래를 접어도 영향 없어요)
// posts: [{ postId, json, sha }] (먼저 쓴 글이 앞)
// allowCompose=false면 새 글·타래 쓰기를 숨겨요 (태그 모아보기처럼 일부 글만 보여줄 때).
// headPostId: 그날 첫 글 id (일부 글만 넘길 때 체크리스트를 올바른 글에 붙이기 위해)
export default function EntryThread({
  member, date, posts, showDate = false, allowCompose = true, headPostId: headOverride, onAdded, onRemoved,
}) {
  const auth = useAuth()
  const isMine = auth.currentMember?.id === member.id && allowCompose
  const [composing, setComposing] = useState(false)
  const app = useApp()

  // 인용 버튼을 누르면 오늘 날짜의 내 칸에 새 글 작성칸이 자동으로 열려요.
  const quoteCount = app?.quoteDraft?.length || 0
  useEffect(() => {
    if (isMine && quoteCount > 0 && date === todayStr()) setComposing(true)
  }, [isMine, quoteCount, date])

  // 위 일기(루트)와 그 아래 타래로 나누기. 위 일기가 지워진 타래는 혼자 상자가 돼요.
  const ids = new Set(posts.map((p) => p.postId))
  const roots = posts.filter((p) => !p.json.parentId || !ids.has(p.json.parentId))
  const repliesOf = (rootId) => posts.filter((p) => p.json.parentId === rootId && p.postId !== rootId)

  // 체크리스트는 그날 첫 일기에만 붙여요.
  const headPostId = headOverride || roots[0]?.postId
  const orderedRoots = THREAD_NEWEST_FIRST ? [...roots].reverse() : roots
  const empty = posts.length === 0

  if (empty && !isMine) {
    return (
      <div className="card empty-slot member-theme" style={memberThemeStyle(member)}>
        <Avatar member={member} />
        <p>{member.displayName}님이 아직 이 날의 {DIARY_WORD}를 쓰지 않았어요.</p>
      </div>
    )
  }

  const showComposer = isMine && (empty || composing)

  return (
    <div className="day-posts member-theme" style={memberThemeStyle(member)}>
      {/* 새 일기 쓰기: 항상 맨 위 */}
      {isMine && !empty && !composing && (
        <button type="button" className="thread-add-btn" onClick={() => setComposing(true)}>
          + 새 {DIARY_WORD}
        </button>
      )}
      {showComposer && (
        <section className="card post-box">
          <BoxHeader member={member} date={date} showDate={showDate} />
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
        </section>
      )}

      {orderedRoots.map((root) => (
        <PostBox
          key={root.postId}
          member={member}
          date={date}
          showDate={showDate}
          root={root}
          replies={repliesOf(root.postId)}
          canReply={isMine}
          headPostId={headPostId}
          totalPosts={posts.length}
          onAdded={onAdded}
          onRemoved={onRemoved}
        />
      ))}
    </div>
  )
}

function BoxHeader({ member, date, showDate, extra }) {
  return (
    <header className="entry-card-header">
      <div className="entry-card-who">
        <Avatar member={member} />
        <div>
          <div className="entry-card-name">{member.displayName}</div>
          {showDate && <div className="entry-card-date">{formatDate(date)}</div>}
        </div>
      </div>
      {extra}
    </header>
  )
}

// 일기 하나 = 하얀 상자 하나. 아래에 타래가 한 묶음으로 붙어요.
function PostBox({ member, date, showDate, root, replies, canReply, headPostId, totalPosts, onAdded, onRemoved }) {
  const auth = useAuth()
  const [replying, setReplying] = useState(false)
  const foldKey = `${auth.session?.owner}/${auth.session?.repo}:${date}:${member.id}:${root.postId}:replies`
  const [open, toggle, setOpen] = useFoldState(foldKey, DEFAULT_REPLIES_OPEN)
  const app = useApp()

  // 알림·검색 등으로 이 상자의 타래 글로 이동해 오면 타래를 펼쳐요.
  const focus = app?.focus
  useEffect(() => {
    if (focus && focus.date === date && focus.memberId === member.id && replies.some((r) => r.postId === focus.postId)) {
      setOpen(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus])

  const card = (p, isHead) => (
    <EntryCard
      entry={p.json}
      sha={p.sha}
      date={date}
      memberId={member.id}
      postId={p.postId}
      showChecklist={isHead && p.postId === headPostId}
      isLastOfMember={totalPosts === 1}
      onDeleted={() => onRemoved?.(p.postId)}
    />
  )

  return (
    <section className="card entry-card post-box">
      <BoxHeader
        member={member} date={date} showDate={showDate}
        extra={replies.length > 0 && <span className="thread-count">타래 {replies.length}</span>}
      />

      {card(root, true)}

      {(replies.length > 0 || canReply) && (
        <div className="replies">
          {replies.length > 0 && (
            <button type="button" className="replies-toggle" onClick={toggle} aria-expanded={open}>
              {open ? <>타래 접기 <Icon name="sortUp" inherit className="caret-up" /></> : <>타래 {replies.length}개 펼치기 <Icon name="sortDown" inherit className="caret-down" /></>}
            </button>
          )}
          {open && replies.length > 0 && (
            <ol className="thread-list">
              {replies.map((p) => (
                <li className="thread-item" key={p.postId}>{card(p, false)}</li>
              ))}
            </ol>
          )}
          {canReply && !replying && (
            <button type="button" className="reply-add-btn" onClick={() => { setReplying(true); setOpen(true) }}>
              + 이어서 쓰기
            </button>
          )}
          {canReply && replying && (
            <div className="reply-composer">
              <EntryEditor
                date={date}
                memberId={member.id}
                parentId={root.postId}
                initialEntry={null}
                initialSha={undefined}
                showChecklist={false}
                placeholder="이 일기에 이어서 쓰기"
                onSaved={(entry, sha, postId) => {
                  onAdded?.({ memberId: member.id, postId, json: entry, sha })
                  setReplying(false)
                }}
                onCancel={() => setReplying(false)}
              />
            </div>
          )}
        </div>
      )}
    </section>
  )
}

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-')
  return `${y}년 ${Number(m)}월 ${Number(d)}일`
}
