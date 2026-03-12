'use client'

import { useState, useMemo } from 'react'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameDay,
  isSameMonth,
} from 'date-fns'
import { ko } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScheduleForm } from '@/components/schedule/ScheduleForm'
import { useSchedules } from '@/hooks/useSchedules'
import { resolveSchedulesForDate } from '@/lib/utils/schedule-helpers'
import { detectCareGaps } from '@/lib/utils/care-gaps'
import Link from 'next/link'

interface MonthlyViewPageProps {
  userId: string
  familyId: string
}

export function MonthlyViewPage({ userId: _userId, familyId }: MonthlyViewPageProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [showForm, setShowForm] = useState(false)
  const { schedules, overrides, children, parents, loading, refetch } = useSchedules(familyId)

  // 달력에 표시할 날짜 배열 (이전/다음 달 포함)
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })

    const days: Date[] = []
    let day = calStart
    while (day <= calEnd) {
      days.push(day)
      day = addDays(day, 1)
    }
    return days
  }, [currentMonth])

  // 각 날짜의 일정 개수와 돌봄 공백 유무
  const dayData = useMemo(() => {
    const data = new Map<string, { count: number; hasGap: boolean; childColors: string[] }>()
    for (const day of calendarDays) {
      const dateStr = format(day, 'yyyy-MM-dd')
      const resolved = resolveSchedulesForDate(day, schedules, overrides, children, parents)
      const gaps = children.flatMap(child => detectCareGaps(child, resolved, dateStr))

      // 자녀별 색상 점 (중복 제거)
      const childColors = [...new Set(resolved.map(s => s.child?.color).filter(Boolean))] as string[]

      data.set(dateStr, {
        count: resolved.length,
        hasGap: gaps.length > 0,
        childColors: childColors.slice(0, 3), // 최대 3개 점
      })
    }
    return data
  }, [calendarDays, schedules, overrides, children, parents])

  const goToPrevMonth = () => setCurrentMonth(prev => subMonths(prev, 1))
  const goToNextMonth = () => setCurrentMonth(prev => addMonths(prev, 1))
  const goToThisMonth = () => setCurrentMonth(new Date())
  const isThisMonth = isSameMonth(currentMonth, new Date())

  return (
    <div className="flex flex-col">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold">돌봄돌봄</h1>
          <div className="flex items-center gap-2">
            {!isThisMonth && <Button variant="ghost" size="sm" onClick={goToThisMonth}>이번달</Button>}
            <Button size="sm" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-1" /> 일정
            </Button>
          </div>
        </div>
        <div className="flex items-center justify-between mt-2">
          <Button variant="ghost" size="icon" onClick={goToPrevMonth}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <p className="text-lg font-semibold">
            {format(currentMonth, 'yyyy년 M월', { locale: ko })}
          </p>
          <Button variant="ghost" size="icon" onClick={goToNextMonth}>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
        <div className="flex items-center justify-center gap-1 mt-2">
          <Link href="/dashboard"><Badge variant="outline" className="cursor-pointer">일간</Badge></Link>
          <Link href="/schedule"><Badge variant="outline" className="cursor-pointer">주간</Badge></Link>
          <Badge variant="default">월간</Badge>
        </div>
      </header>

      <div className="p-3">
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">불러오는 중...</div>
        ) : (
          <div className="grid grid-cols-7 gap-0.5">
            {/* 요일 헤더 */}
            {['월', '화', '수', '목', '금', '토', '일'].map((day, i) => (
              <div key={day} className={`text-center text-xs font-medium py-2 ${i === 5 ? 'text-blue-500' : i === 6 ? 'text-red-500' : 'text-muted-foreground'}`}>
                {day}
              </div>
            ))}

            {/* 날짜 셀 */}
            {calendarDays.map(day => {
              const dateStr = format(day, 'yyyy-MM-dd')
              const data = dayData.get(dateStr)
              const isToday = isSameDay(day, new Date())
              const isCurrentMonth = isSameMonth(day, currentMonth)

              return (
                <Link
                  key={dateStr}
                  href="/dashboard"
                  className={`relative rounded-md p-1 min-h-[52px] flex flex-col items-center transition-colors hover:bg-accent/50 ${
                    !isCurrentMonth ? 'opacity-30' : ''
                  }`}
                >
                  <span className={`text-sm w-7 h-7 flex items-center justify-center rounded-full ${
                    isToday ? 'bg-primary text-primary-foreground font-bold' : ''
                  }`}>
                    {format(day, 'd')}
                  </span>

                  {/* 일정 점 표시 */}
                  {data && data.childColors.length > 0 && (
                    <div className="flex gap-0.5 mt-0.5">
                      {data.childColors.map((color, i) => (
                        <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                      ))}
                    </div>
                  )}

                  {/* 돌봄 공백 표시 */}
                  {data?.hasGap && (
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-0.5" />
                  )}

                  {/* 일정 개수 */}
                  {data && data.count > 0 && (
                    <span className="text-[9px] text-muted-foreground">{data.count}</span>
                  )}
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {showForm && children.length > 0 && (
        <ScheduleForm
          familyId={familyId}
          childList={children}
          parents={parents}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); refetch() }}
        />
      )}
    </div>
  )
}
