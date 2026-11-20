import React, { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { addMember, removeMember, updateMember } from '../lib/dataModel.js'
import { DIARY_WORD } from '../config.js'
import { ColorPicker, BG_PALETTE } from './Setup.jsx'
import AvatarPicker from './AvatarPicker.jsx'
import Icon from './Icon.jsx'
import ReactionLayoutEditor from './ReactionLayoutEditor.jsx'
import Avatar from './Avatar.jsx'

export default function SettingsModal({ onClose }) {
  const auth = useAuth()
  const [color, setColor] = useState(auth.currentMember?.color)
  const [bgColor, setBgColor] = useState(auth.currentMember?.bgColor || BG_PALETTE[0])
  const [avatar, setAvatar] = useState(auth.currentMember?.avatar || null)
  // 모두의 일기에서 맨 앞(PC 왼쪽, 모바일 위)에 보일 사람. 사람마다 따로 저장돼요.
  const savedFrontId = auth.currentMember?.frontMemberId || ''
  const [frontMemberId, setFrontMemberId] = useState(savedFrontId)
  // 글씨 크기(%) — 프로필에 저장돼서 다른 기기에서도 그대로예요. 고르는 즉시 미리 보여주고, 저장 안 하고 닫으면 되돌려요.
  const savedFontScale = auth.currentMember?.fontScale || 100
  const [fontScale, setFontScale] = useState(savedFontScale)
  useEffect(() => {
    document.documentElement.style.setProperty('--font-scale', String(fontScale / 100))
  }, [fontScale])
  useEffect(() => () => {
    document.documentElement.style.setProperty('--font-scale', String((auth.currentMember?.fontScale || 100) / 100))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const [savingProfile, setSavingProfile] = useState(false)

  const [tokenInput, setTokenInput] = useState('')
  const [tokenBusy, setTokenBusy] = useState(false)
  const [tokenError, setTokenError] = useState(null)
  const [tokenSuccess, setTokenSuccess] = useState(false)

  const [addingMember, setAddingMember] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('#4FA0D9')
  const [newAvatar, setNewAvatar] = useState(null)
  const [addError, setAddError] = useState(null)
  const [addBusy, setAddBusy] = useState(false)

  const [removingId, setRemovingId] = useState(null)
  const [removeError, setRemoveError] = useState(null)



  const profileChanged = color !== auth.currentMember?.color
    || avatar !== (auth.currentMember?.avatar || null)
    || bgColor !== (auth.currentMember?.bgColor || BG_PALETTE[0])
    || frontMemberId !== savedFrontId
    || fontScale !== savedFontScale

  async function handleSaveProfile() {
    setSavingProfile(true)
    try {
      const updated = await updateMember(auth.client, auth.config, auth.configSha, auth.currentMember.id, { color, bgColor, avatar, frontMemberId: frontMemberId || null, fontScale })
      auth.setConfig(updated)
      await auth.refreshConfig()
    } finally {
      setSavingProfile(false)
    }
  }

  async function handleAddMember(e) {
    e.preventDefault()
    setAddBusy(true)
    setAddError(null)
    try {
      const id = newName.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9가-힣-]/g, '')
      if (!id) throw new Error('이름을 입력해주세요.')
      if (auth.members.some((m) => m.id === id)) throw new Error('이미 있는 이름이에요.')
      const updated = await addMember(auth.client, auth.config, auth.configSha, { id, displayName: newName.trim(), color: newColor, avatar: newAvatar })
      auth.setConfig(updated)
      await auth.refreshConfig()
      setNewName('')
      setNewAvatar(null)
      setAddingMember(false)
    } catch (err) {
      setAddError(err.message)
    } finally {
      setAddBusy(false)
    }
  }

  async function handleRemoveMember(member) {
    const isSelf = member.id === auth.currentMember?.id
    const warning = isSelf
      ? `${member.displayName}(나)님을 멤버에서 삭제할까요? 삭제하면 자동으로 로그아웃돼요. 이미 쓴 ${DIARY_WORD}는 그대로 남아있어요.`
      : `${member.displayName}님을 멤버에서 삭제할까요? 이미 쓴 ${DIARY_WORD}는 그대로 남아있지만, 더는 이 사람으로 로그인할 수 없어요.`
    if (!window.confirm(warning)) return
    setRemovingId(member.id)
    setRemoveError(null)
    try {
      const updated = await removeMember(auth.client, auth.config, auth.configSha, member.id)
      auth.setConfig(updated)
      if (isSelf) {
        auth.logout()
        return
      }
      await auth.refreshConfig()
    } catch (err) {
      setRemoveError(err.message || '삭제에 실패했어요.')
    } finally {
      setRemovingId(null)
    }
  }

  async function handleUpdateToken(e) {
    e.preventDefault()
    setTokenBusy(true)
    setTokenError(null)
    setTokenSuccess(false)
    try {
      await auth.updateToken(tokenInput)
      setTokenInput('')
      setTokenSuccess(true)
    } catch (err) {
      setTokenError(err.message || '토큰을 확인해주세요.')
    } finally {
      setTokenBusy(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>설정</h2>
          <button className="btn btn-ghost btn-small" onClick={onClose}>✕</button>
        </div>

        <section className="modal-section">
          <h3>내 프로필</h3>
          <AvatarPicker
            value={avatar}
            fallbackColor={color}
            fallbackInitial={auth.currentMember?.displayName?.[0] || '?'}
            onChange={setAvatar}
          />
          <ColorPicker value={color} onChange={setColor} />
          <ColorPicker value={bgColor} onChange={setBgColor} label="배경색" palette={BG_PALETTE} />
          <label className="settings-front-member">
            <span>글씨 크기</span>
            <select value={fontScale} onChange={(e) => setFontScale(Number(e.target.value))}>
              {/* 10%부터 200%까지 10%씩 */}
              {Array.from({ length: 20 }, (_, i) => (i + 1) * 10).map((v) => (
                <option key={v} value={v}>{v}%{v === 100 ? ' (기본)' : ''}</option>
              ))}
            </select>
            <small>홈페이지 전체 글씨 크기를 변경합니다. 프로필 저장을 누르면 타 기기에 연동됩니다.</small>
          </label>
          {auth.members.length > 1 && (
            <label className="settings-front-member">
              <span>모두의 {DIARY_WORD}에서 먼저 보일 사람</span>
              <select value={frontMemberId} onChange={(e) => setFrontMemberId(e.target.value)}>
                <option value="">기본 순서 (멤버 목록 순)</option>
                {auth.members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.displayName}{m.id === auth.currentMember?.id ? ' (나)' : ''}
                  </option>
                ))}
              </select>
              <small>설정 시 우측과 좌측에서 먼저 보이도록 변경되며 본인만 적용됩니다.</small>
            </label>
          )}
          <button className="btn btn-primary btn-small" onClick={handleSaveProfile} disabled={savingProfile || !profileChanged}>
            {savingProfile ? '저장 중...' : '프로필 저장'}
          </button>
        </section>

        <section className="modal-section">
          <h3>참여 멤버</h3>
          <ul className="settings-member-list">
            {auth.members.map((m) => (
              <li key={m.id}>
                <Avatar member={m} size={26} />
                <span className="settings-member-name">{m.displayName}</span>
                {m.id === auth.currentMember?.id && <span className="me-badge">나</span>}
                <button
                  type="button"
                  className="btn btn-ghost btn-small btn-danger settings-member-remove icon-btn"
                  title="삭제" aria-label="삭제"
                  onClick={() => handleRemoveMember(m)}
                  disabled={removingId === m.id}
                >
                  <Icon name="delete" />
                </button>
              </li>
            ))}
          </ul>
          {removeError && <p className="setup-error">{removeError}</p>}
          {!addingMember ? (
            <button className="btn btn-ghost btn-small" onClick={() => setAddingMember(true)}>+ 멤버 추가하기</button>
          ) : (
            <form className="setup-form" onSubmit={handleAddMember}>
              <AvatarPicker value={newAvatar} fallbackColor={newColor} fallbackInitial={newName[0] || '?'} onChange={setNewAvatar} />
              <label>
                <span>이름</span>
                <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} required />
              </label>
              <ColorPicker value={newColor} onChange={setNewColor} />
              {addError && <p className="setup-error">{addError}</p>}
              <div className="entry-editor-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setAddingMember(false)}>취소</button>
                <button type="submit" className="btn btn-primary" disabled={addBusy}>{addBusy ? '추가 중...' : '추가'}</button>
              </div>
            </form>
          )}
        </section>

        <section className="modal-section">
          <h3>반응 그룹 · 순서</h3>
          <ReactionLayoutEditor />
        </section>

<section className="modal-section">
          <h3>토큰</h3>
          <p className="settings-repo-info">토큰이 만료됐거나 새로 발급 받았다면 다시 변경 가능합니다. 로그아웃 하지 않아도 됩니다.</p>
          <form className="setup-form" onSubmit={handleUpdateToken}>
            <label>
              <span>새 Personal Access Token</span>
              <input
                type="password" placeholder="github_pat_..." value={tokenInput}
                onChange={(e) => { setTokenInput(e.target.value); setTokenSuccess(false) }}
                required
              />
            </label>
            {tokenError && <p className="setup-error">{tokenError}</p>}
            {tokenSuccess && <p className="settings-token-success">토큰을 갱신했어요.</p>}
            <button type="submit" className="btn btn-small" disabled={tokenBusy || !tokenInput.trim()}>
              {tokenBusy ? '확인하는 중...' : '토큰 저장'}
            </button>
          </form>
        </section>

        <section className="modal-section">
          <h3>저장소</h3>
          <p className="settings-repo-info">{auth.session.owner}/{auth.session.repo}</p>
          <button className="btn btn-small icon-btn" onClick={auth.logout} title="로그아웃 (연결 해제)" aria-label="로그아웃">
            <Icon name="logout" />
          </button>
        </section>
      </div>
    </div>
  )
}
