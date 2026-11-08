import React, { useLayoutEffect, useRef } from 'react'

// 한 줄짜리 input처럼 보이지만, 내용이 길어지면 높이가 자동으로 늘어나는 textarea입니다.
// 본문 입력칸처럼 오른쪽 아래 모서리를 끌어서 높이를 직접 조절할 수도 있어요.
// (직접 키운 높이는 유지되고, 글이 그보다 길어지면 그때부터 다시 자동으로 늘어나요)
// Enter로 등록/저장, Shift+Enter로 줄바꿈하도록 onSubmitKey를 통해 부모에서 처리합니다.
const AUTO_MAX_HEIGHT = 240 // 자동으로 늘어날 때의 최대 높이(px). 직접 끌어서 키우는 건 제한 없음

export default function AutoGrowTextarea({
  value, onChange, onSubmitKey, placeholder, autoFocus, className, disabled,
}) {
  const ref = useRef(null)
  const autoHeight = useRef(null) // 마지막으로 자동 계산해서 넣은 높이
  const manualHeight = useRef(0) // 사용자가 모서리를 끌어서 정한 높이

  function fit() {
    const el = ref.current
    if (!el) return
    // border-box 기준이라 scrollHeight에 테두리 두께를 더해줘야 1~2px 오차로 인한
    // 스크롤바가 항상 보이는 문제가 안 생겨요.
    const { borderTopWidth, borderBottomWidth } = window.getComputedStyle(el)
    const extra = parseFloat(borderTopWidth || '0') + parseFloat(borderBottomWidth || '0')
    el.style.height = 'auto'
    const content = Math.min(el.scrollHeight + extra, AUTO_MAX_HEIGHT)
    const next = Math.max(content, manualHeight.current)
    el.style.height = `${next}px`
    autoHeight.current = next
  }

  useLayoutEffect(fit, [value])

  // 모서리를 끌고 손을 떼면, 바뀐 높이를 '직접 정한 높이'로 기억해요.
  function rememberManualSize() {
    const el = ref.current
    if (!el || autoHeight.current == null) return
    const h = el.offsetHeight
    if (Math.abs(h - autoHeight.current) > 1) {
      manualHeight.current = h
      autoHeight.current = h
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      onSubmitKey?.()
    }
  }

  return (
    <textarea
      ref={ref}
      className={className}
      rows={1}
      value={value}
      placeholder={placeholder}
      autoFocus={autoFocus}
      disabled={disabled}
      onChange={onChange}
      onKeyDown={handleKeyDown}
      onMouseUp={rememberManualSize}
      onTouchEnd={rememberManualSize}
    />
  )
}
