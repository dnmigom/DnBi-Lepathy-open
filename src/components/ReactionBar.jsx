import React, { useEffect, useRef, useState } from 'react'
import { addCustomReaction, makeCommentId } from '../lib/dataModel.js'
import { allReactionsFrom, reactionGroupsFrom } from '../lib/reactions.js'
import { resizeStickerToDataUrl } from '../lib/image.js'
import { useAuth } from '../context/AuthContext.jsx'
import Icon from './Icon.jsx'

export default function ReactionBar({ entry, onToggle }) {
  const auth = useAuth()
  const myId = auth.currentMember?.id
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(null) // { file, preview, name } - 이미지로 만들기
  const [emojiDraft, setEmojiDraft] = useState(null) // { value, name } - 이모지로 만들기
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState(null)
  const wrapRef = useRef(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    function handleOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false)
        setPending(null)
        setEmojiDraft(null)
        setUploadError(null)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  const allReactions = allReactionsFrom(auth.config)
  // 반응 선택창은 설정에서 정한 그룹·순서대로 보여요 (삭제는 설정에서만)
  const groups = reactionGroupsFrom(auth.config)

  function namesFor(key) {
    const ids = entry.reactions?.[key] || []
    return ids
      .map((id) => auth.members.find((m) => m.id === id)?.displayName || id)
      .join(', ')
  }

  const activeReactions = allReactions.filter((r) => (entry.reactions?.[r.key]?.length || 0) > 0)

  function handleFilePicked(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setPending({ file, preview: URL.createObjectURL(file), name: '' })
    setUploadError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleConfirmSticker(e) {
    e.preventDefault()
    if (!pending) return
    setUploading(true)
    setUploadError(null)
    try {
      const image = await resizeStickerToDataUrl(pending.file, 64)
      const reaction = { id: makeCommentId(), name: pending.name.trim() || '반응', image }
      const updated = await addCustomReaction(auth.client, auth.config, auth.configSha, reaction)
      auth.setConfig(updated)
      await auth.refreshConfig()
      onToggle(`custom:${reaction.id}`)
      setPending(null)
      setOpen(false)
    } catch (err) {
      setUploadError(err.message || '반응을 추가하지 못했어요.')
    } finally {
      setUploading(false)
    }
  }

  async function handleConfirmEmoji(e) {
    e.preventDefault()
    if (!emojiDraft) return
    const value = emojiDraft.value.trim()
    if (!value) return
    setUploading(true)
    setUploadError(null)
    try {
      const reaction = { id: makeCommentId(), name: emojiDraft.name.trim() || value, emoji: value }
      const updated = await addCustomReaction(auth.client, auth.config, auth.configSha, reaction)
      auth.setConfig(updated)
      await auth.refreshConfig()
      onToggle(`custom:${reaction.id}`)
      setEmojiDraft(null)
      setOpen(false)
    } catch (err) {
      setUploadError(err.message || '반응을 추가하지 못했어요.')
    } finally {
      setUploading(false)
    }
  }

  const showingForm = pending || emojiDraft

  return (
    <div className="reaction-bar">
      {activeReactions.map((r) => {
        const mine = entry.reactions?.[r.key]?.includes(myId)
        return (
          <button
            key={r.key}
            className={`reaction-btn ${mine ? 'active' : ''}`}
            onClick={() => onToggle(r.key)}
            title={`${r.label} · ${namesFor(r.key)}`}
          >
            {r.type === 'image' ? <img src={r.value} alt={r.label} className="reaction-img" /> : <span>{r.value}</span>}
          </button>
        )
      })}

      <div className="reaction-add-wrap" ref={wrapRef}>
        <button
          type="button" className="reaction-add-btn icon-only" onClick={() => setOpen((v) => !v)}
          title="반응 추가" aria-label="반응 추가"
        >
          <Icon name="plus" />
        </button>
        {open && (
          <div className="reaction-picker">
            {!showingForm ? (
              <>
                {/* 반응 목록: 5줄이 넘으면 이 안에서만 스크롤돼요 */}
                <div className="reaction-picker-list">
                {groups.map((group, gi) => (
                  <div key={gi} className="reaction-picker-grid">
                    {group.map((r) => (
                      <button
                        key={r.key}
                        type="button"
                        className="reaction-picker-item"
                        title={r.label}
                        onClick={() => { onToggle(r.key); setOpen(false) }}
                      >
                        {r.type === 'image' ? <img src={r.value} alt={r.label} /> : r.value}
                      </button>
                    ))}
                  </div>
                ))}
                </div>
                <label className="reaction-upload-btn">
                  + 이미지로 새 반응 만들기
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFilePicked} hidden />
                </label>
                <button
                  type="button" className="reaction-upload-btn"
                  onClick={() => setEmojiDraft({ value: '', name: '' })}
                >
                  + 이모지로 새 반응 만들기
                </button>
              </>
            ) : pending ? (
              <form className="reaction-sticker-form" onSubmit={handleConfirmSticker}>
                <img src={pending.preview} alt="새 반응 미리보기" className="reaction-sticker-preview" />
                <input
                  type="text" placeholder="반응 이름 (예: 최고)" value={pending.name}
                  onChange={(e) => setPending((p) => ({ ...p, name: e.target.value }))}
                  autoFocus
                />
                {uploadError && <p className="setup-error">{uploadError}</p>}
                <div className="reaction-sticker-actions">
                  <button type="button" className="btn btn-ghost btn-small" onClick={() => setPending(null)}>취소</button>
                  <button type="submit" className="btn btn-primary btn-small" disabled={uploading}>
                    {uploading ? '추가 중...' : '추가'}
                  </button>
                </div>
              </form>
            ) : (
              <form className="reaction-sticker-form" onSubmit={handleConfirmEmoji}>
                <input
                  type="text" placeholder="이모지 붙여넣기" value={emojiDraft.value} maxLength={8}
                  className="reaction-emoji-input"
                  onChange={(e) => setEmojiDraft((p) => ({ ...p, value: e.target.value }))}
                  autoFocus
                />
                <input
                  type="text" placeholder="반응 이름 (예: 최고)" value={emojiDraft.name}
                  onChange={(e) => setEmojiDraft((p) => ({ ...p, name: e.target.value }))}
                />
                {uploadError && <p className="setup-error">{uploadError}</p>}
                <div className="reaction-sticker-actions">
                  <button type="button" className="btn btn-ghost btn-small" onClick={() => setEmojiDraft(null)}>취소</button>
                  <button type="submit" className="btn btn-primary btn-small" disabled={uploading || !emojiDraft.value.trim()}>
                    {uploading ? '추가 중...' : '추가'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
