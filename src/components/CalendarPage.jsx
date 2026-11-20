import React, { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useApp } from '../context/AppContext.jsx'
import { loadIndex, orderMembersFor } from '../lib/dataModel.js'
import { formatDateHeading } from '../lib/format.js'
import { useIsMobile } from '../lib/useIsMobile.js'
import Calendar from './Calendar.jsx'
import DualEntryView from './DualEntryView.jsx'
import MemberTabs from './MemberTabs.jsx'

// 선택한 날짜는 App이 관리해요. (검색 결과를 누르면 그 날짜로 바로 이동할 수 있도록)
// PC: 모든 멤버의 일기가 나란히. 모바일: 달력 아래 멤버 버튼으로 한 사람씩 (달력에는 모두의 점이 보여요)
export default function CalendarPage({ selectedDate, onSelectDate }) {
  const auth = useAuth()
  const [index, setIndex] = useState({})
  const isMobile = useIsMobile()
  const ordered = orderMembersFor(auth.members, auth.currentMember)
  const [mobileMemberId, setMobileMemberId] = useState(ordered[0]?.id)
  const shownMemberId = ordered.some((m) => m.id === mobileMemberId) ? mobileMemberId : ordered[0]?.id

  const refreshIndex = useCallback(async () => {
    const { json } = await loadIndex(auth.client)
    setIndex(json)
  }, [auth.client])

  useEffect(() => { refreshIndex() }, [refreshIndex])

  // 모바일: 알림·검색·인용 등으로 어떤 사람의 글로 이동하면 그 사람 버튼으로 바꿔요.
  // 인용 버튼을 누르면 내 칸(새 글 작성칸)으로 바꿔요.
  const app = useApp()
  const focusMember = app?.focus?.memberId
  useEffect(() => { if (focusMember) setMobileMemberId(focusMember) }, [focusMember, app?.focus?.n])
  const quoteCount = app?.quoteDraft?.length || 0
  useEffect(() => { if (quoteCount > 0) setMobileMemberId(auth.currentMember?.id) }, [quoteCount, auth.currentMember?.id])

  return (
    <div className="calendar-page">
      <Calendar index={index} selectedDate={selectedDate} onSelectDate={onSelectDate} />
      {isMobile && <MemberTabs value={shownMemberId} onChange={setMobileMemberId} />}
      <div className="calendar-detail">
        <h2 className="detail-heading">{formatDateHeading(selectedDate)}</h2>
        <DualEntryView
          date={selectedDate}
          onChanged={refreshIndex}
          onlyMemberId={isMobile ? shownMemberId : null}
        />
      </div>
    </div>
  )
}
