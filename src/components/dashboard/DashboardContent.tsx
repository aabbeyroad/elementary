'use client'

import { useState, useMemo, lazy, Suspense, useCallback, useEffect, startTransition } from 'react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DailyView } from '@/components/schedule/DailyView'
import { useSchedules } from '@/hooks/useSchedules'
import { resolveSchedulesForDate } from '@/lib/utils/schedule-helpers'
import type { ResolvedSchedule, Schedule } from '@/types/database'
import Link from 'next/link'
import { PageHeader } from '@/components/ui/page-header'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Card, CardContent } from '@/components/ui/card'

// ScheduleForm은 버튼 터치 시에만 필요 → lazy load
const loadScheduleForm = () =>
  import('@/components/schedule/ScheduleForm').then(m => ({ default: m.ScheduleForm }))

const ScheduleForm = lazy(loadScheduleForm)

interface DashboardContentProps {
  userId: string
  familyId: string
}

export function DashboardContent({ familyId }: DashboardContentProps) {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [showScheduleForm, setShowScheduleForm] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null)
  const { schedules, overrides, children, parents, loading, refetch, upsertSchedules } = useSchedules(familyId)

  useEffect(() => {
    const idleCallback = window.setTimeout(() => {
      void loadScheduleForm()
    }, 800)

    return () => window.clearTimeout(idleCallback)
  }, [])

  // 선택된 날짜의 일정 계산
  const resolvedSchedules = useMemo(() =>
    resolveSchedulesForDate(selectedDate, schedules, overrides, children, parents),
    [selectedDate, schedules, overrides, children, parents]
  )

  const goToPrevDay = useCallback(() => startTransition(() => {
    setSelectedDate(prev => {
      const d = new Date(prev)
      d.setDate(d.getDate() - 1)
      return d
    })
  }), [])
  const goToNextDay = useCallback(() => startTransition(() => {
    setSelectedDate(prev => {
      const d = new Date(prev)
      d.setDate(d.getDate() + 1)
      return d
    })
  }), [])
  const goToToday = useCallback(() => startTransition(() => setSelectedDate(new Date())), [])
  const isToday = format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')

  const handleScheduleClick = useCallback((resolved: ResolvedSchedule) => {
    const original = schedules.find(s => s.id === resolved.id)
    if (original) {
      setEditingSchedule(original)
      setShowScheduleForm(true)
    }
  }, [schedules])

  const handleAddSchedule = useCallback(() => {
    setEditingSchedule(null)
    setShowScheduleForm(true)
  }, [])

  const handleFormSaved = useCallback((savedSchedules?: Schedule[]) => {
    if (savedSchedules && savedSchedules.length > 0) {
      upsertSchedules(savedSchedules)
    } else {
      void refetch({ background: true, force: true })
    }
    setShowScheduleForm(false)
    setEditingSchedule(null)
  }, [refetch, upsertSchedules])

  return (
    <div className="page-shell">
      <PageHeader
        kicker="Family Planner"
        title={format(selectedDate, 'M월 d일', { locale: ko })}
        actions={
          <>
            {!isToday && (
              <Button variant="secondary" size="sm" onClick={goToToday}>오늘</Button>
            )}
            <Button size="sm" onClick={handleAddSchedule}>
              <Plus className="h-4 w-4" />
              일정 추가
            </Button>
          </>
        }
        leading={
          <div className="glass-toolbar grid w-full max-w-[360px] grid-cols-[48px,minmax(0,1fr),48px] items-center p-1">
            <Button variant="ghost" size="icon" onClick={goToPrevDay}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="px-3 text-center text-sm font-medium tracking-[-0.01em] text-foreground">
              {format(selectedDate, 'M월 d일 (EEEE)', { locale: ko })}
            </div>
            <Button variant="ghost" size="icon" onClick={goToNextDay}>
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        }
      >
        <SegmentedControl
          className="max-w-[360px]"
          items={[
            { label: '일간', active: true },
            { label: '주간', href: '/schedule' },
            { label: '월간', href: '/schedule/monthly' },
          ]}
        />
      </PageHeader>

      <div className="space-y-4">
        {loading ? (
          <ScheduleSkeleton />
        ) : children.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center px-6 py-16 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-secondary">
                <span className="text-3xl">👶</span>
              </div>
              <p className="mt-6 text-xl font-semibold tracking-[-0.03em]">자녀를 먼저 등록해주세요</p>
              <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                자녀를 등록하면 일정 관리와 돌봄 공백 감지를 바로 시작할 수 있습니다.
              </p>
              <Button asChild className="mt-6">
                <Link href="/children">
                  <Plus className="h-4 w-4" /> 자녀 등록하기
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <DailyView
            schedules={resolvedSchedules}
            childList={children}
            parents={parents}
            date={format(selectedDate, 'yyyy-MM-dd')}
            onScheduleClick={handleScheduleClick}
          />
        )}
      </div>

      {/* 일정 추가/수정 폼 (lazy loaded) */}
      {showScheduleForm && children.length > 0 && (
        <Suspense fallback={<FormLoadingOverlay />}>
          <ScheduleForm
            familyId={familyId}
            childList={children}
            parents={parents}
            schedules={schedules}
            schedule={editingSchedule}
            defaultDate={selectedDate}
            onClose={() => { setShowScheduleForm(false); setEditingSchedule(null) }}
            onSaved={handleFormSaved}
          />
        </Suspense>
      )}
    </div>
  )
}

// 스켈레톤 로더: 로딩 중 레이아웃 유지로 CLS 방지
function ScheduleSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="surface-card-muted h-24" />
      <div className="surface-card p-5">
        <div className="space-y-3 pl-10">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex items-start gap-2">
            <div className="w-8 h-4 rounded bg-muted" />
            <div className="flex-1 h-12 rounded-lg bg-muted" />
          </div>
        ))}
        </div>
      </div>
    </div>
  )
}

// 폼 로딩 오버레이
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
