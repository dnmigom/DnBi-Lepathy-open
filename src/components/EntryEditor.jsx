import React, { useRef, useState } from 'react'
import { emptyEntry, getChecklistFields, imagePath, makePostId, saveEntry } from '../lib/dataModel.js'
import { resizeImageFile } from '../lib/image.js'
import { useAuth } from '../context/AuthContext.jsx'
import { DIARY_WORD } from '../config.js'
import RemoteImage from './RemoteImage.jsx'
import HashtagInput from './HashtagInput.jsx'
import Icon from './Icon.jsx'

function hasAnyContent(content, checklist, moodTags, imageCount, showChecklist) {
  const anyChecked = showChecklist && Object.entries(checklist).some(([key, value]) => key !== 'sleepHours' && value)
  return !!content.trim()
    || anyChecked
    || (showChecklist && checklist.sleepHours !== '')
    || moodTags.length > 0
    || imageCount > 0
}

// postId가 없으면 새 글을 만들어요. showChecklist=false면 체크리스트 칸을 숨겨요
// (체크리스트는 하루에 한 번만 쓰면 되니까 그날 첫 글에만 보여줘요).
export default function EntryEditor({
  date, memberId, postId = null, initialEntry, initialSha, showChecklist = true, onSaved, onCancel,
}) {
  const auth = useAuth()
  const base = initialEntry || emptyEntry(date, memberId)
  const fields = getChecklistFields(auth.members.find((m) => m.id === memberId))
  const [content, setContent] = useState(base.content || '')
  const [moodTags, setMoodTags] = useState(base.moodTags || [])
  const [checklist, setChecklist] = useState(() => {
    const initial = { sleepHours: base.checklist?.sleepHours ?? '' }
    fields.forEach((f) => { initial[f.key] = !!base.checklist?.[f.key] })
    return initial
  })
  const [existingImages, setExistingImages] = useState(base.images || (base.image ? [base.image] : []))
  const [newImages, setNewImages] = useState([]) // { file, preview }
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const fileInputRef = useRef(null)

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
        checklist: {
          ...checklist,
          sleepHours: checklist.sleepHours === '' ? null : Number(checklist.sleepHours),
        },
      }
      delete entryData.image // 예전 단일 이미지 필드는 정리
      delete entryData.mood // 예전 이모지 기분 필드는 정리
      if (!showChecklist) entryData.checklist = base.checklist || { sleepHours: null }
      const targetPostId = postId || makePostId()
      const { entry, sha } = await saveEntry(auth.client, date, memberId, targetPostId, entryData, initialSha)
      onSaved(entry, sha, targetPostId)
    } catch (err) {
      setError(err.message || '저장에 실패했어요.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="entry-editor" onSubmit={handleSubmit}>
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
        <label className="sleep-input">
          <span>수면</span>
          <input
            type="number" min="0" max="24" step="0.5"
            placeholder="시간"
            value={checklist.sleepHours}
            onChange={(e) => setChecklist((prev) => ({ ...prev, sleepHours: e.target.value }))}
          />
          <span>시간</span>
        </label>
      </div>}

      {error && <p className="setup-error">{error}</p>}

      <div className="entry-editor-actions">
        {onCancel && <button type="button" className="btn btn-ghost" onClick={onCancel}>취소</button>}
        <button type="submit" className="btn btn-primary" disabled={saving || !hasAnyContent(content, checklist, moodTags, existingImages.length + newImages.length, showChecklist)}>
          {saving ? '저장하는 중...' : '저장하기'}
        </button>
      </div>
    </form>
  )
}
