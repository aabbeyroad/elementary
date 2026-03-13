'use client'

import { useState, useMemo, lazy, Suspense, useCallback } from 'react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DailyView } from '@/components/schedule/DailyView'
import { useSchedules } from '@/hooks/useSchedules'
import { resolveSchedulesForDate } from '@/lib/utils/schedule-helpers'
import type { ResolvedSchedule, Schedule } from '@/types/database'
import Link from 'next/link'

// ScheduleForm은 버튼 터치 시에만 필요 → lazy load
const ScheduleForm = lazy(() =>
  import('@/components/schedule/ScheduleForm').then(m => ({ default: m.ScheduleForm }))
)

interface DashboardContentProps {
  userId: string
  familyId: string
}

export function DashboardContent({ familyId }: DashboardContentProps) {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [showScheduleForm, setShowScheduleForm] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null)
  const { schedules, overrides, children, parents, loading, refetch } = useSchedules(familyId)

  // 선택된 날짜의 일정 계산
  const resolvedSchedules = useMemo(() =>
    resolveSchedulesForDate(selectedDate, schedules, overrides, children, parents),
    [selectedDate, schedules, overrides, children, parents]
  )

  const goToPrevDay = useCallback(() => setSelectedDate(prev => {
    const d = new Date(prev); d.setDate(d.getDate() - 1); return d
  }), [])
  const goToNextDay = useCallback(() => setSelectedDate(prev => {
    const d = new Date(prev); d.setDate(d.getDate() + 1); return d
  }), [])
  const goToToday = useCallback(() => setSelectedDate(new Date()), [])
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

  const handleFormSaved = useCallback(() => {
    setShowScheduleForm(false)
    setEditingSchedule(null)
    refetch()
  }, [refetch])

  return (
    <div className="flex flex-col">
      {/* 헤더 */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div />
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
          <ScheduleSkeleton />
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
    <div className="space-y-3 animate-pulse px-4">
      {/* 돌봄 공백 요약 스켈레톤 */}
      <div className="rounded-lg border border-muted bg-muted/30 p-3 h-16" />
      {/* 타임라인 스켈레톤 */}
      <div className="space-y-2 ml-10">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex items-start gap-2">
            <div className="w-8 h-4 rounded bg-muted" />
            <div className="flex-1 h-12 rounded-lg bg-muted" />
          </div>
        ))}
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
