import React from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { orderMembersFor } from '../lib/dataModel.js'
import Avatar from './Avatar.jsx'

// 사람 고르는 버튼 줄 (갤러리·텔레파시·태그 모아보기에서 같이 써요)
// 순서는 설정의 '모두의 텔레파시에서 먼저 보일 사람'을 따라가요.
export default function MemberTabs({ value, onChange }) {
  const auth = useAuth()
  return (
    <div className="gallery-tabs" role="tablist">
      {orderMembersFor(auth.members, auth.currentMember).map((m) => (
        <button
          key={m.id} type="button" role="tab" aria-selected={m.id === value}
          className={`gallery-tab ${m.id === value ? 'active' : ''}`}
          style={{ '--author-color': m.color }}
          onClick={() => onChange(m.id)}
        >
          <Avatar member={m} size={24} />
          <span>{m.displayName}</span>
        </button>
      ))}
    </div>
  )
}
