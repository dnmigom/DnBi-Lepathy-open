import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { removeCustomReaction, saveReactionLayout } from '../lib/dataModel.js'
import { reactionGroupsFrom } from '../lib/reactions.js'
import Icon from './Icon.jsx'

// 설정: 반응 그룹 · 순서
// 반응을 꾹 눌러서(마우스는 눌러서 끌기) 원하는 자리로 옮겨요. 다른 그룹으로도 바로 옮길 수 있어요.
// '새 반응 그룹'으로 빈 그룹을 만들고 그 안으로 끌어다 놓으면 돼요. 비어 있는 그룹은 저장할 때 사라져요.
// 직접 추가한 반응은 아래 휴지통으로 끌어다 놓으면 삭제돼요.
const LONG_PRESS_MS = 280 // 터치: 이만큼 꾹 누르면 옮기기 시작 (그 전에 움직이면 그냥 스크롤)
const MOUSE_START_PX = 4 // 마우스: 이만큼 움직이면 옮기기 시작
const TOUCH_CANCEL_PX = 8

export default function ReactionLayoutEditor() {
  const auth = useAuth()
  const initial = useMemo(() => reactionGroupsFrom(auth.config), [auth.config])
  const [groups, setGroups] = useState(initial) // [[reaction, ...], ...]  (빈 그룹도 편집 중엔 유지)
  const [dragKey, setDragKey] = useState(null)
  const [overTrash, setOverTrash] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)
  const groupsRef = useRef(groups)
  groupsRef.current = groups
  const drag = useRef(null) // { key, x, y, active, timer, pointerType }

  const keysOf = (gs) => gs.filter((g) => g.length).map((g) => g.map((r) => r.key))
  const dirty = JSON.stringify(keysOf(groups)) !== JSON.stringify(keysOf(initial))
  const dragItem = groups.flat().find((r) => r.key === dragKey)

  // 손가락/마우스 아래에 있는 자리로 반응을 옮겨요 (옮기는 동안 바로바로 순서가 바뀌어 보여요)
  function moveTo(x, y) {
    const el = document.elementFromPoint(x, y)
    if (!el) return
    const trash = !!el.closest('[data-reaction-trash]')
    setOverTrash(trash)
    if (trash) return
    const groupEl = el.closest('[data-reaction-group]')
    if (!groupEl) return
    const gi = Number(groupEl.dataset.reactionGroup)
    const itemEl = el.closest('[data-reaction-key]')
    const key = drag.current.key
    if (itemEl && itemEl.dataset.reactionKey === key) return
    setGroups((prev) => {
      const gs = prev.map((g) => g.filter((r) => r.key !== key))
      const moving = prev.flat().find((r) => r.key === key)
      if (!moving || !gs[gi]) return prev
      let idx = gs[gi].length
      if (itemEl) {
        const rect = itemEl.getBoundingClientRect()
        const at = gs[gi].findIndex((r) => r.key === itemEl.dataset.reactionKey)
        idx = at + (x > rect.left + rect.width / 2 ? 1 : 0)
      }
      gs[gi].splice(idx, 0, moving)
      // 바뀐 게 없으면 그대로 (불필요한 다시 그리기 방지)
      return JSON.stringify(gs.map((g) => g.map((r) => r.key))) === JSON.stringify(prev.map((g) => g.map((r) => r.key))) ? prev : gs
    })
  }

  function startDrag() {
    drag.current.active = true
    setDragKey(drag.current.key)
    setMessage(null)
    document.body.classList.add('reaction-dragging')
    if (drag.current.pointerType === 'touch') navigator.vibrate?.(15)
  }

  async function endDrag() {
    const d = drag.current
    drag.current = null
    document.body.classList.remove('reaction-dragging')
    if (d?.timer) clearTimeout(d.timer)
    const wasTrash = overTrash
    setDragKey(null)
    setOverTrash(false)
    if (d?.active && wasTrash) await removeReaction(d.key)
  }

  // 전역 이벤트: 끄는 동안 손가락/마우스를 따라가요
  useEffect(() => {
    function onMouseMove(e) {
      const d = drag.current
      if (!d || d.pointerType !== 'mouse') return
      if (!d.active && Math.hypot(e.clientX - d.x, e.clientY - d.y) > MOUSE_START_PX) startDrag()
      if (drag.current?.active) moveTo(e.clientX, e.clientY)
    }
    function onTouchMove(e) {
      const d = drag.current
      if (!d || d.pointerType !== 'touch') return
      const t = e.touches[0]
      if (!d.active) {
        // 꾹 누르기 전에 움직이면 스크롤로 보고 취소
        if (Math.hypot(t.clientX - d.x, t.clientY - d.y) > TOUCH_CANCEL_PX) { clearTimeout(d.timer); drag.current = null }
        return
      }
      e.preventDefault() // 옮기는 중에는 화면이 스크롤되지 않게
      moveTo(t.clientX, t.clientY)
    }
    function onUp() { if (drag.current) endDrag() }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onUp)
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('touchend', onUp)
    window.addEventListener('touchcancel', onUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onUp)
      window.removeEventListener('touchcancel', onUp)
      document.body.classList.remove('reaction-dragging')
    }
  })

  function onMouseDown(e, key) {
    if (e.button !== 0) return
    e.preventDefault()
    drag.current = { key, x: e.clientX, y: e.clientY, active: false, pointerType: 'mouse' }
  }

  function onTouchStart(e, key) {
    const t = e.touches[0]
    drag.current = { key, x: t.clientX, y: t.clientY, active: false, pointerType: 'touch' }
    drag.current.timer = setTimeout(() => { if (drag.current?.key === key) startDrag() }, LONG_PRESS_MS)
  }

  function addGroup() {
    setGroups((prev) => [...prev, []])
    setMessage(null)
  }

  async function removeReaction(key) {
    const r = groupsRef.current.flat().find((x) => x.key === key)
    if (!r || !key.startsWith('custom:')) {
      setMessage('기본 반응은 삭제할 수 없어요. 직접 추가한 반응만 삭제돼요.')
      return
    }
    if (!window.confirm(`"${r.label}" 반응을 삭제할까요? 이미 남긴 반응 기록에서는 표시가 깨질 수 있어요.`)) return
    setSaving(true)
    try {
      const updated = await removeCustomReaction(auth.client, auth.config, auth.configSha, key.slice('custom:'.length))
      auth.setConfig(updated)
      await auth.refreshConfig()
      setGroups((prev) => prev.map((g) => g.filter((x) => x.key !== key)))
    } catch (e) {
      setMessage(e.message || '삭제하지 못했어요.')
    } finally {
      setSaving(false)
    }
  }

  async function save() {
    setSaving(true)
    try {
      const layout = keysOf(groups)
      const updated = await saveReactionLayout(auth.client, auth.config, auth.configSha, layout)
      auth.setConfig(updated)
      await auth.refreshConfig()
      setGroups((prev) => prev.filter((g) => g.length))
      setMessage('저장했어요.')
    } catch (e) {
      setMessage(e.message || '저장하지 못했어요.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="reaction-layout">
      <p className="settings-repo-info">
        반응을 꾹 누르면 순서 변경이 가능합니다. 새 반응 그룹을 만들면 원하는 반응끼리 묶을 수 있습니다.
      </p>

      <div className="reaction-layout-groups">
        {groups.map((g, gi) => (
          <div key={gi} className={`reaction-layout-group ${g.length === 0 ? 'empty' : ''}`} data-reaction-group={gi}>
            {g.length === 0 && <span className="reaction-layout-empty">여기로 끌어다 놓으세요</span>}
            {g.map((r) => (
              <div
                key={r.key}
                role="button"
                tabIndex={-1}
                title={r.label}
                data-reaction-key={r.key}
                className={`reaction-layout-item ${dragKey === r.key ? 'dragging' : ''}`}
                onMouseDown={(e) => onMouseDown(e, r.key)}
                onTouchStart={(e) => onTouchStart(e, r.key)}
                onContextMenu={(e) => e.preventDefault()}
              >
                {r.type === 'image' ? <img src={r.value} alt={r.label} draggable={false} /> : r.value}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* 끄는 중에만 보이는 휴지통: 직접 추가한 반응을 여기 놓으면 삭제 */}
      {dragItem && (
        <div className={`reaction-layout-trash ${overTrash ? 'over' : ''}`} data-reaction-trash>
          <Icon name="delete" inherit />
          {dragItem.key.startsWith('custom:') ? '여기에 놓으면 삭제' : '기본 반응은 삭제할 수 없어요'}
        </div>
      )}

      <div className="entry-editor-actions reaction-layout-actions">
        <button type="button" className="btn" onClick={addGroup} disabled={saving}>새 반응 그룹</button>
        {message && <span className="settings-repo-info">{message}</span>}
        <button type="button" className="btn btn-primary" disabled={!dirty || saving} onClick={save}>
          {saving ? '저장 중...' : '그룹 · 순서 저장'}
        </button>
      </div>
    </div>
  )
}
