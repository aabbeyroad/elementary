'use client'

import { useState, useMemo } from 'react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DailyView } from '@/components/schedule/DailyView'
import { ScheduleForm } from '@/components/schedule/ScheduleForm'
import { useSchedules } from '@/hooks/useSchedules'
import { resolveSchedulesForDate } from '@/lib/utils/schedule-helpers'
import type { ResolvedSchedule, Schedule } from '@/types/database'
import Link from 'next/link'

interface DashboardContentProps {
  userId: string
  familyId: string
}

export function DashboardContent({ userId: _userId, familyId }: DashboardContentProps) {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [showScheduleForm, setShowScheduleForm] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null)
  const { schedules, overrides, children, parents, loading, refetch } = useSchedules(familyId)

  // 선택된 날짜의 일정 계산
  const resolvedSchedules = useMemo(() =>
    resolveSchedulesForDate(selectedDate, schedules, overrides, children, parents),
    [selectedDate, schedules, overrides, children, parents]
  )

  const goToPrevDay = () => setSelectedDate(prev => {
    const d = new Date(prev); d.setDate(d.getDate() - 1); return d
  })
  const goToNextDay = () => setSelectedDate(prev => {
    const d = new Date(prev); d.setDate(d.getDate() + 1); return d
  })
  const goToToday = () => setSelectedDate(new Date())
  const isToday = format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')

  const handleScheduleClick = (resolved: ResolvedSchedule) => {
    const original = schedules.find(s => s.id === resolved.id)
    if (original) {
      setEditingSchedule(original)
      setShowScheduleForm(true)
    }
  }

  const handleAddSchedule = () => {
    setEditingSchedule(null)
    setShowScheduleForm(true)
  }

  const handleFormSaved = () => {
    setShowScheduleForm(false)
    setEditingSchedule(null)
    refetch()
  }

  return (
    <div className="flex flex-col">
      {/* 헤더 */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold">돌봄돌봄</h1>
          <div className="flex items-center gap-2">
            {!isToday && (
              <Button variant="ghost" size="sm" onClick={goToToday}>오늘</Button>
            )}
            <Button size="sm" onClick={handleAddSchedule}>
              <Plus className="h-4 w-4 mr-1" />
              일정
            </Button>
          </div>
        </div>
        <div className="flex items-center justify-between mt-2">
          <Button variant="ghost" size="icon" onClick={goToPrevDay}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <p className="text-lg font-semibold">
            {format(selectedDate, 'M월 d일 (EEEE)', { locale: ko })}
          </p>
          <Button variant="ghost" size="icon" onClick={goToNextDay}>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
        {/* 뷰 전환 */}
        <div className="flex items-center justify-center gap-1 mt-2">
          <Badge variant="default">일간</Badge>
          <Link href="/schedule"><Badge variant="outline" className="cursor-pointer">주간</Badge></Link>
          <Link href="/schedule/monthly"><Badge variant="outline" className="cursor-pointer">월간</Badge></Link>
        </div>
      </header>

      {/* 콘텐츠 */}
      <div className="py-4">
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">불러오는 중...</div>
        ) : children.length === 0 ? (
          <div className="text-center py-16 space-y-4 px-4">
            <div className="mx-auto w-20 h-20 rounded-full bg-muted flex items-center justify-center">
              <span className="text-3xl">👶</span>
            </div>
            <p className="font-medium">자녀를 먼저 등록해주세요</p>
            <p className="text-sm text-muted-foreground">
              자녀를 등록하면 일정 관리와 돌봄 공백 감지를 시작할 수 있습니다.
            </p>
            <Button asChild>
              <Link href="/children">
                <Plus className="h-4 w-4 mr-1" /> 자녀 등록하기
              </Link>
            </Button>
          </div>
        ) : (
          <DailyView
            schedules={resolvedSchedules}
            childList={children}
            date={format(selectedDate, 'yyyy-MM-dd')}
            onScheduleClick={handleScheduleClick}
          />
        )}
      </div>

      {/* 일정 추가/수정 폼 */}
      {showScheduleForm && children.length > 0 && (
        <ScheduleForm
          familyId={familyId}
          childList={children}
          parents={parents}
          schedule={editingSchedule}
          defaultDate={selectedDate}
          onClose={() => { setShowScheduleForm(false); setEditingSchedule(null) }}
          onSaved={handleFormSaved}
        />
      )}
    </div>
  )
}
