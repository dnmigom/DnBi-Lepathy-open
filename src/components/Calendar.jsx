import React, { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { todayStr } from '../lib/dataModel.js'
import Icon from './Icon.jsx'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

export default function Calendar({ index, selectedDate, onSelectDate }) {
  const auth = useAuth()
  const today = todayStr()
  const [cursor, setCursor] = useState(() => {
    const [y, m] = (selectedDate || today).split('-').map(Number)
    return { year: y, month: m - 1 } // month: 0-11
  })

  const weeks = useMemo(() => buildMonthGrid(cursor.year, cursor.month), [cursor])
  const [picking, setPicking] = useState(false) // 제목을 누르면 연·월 고르는 화면
  const [pickYear, setPickYear] = useState(cursor.year)

  // 검색 등으로 다른 달의 날짜가 선택되면 달력도 그 달로 넘어가요.
  useEffect(() => {
    if (!selectedDate) return
    const [y, m] = selectedDate.split('-').map(Number)
    setCursor((prev) => (prev.year === y && prev.month === m - 1 ? prev : { year: y, month: m - 1 }))
  }, [selectedDate])

  function shiftMonth(delta) {
    setCursor((prev) => {
      const d = new Date(prev.year, prev.month + delta, 1)
      return { year: d.getFullYear(), month: d.getMonth() }
    })
  }

  // '오늘' 버튼: 이번 달로 넘어가고 오늘 날짜를 골라요.
  function goToday() {
    const [y, m] = today.split('-').map(Number)
    setCursor({ year: y, month: m - 1 })
    setPicking(false)
    if (selectedDate !== today) onSelectDate(today)
  }

  function openPicker() {
    setPickYear(cursor.year)
    setPicking((v) => !v)
  }

  function pickMonth(month) {
    setCursor({ year: pickYear, month })
    setPicking(false)
  }

  const [ty, tm] = today.split('-').map(Number)

  return (
    <div className="calendar card">
      <div className="calendar-header">
        <span className="calendar-header-side" />
        <div className="calendar-header-center">
          <button className="btn btn-ghost btn-small" onClick={() => shiftMonth(-1)} aria-label="이전 달" disabled={picking}><Icon name="prev" /></button>
          <button
            type="button" className={`calendar-title-btn ${picking ? 'open' : ''}`} onClick={openPicker}
            aria-expanded={picking} title="연도·월 고르기"
          >
            {cursor.year}년 {cursor.month + 1}월 <Icon name="sortDown" inherit className="caret-down calendar-title-caret" />
          </button>
          <button className="btn btn-ghost btn-small" onClick={() => shiftMonth(1)} aria-label="다음 달" disabled={picking}><Icon name="next" /></button>
        </div>
        <span className="calendar-header-side right">
          <button type="button" className="calendar-today-btn" onClick={goToday}>오늘</button>
        </span>
      </div>

      {picking ? (
        <div className="calendar-picker">
          <div className="calendar-picker-year">
            <button type="button" className="btn btn-ghost btn-small" onClick={() => setPickYear((y) => y - 1)} aria-label="이전 해"><Icon name="prev" /></button>
            <span>{pickYear}년</span>
            <button type="button" className="btn btn-ghost btn-small" onClick={() => setPickYear((y) => y + 1)} aria-label="다음 해"><Icon name="next" /></button>
          </div>
          <div className="calendar-picker-months">
            {Array.from({ length: 12 }, (_, i) => (
              <button
                key={i} type="button"
                className={`calendar-picker-month ${pickYear === cursor.year && i === cursor.month ? 'current' : ''} ${pickYear === ty && i === tm - 1 ? 'today' : ''}`}
                onClick={() => pickMonth(i)}
              >
                {i + 1}월
              </button>
            ))}
          </div>
        </div>
      ) : (
      <>
      <div className="calendar-weekdays">
        {WEEKDAYS.map((w) => <span key={w}>{w}</span>)}
      </div>

      <div className="calendar-grid">
        {weeks.flat().map((cell, i) => {
          if (!cell) return <div key={i} className="calendar-cell empty" />
          const authors = index[cell] || []
          const isSelected = cell === selectedDate
          const isToday = cell === today
          return (
            <button
              key={cell}
              className={`calendar-cell ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
              onClick={() => onSelectDate(cell)}
            >
              <span className="calendar-day-num">{Number(cell.split('-')[2])}</span>
              <span className="calendar-dots">
                {authors.map((id) => {
                  const m = auth.members.find((mm) => mm.id === id)
                  return <span key={id} className="calendar-dot" style={{ background: m?.color || '#ccc' }} />
                })}
              </span>
            </button>
          )
        })}
      </div>
      </>
      )}
    </div>
  )
}

function buildMonthGrid(year, month) {
  const first = new Date(year, month, 1)
  const startWeekday = first.getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const cells = []
  for (let i = 0; i < startWeekday; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) {
    const mm = String(month + 1).padStart(2, '0')
    const dd = String(d).padStart(2, '0')
    cells.push(`${year}-${mm}-${dd}`)
  }
  while (cells.length % 7 !== 0) cells.push(null)

  const weeks = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
}
