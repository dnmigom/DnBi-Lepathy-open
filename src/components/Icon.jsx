import React from 'react'
import { ICONS, ICON_COLOR, ICON_COLORS } from '../icons.js'

// <i class="fa-solid fa-house" style="color: rgb(116, 192, 252);"></i> 를 그려주는 컴포넌트.
// 어떤 아이콘을 쓸지는 src/icons.js 에서 바꿔요.
export default function Icon({ name }) {
  return (
    <i
      className={`${ICONS[name] || ICONS.edit} app-icon`}
      style={{ color: ICON_COLORS[name] || ICON_COLOR }}
      aria-hidden="true"
    />
  )
}
