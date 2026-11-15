// 사람마다 고른 '내 색상'과 '배경색'을 화면 일부(그 사람의 일기 칸 등)에만 적용하기 위한 도우미.

export const DEFAULT_BG_GRADIENT = 'linear-gradient(165deg, #fdf1f3 0%, #fbeef1 45%, #f7e9ee 100%)'
export const DEFAULT_BG_SOLID = '#fdf1f3'
export const DEFAULT_ACCENT = '#e8748c'

/**
 * 그 사람의 색으로 CSS 변수를 덮어쓰는 style 객체.
 * 이 style이 붙은 요소 안에서는 --accent(포인트 색), --bg-gradient(배경색) 등이 그 사람 것으로 바뀌어요.
 * (className="member-theme"과 함께 쓰면 테두리·옅은 바탕 색까지 그 사람 배경색에 맞춰져요)
 */
export function memberThemeStyle(member) {
  const color = member?.color || DEFAULT_ACCENT
  const bg = member?.bgColor
  const solid = bg && bg.startsWith('#') ? bg : DEFAULT_BG_SOLID
  return {
    '--author-color': color,
    '--accent': color,
    '--accent-soft': `${color}22`,
    '--bg-gradient': bg || DEFAULT_BG_GRADIENT,
    '--bg-solid': solid,
  }
}
