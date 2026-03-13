'use client'

import { useState, useMemo, lazy, Suspense, useCallback } from 'react'
import { format, startOfWeek, addDays, isSameDay } from 'date-fns'
import { ko } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useSchedules } from '@/hooks/useSchedules'
import { buildDisplaySchedulesForDate, resolveSchedulesForDate, CATEGORY_COLORS } from '@/lib/utils/schedule-helpers'
import { detectCareGaps } from '@/lib/utils/care-gaps'
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
    <div className="flex flex-col">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div />
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
      </div>

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
    <div className="grid grid-cols-7 gap-1 animate-pulse">
      {Array.from({ length: 7 }, (_, i) => (
        <div key={i} className="text-center text-xs font-medium py-1 text-muted-foreground">
          {['월', '화', '수', '목', '금', '토', '일'][i]}
        </div>
      ))}
      {Array.from({ length: 7 }, (_, i) => (
        <div key={`cell-${i}`} className="rounded-lg border border-transparent p-1.5 min-h-[120px] space-y-1">
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
