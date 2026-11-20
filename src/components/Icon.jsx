import React from 'react'
import { ICONS, ICON_COLOR, ICON_COLORS } from '../icons.js'

// <i class="fa-solid fa-house" style="color: rgb(116, 192, 252);"></i> 를 그려주는 컴포넌트.
// 어떤 아이콘을 쓸지는 src/icons.js 에서 바꿔요.
// inherit: true면 아이콘 색을 주변 글씨 색과 같게 해요 (글씨 옆에 붙는 작은 아이콘용)
export default function Icon({ name, className = '', inherit = false }) {
  return (
    <i
      className={`${ICONS[name] || ICONS.edit} app-icon ${className}`}
      style={{ color: inherit ? 'currentColor' : (ICON_COLORS[name] || ICON_COLOR) }}
      aria-hidden="true"
    />
  )
}
