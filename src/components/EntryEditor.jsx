import React, { useEffect, useRef, useState } from 'react'
import { emptyEntry, getChecklistFields, imagePath, makePostId, saveEntry } from '../lib/dataModel.js'
import { resizeImageFile } from '../lib/image.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useApp } from '../context/AppContext.jsx'
import { targetKey } from '../lib/userState.js'
import QuoteBox from './QuoteBox.jsx'
import { DIARY_WORD } from '../config.js'
import RemoteImage from './RemoteImage.jsx'
import HashtagInput from './HashtagInput.jsx'
import Icon from './Icon.jsx'

function hasAnyContent(content, checklist, moodTags, imageCount, showChecklist, quoteCount) {
  const anyChecked = showChecklist && Object.values(checklist).some(Boolean)
  return !!content.trim()
    || anyChecked
    || moodTags.length > 0
    || imageCount > 0
    || quoteCount > 0
}

// postId가 없으면 새 글을 만들어요. showChecklist=false면 체크리스트 칸을 숨겨요
// (체크리스트는 하루에 한 번만 쓰면 되니까 그날 첫 글에만 보여줘요).
export default function EntryEditor({
  date, memberId, postId = null, initialEntry, initialSha, showChecklist = true, onSaved, onCancel,
}) {
  const auth = useAuth()
  const app = useApp()
  const isNew = !postId
  const base = initialEntry || emptyEntry(date, memberId)
  const fields = getChecklistFields(auth.members.find((m) => m.id === memberId))
  const [content, setContent] = useState(base.content || '')
  const [moodTags, setMoodTags] = useState(base.moodTags || [])
  const [checklist, setChecklist] = useState(() => {
    const initial = {}
    fields.forEach((f) => { initial[f.key] = !!base.checklist?.[f.key] })
    return initial
  })
  const [existingImages, setExistingImages] = useState(base.images || (base.image ? [base.image] : []))
  const [newImages, setNewImages] = useState([]) // { file, preview }
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const fileInputRef = useRef(null)
  const formRef = useRef(null)

  // 인용: 새 글이면 인용 버튼으로 고른 것들(app.quoteDraft), 수정 중이면 그 글에 이미 들어 있던 인용
  const [savedQuotes, setSavedQuotes] = useState(base.quotes || [])
  const quotes = isNew ? (app?.quoteDraft || []) : savedQuotes
  function removeQuote(q) {
    const key = q.key || targetKey(q)
    if (isNew) app.removeQuote(key)
    else setSavedQuotes((prev) => prev.filter((x) => (x.key || targetKey(x)) !== key))
  }

  // 인용 버튼을 눌러서 열린 작성칸이면 화면을 작성칸으로 옮겨줘요.
  const quoteCount = isNew ? quotes.length : 0
  useEffect(() => {
    if (quoteCount > 0) formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [quoteCount])

  function toggle(key) {
    setChecklist((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  function handleFiles(e) {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    setNewImages((prev) => [...prev, ...files.map((file) => ({ file, preview: URL.createObjectURL(file) }))])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function removeExisting(path) {
    setExistingImages((prev) => prev.filter((p) => p !== path))
  }

  function removeNew(index) {
    setNewImages((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const uploadedPaths = []
      for (const img of newImages) {
        const { base64, extension } = await resizeImageFile(img.file)
        const path = imagePath(date, memberId, `entry.${extension}`)
        await auth.client.putBase64File(path, base64, { message: `${DIARY_WORD} 이미지 (${date})` })
        uploadedPaths.push(path)
      }
      const entryData = {
        ...base,
        content: content.trim(),
        moodTags,
        images: [...existingImages, ...uploadedPaths],
        quotes: quotes.map((q) => ({ ...q, key: q.key || targetKey(q) })),
        checklist: { ...checklist },
      }
      if (entryData.quotes.length === 0) delete entryData.quotes
      delete entryData.image // 예전 단일 이미지 필드는 정리
      delete entryData.mood // 예전 이모지 기분 필드는 정리
      if (!showChecklist) entryData.checklist = { ...(base.checklist || {}) }
      delete entryData.checklist.sleepHours // 수면 시간 기능은 삭제됨 (예전 기록도 저장할 때 정리)
      const targetPostId = postId || makePostId()
      const { entry, sha } = await saveEntry(auth.client, date, memberId, targetPostId, entryData, initialSha)
      if (isNew) app?.clearQuotes()
      onSaved(entry, sha, targetPostId)
    } catch (err) {
      setError(err.message || '저장에 실패했어요.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="entry-editor" onSubmit={handleSubmit} ref={formRef}>
      <div className="mood-row">
        <span className="mood-row-label">오늘 기분</span>
        <HashtagInput value={moodTags} onChange={setMoodTags} placeholder="#피곤 #설렘 처럼 적어보세요" />
      </div>

      <textarea
        className="entry-textarea"
        rows={6}
        placeholder="오늘 하루는 어땠나요?"
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />

      {quotes.length > 0 && (
        <div className="quote-list">
          {quotes.map((q) => (
            <QuoteBox key={q.key || targetKey(q)} quote={q} onRemove={() => removeQuote(q)} />
          ))}
        </div>
      )}

      <div className="image-upload-row">
        <label className="attach-btn icon-btn" title="사진 추가" aria-label="사진 추가">
          <Icon name="photo" />
          <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFiles} hidden />
        </label>
        {(existingImages.length > 0 || newImages.length > 0) && (
          <div className="image-preview-grid">
            {existingImages.map((path) => (
              <div className="image-preview-item" key={path}>
                <RemoteImage path={path} className="image-preview-thumb" />
                <button type="button" className="remove-preview" onClick={() => removeExisting(path)}>✕</button>
              </div>
            ))}
            {newImages.map((img, i) => (
              <div className="image-preview-item" key={i}>
                <img src={img.preview} alt="첨부 미리보기" className="image-preview-thumb" />
                <button type="button" className="remove-preview" onClick={() => removeNew(i)}>✕</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {showChecklist && <div className="checklist-row">
        {fields.map((f) => (
          <button
            type="button"
            key={f.key}
            className={`chip toggle ${checklist[f.key] ? 'active' : ''}`}
            onClick={() => toggle(f.key)}
          >
            <span>{f.icon}</span> {f.label}
          </button>
        ))}
      </div>}

      {error && <p className="setup-error">{error}</p>}

      <div className="entry-editor-actions">
        {onCancel && (
          <button
            type="button" className="btn btn-ghost"
            onClick={() => { if (isNew) app?.clearQuotes(); onCancel() }}
          >취소</button>
        )}
        <button type="submit" className="btn btn-primary" disabled={saving || !hasAnyContent(content, checklist, moodTags, existingImages.length + newImages.length, showChecklist, quotes.length)}>
          {saving ? '저장하는 중...' : '저장하기'}
        </button>
      </div>
    </form>
  )
}
