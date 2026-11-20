import React from 'react'
import Icon from './Icon.jsx'

// 오른쪽 아래 모서리: 맨 위로 / 맨 아래로 (PC·모바일 모두)
// 하얀 바탕에, 아이콘은 각자 고른 '내 색상'이에요.
export default function ScrollButtons() {
  const toTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })
  const toBottom = () => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' })
  return (
    <div className="scroll-buttons">
      <button type="button" className="round-btn scroll-btn" onClick={toTop} title="맨 위로" aria-label="맨 위로">
        <Icon name="scrollTop" />
      </button>
      <button type="button" className="round-btn scroll-btn" onClick={toBottom} title="맨 아래로" aria-label="맨 아래로">
        <Icon name="scrollBottom" />
      </button>
    </div>
  )
}
