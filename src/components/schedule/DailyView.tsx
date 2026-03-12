'use client'

import { useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { CATEGORY_COLORS, timeToMinutes } from '@/lib/utils/schedule-helpers'
import { detectCareGaps } from '@/lib/utils/care-gaps'
import type { ResolvedSchedule, Child, CareGap } from '@/types/database'
import { MapPin, Clock } from 'lucide-react'

interface DailyViewProps {
  schedules: ResolvedSchedule[]
  childList: Child[]
  date: string
  onScheduleClick: (schedule: ResolvedSchedule) => void
}

// 타임라인 시간 범위 (7:00 ~ 21:00)
const TIMELINE_START = 7 * 60 // 7:00 in minutes
const TIMELINE_END = 21 * 60  // 21:00 in minutes
const HOUR_HEIGHT = 64 // px per hour

/**
 * 일간 타임라인 뷰
 * - 시간별 타임라인에 일정 블록을 배치
 * - 돌봄 공백을 빨간 줄무늬로 표시
 * - 담당 부모별 색상 구분
 */
export function DailyView({ schedules, childList, date, onScheduleClick }: DailyViewProps) {
  // 모든 자녀의 돌봄 공백 계산
  const careGaps = useMemo(() =>
    childList.flatMap(child => detectCareGaps(child, schedules, date)),
    [childList, schedules, date]
  )

  // 시간 라벨 생성 (7시~20시)
  const hours = Array.from({ length: 14 }, (_, i) => i + 7)

  const totalCareGapMinutes = careGaps.reduce((sum, gap) => sum + gap.duration_minutes, 0)

  return (
    <div className="space-y-3">
      {/* 돌봄 공백 요약 */}
      {careGaps.length > 0 && (
        <div className="mx-4 rounded-lg border border-orange-200 bg-orange-50 p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-orange-800">
              돌봄 공백 {careGaps.length}건
            </span>
            <span className="text-xs text-orange-600">
              총 {Math.floor(totalCareGapMinutes / 60)}시간 {totalCareGapMinutes % 60}분
            </span>
          </div>
          <div className="mt-2 space-y-1">
            {careGaps.map((gap, i) => {
              const child = childList.find(c => c.id === gap.child_id)
              return (
                <div key={i} className="flex items-center gap-2 text-xs text-orange-700">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: child?.color }} />
                  <span>{child?.name}</span>
                  <span>{gap.start_time.slice(0, 5)} ~ {gap.end_time.slice(0, 5)}</span>
                  <span className="text-orange-500">({gap.duration_minutes}분)</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 일정이 없는 경우 */}
      {schedules.length === 0 && careGaps.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>이 날은 등록된 일정이 없습니다.</p>
        </div>
      )}

      {/* 타임라인 */}
      <div className="relative mx-4" style={{ height: `${(TIMELINE_END - TIMELINE_START) / 60 * HOUR_HEIGHT}px` }}>
        {/* 시간 그리드 라인 */}
        {hours.map(hour => {
          const top = ((hour * 60 - TIMELINE_START) / 60) * HOUR_HEIGHT
          return (
            <div key={hour} className="absolute left-0 right-0" style={{ top }}>
              <div className="flex items-start">
                <span className="text-xs text-muted-foreground w-10 -mt-2 shrink-0">
                  {hour.toString().padStart(2, '0')}시
                </span>
                <div className="flex-1 border-t border-dashed border-muted" />
              </div>
            </div>
          )
        })}

        {/* 돌봄 공백 블록 */}
        {careGaps.map((gap, i) => {
          const child = childList.find(c => c.id === gap.child_id)
          return (
            <CareGapBlock
              key={`gap-${i}`}
              gap={gap}
              childName={child?.name ?? ''}
            />
          )
        })}

        {/* 일정 블록 */}
        {schedules.map(schedule => (
          <ScheduleBlock
            key={schedule.id}
            schedule={schedule}
            onClick={() => onScheduleClick(schedule)}
          />
        ))}
      </div>
    </div>
  )
}

function ScheduleBlock({
  schedule,
  onClick,
}: {
  schedule: ResolvedSchedule
  onClick: () => void
}) {
  const startMinutes = timeToMinutes(schedule.start_time)
  const endMinutes = timeToMinutes(schedule.end_time)
  const top = ((startMinutes - TIMELINE_START) / 60) * HOUR_HEIGHT
  const height = Math.max(((endMinutes - startMinutes) / 60) * HOUR_HEIGHT, 32) // 최소 높이

  // 담당 부모 색상 또는 카테고리 색상
  const bgColor = schedule.assigned_parent?.color ?? CATEGORY_COLORS[schedule.category] ?? '#6b7280'

  return (
    <button
      onClick={onClick}
      className="absolute left-12 right-2 rounded-lg p-2 text-left transition-transform active:scale-[0.98] overflow-hidden"
      style={{
        top,
        height,
        backgroundColor: bgColor + '20',
        borderLeft: `3px solid ${bgColor}`,
      }}
    >
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0">
          <p className="text-sm font-medium truncate" style={{ color: bgColor }}>
            {schedule.title}
          </p>
          {height >= 48 && (
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                <Clock className="h-3 w-3" />
                {schedule.start_time.slice(0, 5)} ~ {schedule.end_time.slice(0, 5)}
              </span>
              {schedule.location && (
                <span className="text-xs text-muted-foreground flex items-center gap-0.5 truncate">
                  <MapPin className="h-3 w-3" />
                  {schedule.location}
                </span>
              )}
            </div>
          )}
        </div>
        {schedule.assigned_parent && (
          <Badge
            className="text-[10px] shrink-0 text-white border-0"
            style={{ backgroundColor: schedule.assigned_parent.color }}
          >
            {schedule.assigned_parent.display_name}
          </Badge>
        )}
        {!schedule.assigned_parent_id && (
          <Badge variant="destructive" className="text-[10px] shrink-0">미배정</Badge>
        )}
      </div>
      {schedule.child && height >= 64 && (
        <div className="mt-1 flex items-center gap-1">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: schedule.child.color }} />
          <span className="text-xs text-muted-foreground">{schedule.child.name}</span>
        </div>
      )}
    </button>
  )
}

function CareGapBlock({ gap, childName }: { gap: CareGap; childName: string }) {
  const startMinutes = timeToMinutes(gap.start_time)
  const endMinutes = timeToMinutes(gap.end_time)
  const top = ((startMinutes - TIMELINE_START) / 60) * HOUR_HEIGHT
  const height = Math.max(((endMinutes - startMinutes) / 60) * HOUR_HEIGHT, 24)

  return (
    <div
      className="absolute left-12 right-2 rounded-lg border border-orange-300 overflow-hidden pointer-events-none"
      style={{
        top,
        height,
        background: 'repeating-linear-gradient(135deg, transparent, transparent 4px, rgba(251,146,60,0.15) 4px, rgba(251,146,60,0.15) 8px)',
        backgroundColor: 'rgba(251,146,60,0.08)',
      }}
    >
      <div className="px-2 py-1">
        <p className="text-[10px] font-medium text-orange-600">
          공백 · {childName} · {gap.duration_minutes}분
        </p>
      </div>
    </div>
  )
}
