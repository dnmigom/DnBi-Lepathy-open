import React, { useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { removeCustomReaction, saveReactionLayout } from '../lib/dataModel.js'
import { reactionGroupsFrom } from '../lib/reactions.js'
import Icon from './Icon.jsx'

// 설정: 반응 그룹·순서 편집 + 커스텀 반응 삭제
// 이모티콘을 눌러 고른 뒤 아래 버튼으로 옮기거나, 따로 빼서 새 그룹을 만들거나, 그룹을 풀 수 있어요.
// 저장하면 모두의 '반응 추가' 창에 이 그룹·순서대로 보여요.
export default function ReactionLayoutEditor() {
  const auth = useAuth()
  const initial = useMemo(() => reactionGroupsFrom(auth.config), [auth.config])
  const [groups, setGroups] = useState(initial) // [[reaction, ...], ...]
  const [selected, setSelected] = useState(null) // reaction key
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  const pos = (() => {
    for (let g = 0; g < groups.length; g++) {
      const i = groups[g].findIndex((r) => r.key === selected)
      if (i !== -1) return { g, i }
    }
    return null
  })()
  const dirty = JSON.stringify(groups.map((g) => g.map((r) => r.key))) !== JSON.stringify(initial.map((g) => g.map((r) => r.key)))

  function update(fn) {
    setGroups((prev) => fn(prev.map((g) => [...g])).filter((g) => g.length > 0))
    setMessage(null)
  }

  // 같은 그룹 안에서 앞/뒤로
  function move(delta) {
    if (!pos) return
    update((gs) => {
      const g = gs[pos.g]
      const j = pos.i + delta
      if (j < 0 || j >= g.length) return gs
      ;[g[pos.i], g[j]] = [g[j], g[pos.i]]
      return gs
    })
  }
  // 위/아래 그룹으로 옮기기
  function moveGroup(delta) {
    if (!pos) return
    update((gs) => {
      const target = pos.g + delta
      if (target < 0 || target >= gs.length) return gs
      const [r] = gs[pos.g].splice(pos.i, 1)
      if (delta < 0) gs[target].push(r)
      else gs[target].unshift(r)
      return gs
    })
  }
  // 따로 빼서 바로 아래에 새 그룹 만들기
  function splitOut() {
    if (!pos) return
    update((gs) => {
      const [r] = gs[pos.g].splice(pos.i, 1)
      gs.splice(pos.g + 1, 0, [r])
      return gs
    })
  }
  // 그룹 풀기: 위 그룹과 합쳐요 (첫 그룹이면 아래 그룹과)
  function ungroup(g) {
    update((gs) => {
      if (gs.length < 2) return gs
      if (g === 0) { gs[1] = [...gs[0], ...gs[1]]; gs.splice(0, 1) } else { gs[g - 1].push(...gs[g]); gs.splice(g, 1) }
      return gs
    })
  }

  async function save() {
    setSaving(true)
    try {
      const updated = await saveReactionLayout(auth.client, auth.config, auth.configSha, groups.map((g) => g.map((r) => r.key)))
      auth.setConfig(updated)
      await auth.refreshConfig()
      setMessage('저장했어요.')
    } catch (e) {
      setMessage(e.message || '저장하지 못했어요.')
    } finally {
      setSaving(false)
    }
  }

  async function removeSelected() {
    const r = pos && groups[pos.g][pos.i]
    if (!r || !r.key.startsWith('custom:')) return
    if (!window.confirm(`"${r.label}" 반응을 삭제할까요? 이미 남긴 반응 기록에서는 사라지지 않고 표시가 깨질 수 있어요.`)) return
    setSaving(true)
    try {
      const updated = await removeCustomReaction(auth.client, auth.config, auth.configSha, r.key.slice('custom:'.length))
      auth.setConfig(updated)
      await auth.refreshConfig()
      update((gs) => gs.map((g) => g.filter((x) => x.key !== r.key)))
      setSelected(null)
    } finally {
      setSaving(false)
    }
  }

  const sel = pos && groups[pos.g][pos.i]

  return (
    <div className="reaction-layout">
      <p className="settings-repo-info">
        이모티콘을 눌러 고른 뒤 아래 버튼으로 순서를 바꾸거나 그룹을 옮겨요. 비슷한 것끼리 묶어두면 '반응 추가' 창에서 그 묶음대로 보여요.
      </p>
      <div className="reaction-layout-groups">
        {groups.map((g, gi) => (
          <div key={gi} className="reaction-layout-group">
            <div className="reaction-layout-items">
              {g.map((r) => (
                <button
                  key={r.key} type="button" title={r.label}
                  className={`reaction-layout-item ${selected === r.key ? 'selected' : ''}`}
                  onClick={() => setSelected((cur) => (cur === r.key ? null : r.key))}
                >
                  {r.type === 'image' ? <img src={r.value} alt={r.label} /> : r.value}
                </button>
              ))}
            </div>
            {groups.length > 1 && (
              <button type="button" className="reaction-layout-ungroup" onClick={() => ungroup(gi)}>
                그룹 풀기
              </button>
            )}
          </div>
        ))}
      </div>

      <div className={`reaction-layout-tools ${sel ? '' : 'disabled'}`}>
        <span className="reaction-layout-picked">
          {sel ? <>고른 반응: {sel.type === 'image' ? <img src={sel.value} alt={sel.label} /> : sel.value} {sel.label}</> : '이모티콘을 먼저 눌러 고르세요'}
        </span>
        <div className="reaction-layout-buttons">
          <button type="button" className="btn btn-small" disabled={!sel || pos.i === 0} onClick={() => move(-1)}>◀ 앞으로</button>
          <button type="button" className="btn btn-small" disabled={!sel || pos.i === groups[pos.g].length - 1} onClick={() => move(1)}>뒤로 ▶</button>
          <button type="button" className="btn btn-small" disabled={!sel || pos.g === 0} onClick={() => moveGroup(-1)}>▲ 위 그룹으로</button>
          <button type="button" className="btn btn-small" disabled={!sel || pos.g === groups.length - 1} onClick={() => moveGroup(1)}>▼ 아래 그룹으로</button>
          <button type="button" className="btn btn-small" disabled={!sel || groups[pos.g].length < 2} onClick={splitOut}>따로 빼서 새 그룹</button>
          {sel?.key.startsWith('custom:') && (
            <button
              type="button" className="btn btn-small btn-danger icon-btn" disabled={saving} onClick={removeSelected}
              title="이 반응 삭제" aria-label="이 반응 삭제"
            >
              <Icon name="delete" />
            </button>
          )}
        </div>
      </div>

      <div className="entry-editor-actions">
        {message && <span className="settings-repo-info">{message}</span>}
        <button type="button" className="btn btn-ghost" disabled={!dirty || saving} onClick={() => { setGroups(initial); setSelected(null) }}>되돌리기</button>
        <button type="button" className="btn btn-primary" disabled={!dirty || saving} onClick={save}>
          {saving ? '저장 중...' : '그룹·순서 저장'}
        </button>
      </div>
    </div>
  )
}
