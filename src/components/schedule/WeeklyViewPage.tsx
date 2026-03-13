'use client'

import { useState, useMemo, lazy, Suspense, useCallback } from 'react'
import { format, startOfWeek, addDays, isSameDay } from 'date-fns'
import { ko } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSchedules } from '@/hooks/useSchedules'
import { buildDisplaySchedulesForDate, resolveSchedulesForDate, CATEGORY_COLORS } from '@/lib/utils/schedule-helpers'
import { detectCareGaps } from '@/lib/utils/care-gaps'
import { PageHeader } from '@/components/ui/page-header'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'

const ScheduleForm = lazy(() =>
  import('@/components/schedule/ScheduleForm').then(m => ({ default: m.ScheduleForm }))
)

interface WeeklyViewPageProps {
  userId: string
  familyId: string
}

export function WeeklyViewPage({ familyId }: WeeklyViewPageProps) {
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  )
  const [showForm, setShowForm] = useState(false)
  const { schedules, overrides, children, parents, loading, refetch } = useSchedules(familyId)

  const weekDays = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  )

  const weekData = useMemo(() =>
    weekDays.map(day => {
      const resolved = resolveSchedulesForDate(day, schedules, overrides, children, parents)
      const dateStr = format(day, 'yyyy-MM-dd')
      const gaps = children.flatMap(child => detectCareGaps(child, resolved, dateStr))
      const displaySchedules = children.flatMap(child => buildDisplaySchedulesForDate(day, child, resolved))
      return { day, schedules: displaySchedules, gaps }
    }),
    [weekDays, schedules, overrides, children, parents]
  )

  const goToPrevWeek = useCallback(() => setWeekStart(prev => addDays(prev, -7)), [])
  const goToNextWeek = useCallback(() => setWeekStart(prev => addDays(prev, 7)), [])
  const goToThisWeek = useCallback(() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 })), [])

  const isThisWeek = isSameDay(weekStart, startOfWeek(new Date(), { weekStartsOn: 1 }))

  return (
    <div className="page-shell">
      <PageHeader
        kicker="Weekly Overview"
        title={`${format(weekDays[0], 'M월 d일', { locale: ko })} - ${format(weekDays[6], 'M월 d일', { locale: ko })}`}
        subtitle="주 단위로 일정, 자동 돌봄, 미배정 블록을 빠르게 훑어볼 수 있습니다."
        actions={
          <>
            {!isThisWeek && <Button variant="secondary" size="sm" onClick={goToThisWeek}>이번주</Button>}
            <Button size="sm" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4" /> 일정 추가
            </Button>
          </>
        }
        leading={
          <div className="glass-toolbar inline-flex items-center gap-1 p-1">
            <Button variant="ghost" size="icon" onClick={goToPrevWeek}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="px-3 text-sm font-medium tracking-[-0.01em] text-foreground">
              {format(weekDays[0], 'M.d', { locale: ko })} ~ {format(weekDays[6], 'M.d', { locale: ko })}
            </div>
            <Button variant="ghost" size="icon" onClick={goToNextWeek}>
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        }
      >
        <SegmentedControl
          items={[
            { label: '일간', href: '/dashboard' },
            { label: '주간', active: true },
            { label: '월간', href: '/schedule/monthly' },
          ]}
        />
      </PageHeader>

      <Card>
        <CardContent className="p-3 sm:p-5">
        {loading ? (
          <WeeklySkeleton />
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {['월', '화', '수', '목', '금', '토', '일'].map((day, i) => (
              <div key={day} className={`text-center text-xs font-medium py-1 ${i === 5 ? 'text-blue-500' : i === 6 ? 'text-red-500' : 'text-muted-foreground'}`}>
                {day}
              </div>
            ))}

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

                  {daySchedules.slice(0, 4).map(s => (
                    <div
                      key={s.id}
                      className="text-[9px] leading-tight px-1 py-0.5 rounded truncate text-white"
                      style={{
                        backgroundColor: s.isAutoCare
                          ? '#16a34a'
                          : s.assigned_parent?.color ?? CATEGORY_COLORS[s.category] ?? '#6b7280',
                      }}
                    >
                      {s.title}
                    </div>
                  ))}
                  {daySchedules.length > 4 && (
                    <p className="text-[9px] text-muted-foreground text-center">+{daySchedules.length - 4}</p>
                  )}

                  {gaps.length > 0 && (
                    <div className="text-[9px] text-orange-600 bg-orange-50 px-1 py-0.5 rounded text-center font-medium">
                      미배정 {gaps.length}
                    </div>
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
            onSaved={() => { setShowForm(false); refetch() }}
          />
        </Suspense>
      )}
    </div>
  )
}

function WeeklySkeleton() {
  return (
    <div className="grid grid-cols-7 gap-2 animate-pulse">
      {Array.from({ length: 7 }, (_, i) => (
        <div key={i} className="text-center text-xs font-medium py-1 text-muted-foreground">
          {['월', '화', '수', '목', '금', '토', '일'][i]}
        </div>
      ))}
      {Array.from({ length: 7 }, (_, i) => (
        <div key={`cell-${i}`} className="surface-card-muted min-h-[120px] p-2 space-y-1">
          <div className="h-4 w-4 bg-muted rounded mx-auto" />
          <div className="h-3 bg-muted rounded" />
          <div className="h-3 bg-muted rounded" />
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
