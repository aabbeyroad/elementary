'use client'

import { memo, useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { buildDisplaySchedulesForDate, CATEGORY_COLORS, timeToMinutes } from '@/lib/utils/schedule-helpers'
import { detectCareGaps } from '@/lib/utils/care-gaps'
import type { Child, DisplaySchedule, Profile, ResolvedSchedule } from '@/types/database'
import { MapPin, Clock } from 'lucide-react'

interface DailyViewProps {
  schedules: ResolvedSchedule[]
  childList: Child[]
  parents: Profile[]
  date: string
  onScheduleClick: (schedule: ResolvedSchedule) => void
}

// 타임라인 시간 범위 (7:00 ~ 21:00)
const TIMELINE_START = 7 * 60
const TIMELINE_END = 21 * 60
const HOUR_HEIGHT = 64

/**
 * 3컬럼 일간 타임라인 뷰
 * 좌: 부모1 | 중앙: 아이 일정(70%) | 우: 부모2
 * 아이 블록에 담당 부모가 배정되면 해당 부모 컬럼에 연결선 표시
 */
export function DailyView({ schedules, childList, parents, date, onScheduleClick }: DailyViewProps) {
  const displaySchedules = useMemo(
    () =>
      childList.flatMap(child =>
        buildDisplaySchedulesForDate(new Date(`${date}T00:00:00`), child, schedules)
      ),
    [childList, date, schedules]
  )

  const careGaps = useMemo(() =>
    childList.flatMap(child => detectCareGaps(child, schedules, date)),
    [childList, schedules, date]
  )

  const hours = Array.from({ length: 14 }, (_, i) => i + 7)
  const totalCareGapMinutes = careGaps.reduce((sum, gap) => sum + gap.duration_minutes, 0)

  // 부모 2명을 좌/우로 배치 (등록 순서)
  const [parentLeft, parentRight] = useMemo(() => {
    const sorted = [...parents].sort((a, b) => a.created_at.localeCompare(b.created_at))
    return [sorted[0] ?? null, sorted[1] ?? null]
  }, [parents])

  // 각 부모의 담당 일정을 시간대별로 추출
  const parentLeftBlocks = useMemo(() =>
    parentLeft ? displaySchedules.filter(s => s.assigned_parent_id === parentLeft.id && !s.isAutoCare) : [],
    [displaySchedules, parentLeft]
  )
  const parentRightBlocks = useMemo(() =>
    parentRight ? displaySchedules.filter(s => s.assigned_parent_id === parentRight.id && !s.isAutoCare) : [],
    [displaySchedules, parentRight]
  )

  const timelineHeight = (TIMELINE_END - TIMELINE_START) / 60 * HOUR_HEIGHT

  return (
    <div className="space-y-3">
      {/* 미배정 일정 요약 */}
      {careGaps.length > 0 && (
        <div className="mx-4 rounded-lg border border-orange-200 bg-orange-50 p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-orange-800">
              미배정 일정 {careGaps.length}건
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
                  <span className="text-orange-500">(담당자 확인 필요)</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 일정이 없는 경우 */}
      {displaySchedules.length === 0 && careGaps.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>이 날은 등록된 일정이 없습니다.</p>
        </div>
      )}

      {/* 부모 컬럼 헤더 */}
      {(parentLeft || parentRight) && displaySchedules.length > 0 && (
        <div className="mx-4 flex items-center" style={{ paddingLeft: '40px' }}>
          <div className="flex-[15] flex items-center justify-center gap-1 min-w-0">
            {parentLeft && (
              <>
                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: parentLeft.color }} />
                <span className="text-xs font-medium truncate" style={{ color: parentLeft.color }}>
                  {parentLeft.display_name}
                </span>
              </>
            )}
          </div>
          <div className="flex-[70] text-center">
            <span className="text-xs font-medium text-muted-foreground">아이 일정</span>
          </div>
          <div className="flex-[15] flex items-center justify-center gap-1 min-w-0">
            {parentRight && (
              <>
                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: parentRight.color }} />
                <span className="text-xs font-medium truncate" style={{ color: parentRight.color }}>
                  {parentRight.display_name}
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {/* 3컬럼 타임라인 */}
      <div className="relative mx-4" style={{ height: `${timelineHeight}px` }}>
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

        {/* 3컬럼 영역 (시간 라벨 우측) */}
        <div className="absolute left-10 right-0 top-0 bottom-0 flex">
          {/* 좌: 부모1 컬럼 */}
          <div className="relative flex-[15]">
            {parentLeft && parentLeftBlocks.map(schedule => (
              <ParentBlock
                key={`pl-${schedule.id}`}
                schedule={schedule}
                parent={parentLeft}
              />
            ))}
          </div>

          {/* 중앙: 아이 일정 (70%) */}
          <div className="relative flex-[70] mx-0.5">
            {displaySchedules.map(schedule => (
              <ChildScheduleBlock
                key={schedule.id}
                schedule={schedule}
                parentLeft={parentLeft}
                parentRight={parentRight}
                onScheduleClick={onScheduleClick}
              />
            ))}
          </div>

          {/* 우: 부모2 컬럼 */}
          <div className="relative flex-[15]">
            {parentRight && parentRightBlocks.map(schedule => (
              <ParentBlock
                key={`pr-${schedule.id}`}
                schedule={schedule}
                parent={parentRight}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * 중앙 아이 일정 블록 + 담당 부모 연결 표시
 */
const ChildScheduleBlock = memo(function ChildScheduleBlock({
  schedule,
  parentLeft,
  parentRight,
  onScheduleClick,
}: {
  schedule: DisplaySchedule
  parentLeft: Profile | null
  parentRight: Profile | null
  onScheduleClick: (schedule: ResolvedSchedule) => void
}) {
  const startMinutes = timeToMinutes(schedule.start_time)
  const endMinutes = timeToMinutes(schedule.end_time)
  const top = ((startMinutes - TIMELINE_START) / 60) * HOUR_HEIGHT
  const height = Math.max(((endMinutes - startMinutes) / 60) * HOUR_HEIGHT, 32)

  const bgColor = schedule.isAutoCare
    ? '#16a34a'
    : schedule.assigned_parent?.color ?? CATEGORY_COLORS[schedule.category] ?? '#6b7280'

  // 담당 부모 방향 결정 (좌/우 연결선)
  const isAssignedLeft = !schedule.isAutoCare && schedule.assigned_parent_id && parentLeft?.id === schedule.assigned_parent_id
  const isAssignedRight = !schedule.isAutoCare && schedule.assigned_parent_id && parentRight?.id === schedule.assigned_parent_id
  const isUnassigned = !schedule.isAutoCare && !schedule.assigned_parent_id

  return (
    <button
      onClick={() => { if (!schedule.isAutoCare) onScheduleClick(schedule) }}
      className="absolute left-0 right-0 rounded-lg p-1.5 text-left transition-transform active:scale-[0.98] overflow-hidden"
      disabled={schedule.isAutoCare}
      style={{
        top,
        height,
        backgroundColor: schedule.isAutoCare ? '#dcfce7' : bgColor + '20',
        // 담당 부모 방향에 따라 해당 쪽 보더를 강조
        borderLeft: isAssignedLeft ? `4px solid ${bgColor}` : (isUnassigned ? '3px solid #f97316' : '1px solid transparent'),
        borderRight: isAssignedRight ? `4px solid ${bgColor}` : '1px solid transparent',
        borderTop: schedule.isAutoCare ? '1px dashed #86efac' : undefined,
        borderBottom: schedule.isAutoCare ? '1px dashed #86efac' : undefined,
      }}
    >
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium truncate" style={{ color: bgColor }}>
            {schedule.title}
          </p>
          {height >= 44 && (
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                <Clock className="h-2.5 w-2.5" />
                {schedule.start_time.slice(0, 5)}~{schedule.end_time.slice(0, 5)}
              </span>
              {schedule.location && (
                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 truncate">
                  <MapPin className="h-2.5 w-2.5" />
                  {schedule.location}
                </span>
              )}
            </div>
          )}
        </div>
        {schedule.isAutoCare && (
          <Badge className="text-[9px] shrink-0 text-white border-0 bg-green-600 px-1 py-0">
            돌봄
          </Badge>
        )}
        {schedule.assigned_parent && !schedule.isAutoCare && (
          <Badge
            className="text-[9px] shrink-0 text-white border-0 px-1 py-0"
            style={{ backgroundColor: schedule.assigned_parent.color }}
          >
            {schedule.assigned_parent.display_name}
          </Badge>
        )}
        {isUnassigned && (
          <Badge variant="destructive" className="text-[9px] shrink-0 px-1 py-0">미배정</Badge>
        )}
      </div>
      {schedule.child && height >= 56 && (
        <div className="mt-0.5 flex items-center gap-1">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: schedule.child.color }} />
          <span className="text-[10px] text-muted-foreground">{schedule.child.name}</span>
        </div>
      )}
    </button>
  )
})

/**
 * 좌/우 부모 타임라인 블록
 * 해당 부모가 담당하는 시간대를 색상 바로 표시
 */
const ParentBlock = memo(function ParentBlock({
  schedule,
  parent,
}: {
  schedule: DisplaySchedule
  parent: Profile
}) {
  const startMinutes = timeToMinutes(schedule.start_time)
  const endMinutes = timeToMinutes(schedule.end_time)
  const top = ((startMinutes - TIMELINE_START) / 60) * HOUR_HEIGHT
  const height = Math.max(((endMinutes - startMinutes) / 60) * HOUR_HEIGHT, 24)

  return (
    <div
      className="absolute left-0 right-0 rounded-md flex items-center justify-center overflow-hidden"
      style={{
        top,
        height,
        backgroundColor: parent.color + '30',
        borderLeft: `3px solid ${parent.color}`,
      }}
    >
      {height >= 32 && (
        <span className="text-[9px] font-medium px-0.5 text-center leading-tight truncate" style={{ color: parent.color }}>
          {schedule.title}
        </span>
      )}
    </div>
  )
})
