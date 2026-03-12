'use client'

import { useState, useMemo } from 'react'
import { format, startOfWeek, addDays, isSameDay } from 'date-fns'
import { ko } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScheduleForm } from '@/components/schedule/ScheduleForm'
import { useSchedules } from '@/hooks/useSchedules'
import { resolveSchedulesForDate, CATEGORY_COLORS } from '@/lib/utils/schedule-helpers'
import { detectCareGaps } from '@/lib/utils/care-gaps'
import Link from 'next/link'

interface WeeklyViewPageProps {
  userId: string
  familyId: string
}

export function WeeklyViewPage({ userId: _userId, familyId }: WeeklyViewPageProps) {
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 }) // 월요일 시작
  )
  const [showForm, setShowForm] = useState(false)
  const { schedules, overrides, children, parents, loading, refetch } = useSchedules(familyId)

  // 이번 주의 7일
  const weekDays = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  )

  // 각 날짜의 일정과 돌봄 공백 계산
  const weekData = useMemo(() =>
    weekDays.map(day => {
      const resolved = resolveSchedulesForDate(day, schedules, overrides, children, parents)
      const dateStr = format(day, 'yyyy-MM-dd')
      const gaps = children.flatMap(child => detectCareGaps(child, resolved, dateStr))
      return { day, schedules: resolved, gaps }
    }),
    [weekDays, schedules, overrides, children, parents]
  )

  const goToPrevWeek = () => setWeekStart(prev => addDays(prev, -7))
  const goToNextWeek = () => setWeekStart(prev => addDays(prev, 7))
  const goToThisWeek = () => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))

  const isThisWeek = isSameDay(weekStart, startOfWeek(new Date(), { weekStartsOn: 1 }))

  return (
    <div className="flex flex-col">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold">돌봄돌봄</h1>
          <div className="flex items-center gap-2">
            {!isThisWeek && <Button variant="ghost" size="sm" onClick={goToThisWeek}>이번주</Button>}
            <Button size="sm" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-1" /> 일정
            </Button>
          </div>
        </div>
        <div className="flex items-center justify-between mt-2">
          <Button variant="ghost" size="icon" onClick={goToPrevWeek}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <p className="text-base font-semibold">
            {format(weekDays[0], 'M.d', { locale: ko })} ~ {format(weekDays[6], 'M.d', { locale: ko })}
          </p>
          <Button variant="ghost" size="icon" onClick={goToNextWeek}>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
        <div className="flex items-center justify-center gap-1 mt-2">
          <Link href="/dashboard"><Badge variant="outline" className="cursor-pointer">일간</Badge></Link>
          <Badge variant="default">주간</Badge>
          <Link href="/schedule/monthly"><Badge variant="outline" className="cursor-pointer">월간</Badge></Link>
        </div>
      </header>

      <div className="p-2">
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">불러오는 중...</div>
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {/* 요일 헤더 */}
            {['월', '화', '수', '목', '금', '토', '일'].map((day, i) => (
              <div key={day} className={`text-center text-xs font-medium py-1 ${i === 5 ? 'text-blue-500' : i === 6 ? 'text-red-500' : 'text-muted-foreground'}`}>
                {day}
              </div>
            ))}

            {/* 각 날짜 컬럼 */}
            {weekData.map(({ day, schedules: daySchedules, gaps }) => {
              const isToday = isSameDay(day, new Date())
              return (
                <Link
                  key={day.toISOString()}
                  href="/dashboard"
                  className={`rounded-lg border p-1.5 min-h-[120px] space-y-0.5 transition-colors hover:bg-accent/50 ${
                    isToday ? 'border-primary bg-primary/5' : 'border-transparent'
                  }`}
                >
                  <p className={`text-center text-sm font-medium ${isToday ? 'text-primary' : ''}`}>
                    {format(day, 'd')}
                  </p>

                  {/* 일정 미니 블록 */}
                  {daySchedules.slice(0, 4).map(s => (
                    <div
                      key={s.id}
                      className="text-[9px] leading-tight px-1 py-0.5 rounded truncate text-white"
                      style={{
                        backgroundColor: s.assigned_parent?.color ?? CATEGORY_COLORS[s.category] ?? '#6b7280',
                      }}
                    >
                      {s.title}
                    </div>
                  ))}
                  {daySchedules.length > 4 && (
                    <p className="text-[9px] text-muted-foreground text-center">+{daySchedules.length - 4}</p>
                  )}

                  {/* 돌봄 공백 표시 */}
                  {gaps.length > 0 && (
                    <div className="text-[9px] text-orange-600 bg-orange-50 px-1 py-0.5 rounded text-center font-medium">
                      공백 {gaps.length}
                    </div>
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
