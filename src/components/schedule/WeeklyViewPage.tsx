'use client'

import { useState, useMemo, lazy, Suspense, useCallback, useEffect, startTransition } from 'react'
import { format, startOfWeek, addDays, isSameDay } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSchedules } from '@/hooks/useSchedules'
import {
  buildDisplaySchedulesForDate,
  getScheduleBlockPalette,
  timeToMinutes,
  resolveSchedulesForDate,
} from '@/lib/utils/schedule-helpers'
import { detectCareGaps } from '@/lib/utils/care-gaps'
import { PageHeader } from '@/components/ui/page-header'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Card, CardContent } from '@/components/ui/card'
import { DateNavigator } from '@/components/schedule/DateNavigator'

const loadScheduleForm = () =>
  import('@/components/schedule/ScheduleForm').then(m => ({ default: m.ScheduleForm }))

const ScheduleForm = lazy(loadScheduleForm)

interface WeeklyViewPageProps {
  familyId: string
}

const TIMELINE_START = 7 * 60
const TIMELINE_END = 21 * 60
const HOUR_HEIGHT = 56
const MIN_BLOCK_HEIGHT = 18

export function WeeklyViewPage({ familyId }: WeeklyViewPageProps) {
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  )
  const [showForm, setShowForm] = useState(false)
  const { schedules, overrides, children, parents, loading, refetch, upsertSchedules } = useSchedules(familyId)

  useEffect(() => {
    const idleCallback = window.setTimeout(() => {
      void loadScheduleForm()
    }, 800)

    return () => window.clearTimeout(idleCallback)
  }, [])

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

  const goToPrevWeek = useCallback(() => startTransition(() => setWeekStart(prev => addDays(prev, -7))), [])
  const goToNextWeek = useCallback(() => startTransition(() => setWeekStart(prev => addDays(prev, 7))), [])
  const goToThisWeek = useCallback(() => startTransition(() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))), [])

  const isThisWeek = isSameDay(weekStart, startOfWeek(new Date(), { weekStartsOn: 1 }))
  const hours = Array.from({ length: (TIMELINE_END - TIMELINE_START) / 60 + 1 }, (_, i) => i + 7)
  const timelineHeight = ((TIMELINE_END - TIMELINE_START) / 60) * HOUR_HEIGHT

  return (
    <div className="page-shell">
      <PageHeader
        title="주간 일정"
        actions={
          <>
            {!isThisWeek && <Button variant="secondary" size="sm" onClick={goToThisWeek}>이번주</Button>}
            <Button size="sm" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4" /> 일정 추가
            </Button>
          </>
        }
        leading={<DateNavigator label={`${format(weekDays[0], 'M.d', { locale: ko })} ~ ${format(weekDays[6], 'M.d', { locale: ko })}`} onPrev={goToPrevWeek} onNext={goToNextWeek} />}
      >
        <SegmentedControl
          className="max-w-[360px]"
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
          <div className="overflow-x-auto">
            <div className="min-w-[760px]">
              <div className="grid grid-cols-[40px_repeat(7,minmax(0,1fr))] gap-1 pb-2">
                <div />
                {weekData.map(({ day }) => {
                  const today = isSameDay(day, new Date())
                  return (
                    <div
                      key={`header-${day.toISOString()}`}
                      className={`rounded-[16px] px-2 py-2 text-center ${
                        today ? 'bg-primary/8 text-primary' : 'bg-secondary/65 text-foreground'
                      }`}
                    >
                      <p className="text-[11px] font-medium text-muted-foreground">
                        {format(day, 'EEE', { locale: ko })}
                      </p>
                      <p className="mt-0.5 text-sm font-semibold">
                        {format(day, 'd')}
                      </p>
                    </div>
                  )
                })}
              </div>

              <div className="relative grid grid-cols-[40px_repeat(7,minmax(0,1fr))] gap-1">
                <div className="relative" style={{ height: `${timelineHeight}px` }}>
                  {hours.slice(0, -1).map(hour => {
                    const top = ((hour * 60 - TIMELINE_START) / 60) * HOUR_HEIGHT
                    return (
                      <div key={`hour-${hour}`} className="absolute left-0 right-0" style={{ top }}>
                        <span className="block -translate-y-2 text-right text-[11px] font-medium text-muted-foreground">
                          {hour}
                        </span>
                      </div>
                    )
                  })}
                </div>

                {weekData.map(({ day, schedules: daySchedules, gaps }) => {
                  const today = isSameDay(day, new Date())

                  return (
                    <div
                      key={day.toISOString()}
                      className={`relative overflow-hidden rounded-[18px] ${
                        today ? 'bg-primary/5' : 'bg-secondary/38'
                      }`}
                      style={{ height: `${timelineHeight}px` }}
                    >
                      {hours.slice(0, -1).map(hour => {
                        const top = ((hour * 60 - TIMELINE_START) / 60) * HOUR_HEIGHT
                        return (
                          <div key={`${day.toISOString()}-${hour}`} className="absolute inset-x-0" style={{ top }}>
                            <div className="border-t border-dashed border-border/70" />
                          </div>
                        )
                      })}

                      {daySchedules.map(schedule => {
                        const startMinutes = timeToMinutes(schedule.start_time)
                        const endMinutes = timeToMinutes(schedule.end_time)
                        const top = ((startMinutes - TIMELINE_START) / 60) * HOUR_HEIGHT
                        const height = Math.max(((endMinutes - startMinutes) / 60) * HOUR_HEIGHT, MIN_BLOCK_HEIGHT)
                        const palette = getScheduleBlockPalette(schedule)
                        const showText = height >= 28

                        return (
                          <div
                            key={schedule.id}
                            className="absolute left-1 right-1 overflow-hidden rounded-[12px] px-2 py-1"
                            style={{
                              top,
                              height,
                              backgroundColor: palette.background,
                              color: palette.text,
                            }}
                          >
                            {showText ? (
                              <div className="space-y-0.5">
                                <p className="truncate text-[10px] font-semibold">{schedule.title}</p>
                                {height >= 40 ? (
                                  <p className="truncate text-[9px]" style={{ color: palette.mutedText }}>
                                    {schedule.start_time.slice(0, 5)}-{schedule.end_time.slice(0, 5)}
                                  </p>
                                ) : null}
                              </div>
                            ) : null}
                          </div>
                        )
                      })}

                      {gaps.length > 0 ? (
                        <div className="absolute inset-x-1 bottom-1 rounded-[10px] bg-orange-50/92 px-1.5 py-1 text-center text-[9px] font-medium text-orange-700">
                          미배정 {gaps.length}
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            </div>
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

function WeeklySkeleton() {
  return (
    <div className="animate-pulse overflow-x-auto">
      <div className="min-w-[760px]">
        <div className="grid grid-cols-[40px_repeat(7,minmax(0,1fr))] gap-1 pb-2">
          <div />
          {Array.from({ length: 7 }, (_, i) => (
            <div key={i} className="surface-card-muted h-14" />
          ))}
        </div>
        <div className="grid grid-cols-[40px_repeat(7,minmax(0,1fr))] gap-1">
          <div className="space-y-10 pt-2">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="ml-auto h-3 w-4 rounded bg-muted" />
            ))}
          </div>
          {Array.from({ length: 7 }, (_, i) => (
            <div key={`cell-${i}`} className="surface-card-muted h-[784px]" />
          ))}
        </div>
      </div>
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
