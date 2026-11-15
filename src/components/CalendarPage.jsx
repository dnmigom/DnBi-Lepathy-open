import React, { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { loadIndex } from '../lib/dataModel.js'
import { formatDateHeading } from '../lib/format.js'
import Calendar from './Calendar.jsx'
import DualEntryView from './DualEntryView.jsx'

// 선택한 날짜는 App이 관리해요. (검색 결과를 누르면 그 날짜로 바로 이동할 수 있도록)
export default function CalendarPage({ selectedDate, onSelectDate }) {
  const auth = useAuth()
  const [index, setIndex] = useState({})

  const refreshIndex = useCallback(async () => {
    const { json } = await loadIndex(auth.client)
    setIndex(json)
  }, [auth.client])

  useEffect(() => { refreshIndex() }, [refreshIndex])

  return (
    <div className="calendar-page">
      <Calendar index={index} selectedDate={selectedDate} onSelectDate={onSelectDate} />
      <div className="calendar-detail">
        <h2 className="detail-heading">{formatDateHeading(selectedDate)}</h2>
        <DualEntryView date={selectedDate} onChanged={refreshIndex} />
      </div>
    </div>
  )
}
