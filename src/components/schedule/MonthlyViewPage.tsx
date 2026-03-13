'use client'

import { useState, useMemo, lazy, Suspense, useCallback, useEffect, startTransition } from 'react'
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
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSchedules } from '@/hooks/useSchedules'
import { buildDisplaySchedulesForDate, resolveSchedulesForDate } from '@/lib/utils/schedule-helpers'
import { detectCareGaps } from '@/lib/utils/care-gaps'
import { PageHeader } from '@/components/ui/page-header'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import { DateNavigator } from '@/components/schedule/DateNavigator'

const loadScheduleForm = () =>
  import('@/components/schedule/ScheduleForm').then(m => ({ default: m.ScheduleForm }))

const ScheduleForm = lazy(loadScheduleForm)

interface MonthlyViewPageProps {
  familyId: string
}

export function MonthlyViewPage({ familyId }: MonthlyViewPageProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [showForm, setShowForm] = useState(false)
  const { schedules, overrides, children, parents, loading, refetch, upsertSchedules } = useSchedules(familyId)

  useEffect(() => {
    const idleCallback = window.setTimeout(() => {
      void loadScheduleForm()
    }, 800)

    return () => window.clearTimeout(idleCallback)
  }, [])

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

  // 경량화된 월간 데이터 계산: 일정 개수와 색상 점만 (공백 감지는 현재월에만)
  const dayData = useMemo(() => {
    const data = new Map<string, { count: number; hasGap: boolean; childColors: string[] }>()
    for (const day of calendarDays) {
      const isCurrentMonthDay = isSameMonth(day, currentMonth)
      const dateStr = format(day, 'yyyy-MM-dd')
      const resolved = resolveSchedulesForDate(day, schedules, overrides, children, parents)
      const displaySchedules = children.flatMap(child => buildDisplaySchedulesForDate(day, child, resolved))

      // 돌봄 공백 감지는 현재 월의 날짜에만 적용 (이전/다음 달은 스킵 → 연산 절약)
      const hasGap = isCurrentMonthDay && resolved.length > 0
        ? children.some(child => detectCareGaps(child, resolved, dateStr).length > 0)
        : false

      const childColors = [...new Set(displaySchedules.map(s => s.isAutoCare ? '#16a34a' : s.child?.color).filter(Boolean))] as string[]

      data.set(dateStr, {
        count: displaySchedules.length,
        hasGap,
        childColors: childColors.slice(0, 3),
      })
    }
    return data
  }, [calendarDays, currentMonth, schedules, overrides, children, parents])

  const goToPrevMonth = useCallback(() => startTransition(() => setCurrentMonth(prev => subMonths(prev, 1))), [])
  const goToNextMonth = useCallback(() => startTransition(() => setCurrentMonth(prev => addMonths(prev, 1))), [])
  const goToThisMonth = useCallback(() => startTransition(() => setCurrentMonth(new Date())), [])
  const isThisMonth = isSameMonth(currentMonth, new Date())

  return (
    <div className="page-shell">
      <PageHeader
        title="월간 일정"
        actions={
          <>
            {!isThisMonth && <Button variant="secondary" size="sm" onClick={goToThisMonth}>이번달</Button>}
            <Button size="sm" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4" /> 일정 추가
            </Button>
          </>
        }
        leading={<DateNavigator label={format(currentMonth, 'yyyy년 M월', { locale: ko })} onPrev={goToPrevMonth} onNext={goToNextMonth} />}
      >
        <SegmentedControl
          className="max-w-[360px]"
          items={[
            { label: '일간', href: '/dashboard' },
            { label: '주간', href: '/schedule' },
            { label: '월간', active: true },
          ]}
        />
      </PageHeader>

      <Card>
        <CardContent className="p-3 sm:p-5">
        {loading ? (
          <MonthlySkeleton />
        ) : (
          <div className="grid grid-cols-7 gap-0.5">
            {['월', '화', '수', '목', '금', '토', '일'].map((day, i) => (
              <div key={day} className={`text-center text-xs font-medium py-2 ${i === 5 ? 'text-blue-500' : i === 6 ? 'text-red-500' : 'text-muted-foreground'}`}>
                {day}
              </div>
            ))}

            {calendarDays.map(day => {
              const dateStr = format(day, 'yyyy-MM-dd')
              const data = dayData.get(dateStr)
              const isToday = isSameDay(day, new Date())
              const isCurrentMonthDay = isSameMonth(day, currentMonth)

              return (
                <Link
                  key={dateStr}
                  href="/dashboard"
                  prefetch
                  className={`relative rounded-md p-1 min-h-[52px] flex flex-col items-center transition-colors hover:bg-accent/50 ${
                    !isCurrentMonthDay ? 'opacity-30' : ''
                  }`}
                >
                  <span className={`text-sm w-7 h-7 flex items-center justify-center rounded-full ${
                    isToday ? 'bg-primary text-primary-foreground font-bold' : ''
                  }`}>
                    {format(day, 'd')}
                  </span>

                  {data && data.childColors.length > 0 && (
                    <div className="flex gap-0.5 mt-0.5">
                      {data.childColors.map((color, i) => (
                        <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                      ))}
                    </div>
                  )}

                  {data?.hasGap && (
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-0.5" />
                  )}

                  {data && data.count > 0 && (
                    <span className="text-[9px] text-muted-foreground">{data.count}</span>
                  )}
                </Link>
              )
            })}
          </div>
        )}
        </CardContent>
      </Card>

      {showForm && children.length > 0 && (
        <Suspense fallback={<FormLoadingOverlay />}>
          <ScheduleForm
            familyId={familyId}
            childList={children}
            parents={parents}
            schedules={schedules}
            onClose={() => setShowForm(false)}
            onSaved={(savedSchedules) => {
              setShowForm(false)
              if (savedSchedules && savedSchedules.length > 0) {
                upsertSchedules(savedSchedules)
              } else {
                void refetch({ background: true, force: true })
              }
            }}
          />
        </Suspense>
      )}
    </div>
  )
}

function MonthlySkeleton() {
  return (
    <div className="grid grid-cols-7 gap-1 animate-pulse">
      {['월', '화', '수', '목', '금', '토', '일'].map((day) => (
        <div key={day} className="text-center text-xs font-medium py-2 text-muted-foreground">{day}</div>
      ))}
      {Array.from({ length: 35 }, (_, i) => (
        <div key={i} className="surface-card-muted min-h-[56px] p-1 flex flex-col items-center">
          <div className="w-7 h-7 bg-muted rounded-full" />
        </div>
      ))}
    </div>
  )
}

function FormLoadingOverlay() {
  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-end justify-center">
      <div className="w-full max-w-lg bg-background rounded-t-2xl p-6 animate-pulse">
        <div className="h-6 w-32 bg-muted rounded mb-4" />
        <div className="space-y-3">
          <div className="h-10 bg-muted rounded" />
          <div className="h-10 bg-muted rounded" />
          <div className="h-10 bg-muted rounded" />
        </div>
      </div>
    </div>
  )
}
