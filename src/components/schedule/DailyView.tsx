'use client'

import { memo, useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import {
  buildDisplaySchedulesForDate,
  getScheduleBlockPalette,
  rgbaFromHex,
  timeToMinutes,
} from '@/lib/utils/schedule-helpers'
import { detectCareGaps } from '@/lib/utils/care-gaps'
import type { Child, DisplaySchedule, Profile, ResolvedSchedule } from '@/types/database'
import { MapPin, Clock } from 'lucide-react'
import { Notice } from '@/components/ui/notice'
import { Card, CardContent } from '@/components/ui/card'

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
const MIN_BLOCK_HEIGHT = 14
const MINOR_INTERVAL = 10

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

  const timeMarkers = Array.from(
    { length: Math.floor((TIMELINE_END - TIMELINE_START) / MINOR_INTERVAL) + 1 },
    (_, index) => TIMELINE_START + index * MINOR_INTERVAL
  )
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
      {careGaps.length > 0 && (
        <Notice variant="warning" title={`미배정 일정 ${careGaps.length}건`}>
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span>담당자 확인이 필요한 블록만 표시됩니다.</span>
            <span>총 {Math.floor(totalCareGapMinutes / 60)}시간 {totalCareGapMinutes % 60}분</span>
          </div>
          <div className="mt-3 space-y-1.5">
            {careGaps.map((gap, i) => {
              const child = childList.find(c => c.id === gap.child_id)
              return (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: child?.color }} />
                  <span>{child?.name}</span>
                  <span>{gap.start_time.slice(0, 5)} ~ {gap.end_time.slice(0, 5)}</span>
                  <span className="opacity-75">(담당자 확인 필요)</span>
                </div>
              )
            })}
          </div>
        </Notice>
      )}

      {displaySchedules.length === 0 && careGaps.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            이 날은 등록된 일정이 없습니다.
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-5">
          {(parentLeft || parentRight) && displaySchedules.length > 0 && (
            <div className="mb-4 flex items-center pl-10">
              <div className="flex min-w-0 flex-[15] items-center justify-center gap-1">
                {parentLeft && (
                  <>
                    <div className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: parentLeft.color }} />
                    <span className="truncate text-xs font-medium" style={{ color: parentLeft.color }}>
                      {parentLeft.display_name}
                    </span>
                  </>
                )}
              </div>
              <div className="flex-[70] text-center">
                <span className="text-xs font-medium tracking-[0.04em] text-muted-foreground">아이 일정</span>
              </div>
              <div className="flex min-w-0 flex-[15] items-center justify-center gap-1">
                {parentRight && (
                  <>
                    <div className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: parentRight.color }} />
                    <span className="truncate text-xs font-medium" style={{ color: parentRight.color }}>
                      {parentRight.display_name}
                    </span>
                  </>
                )}
              </div>
            </div>
          )}

          <div className="relative" style={{ height: `${timelineHeight}px` }}>
        {timeMarkers.map(marker => {
          const top = ((marker - TIMELINE_START) / 60) * HOUR_HEIGHT
          const isHour = marker % 60 === 0
          return (
            <div key={marker} className="absolute left-0 right-0" style={{ top }}>
              <div className="flex items-start">
                <span className="w-10 shrink-0 text-xs text-muted-foreground -mt-2">
                  {isHour ? `${String(marker / 60).padStart(2, '0')}시` : ''}
                </span>
                <div className={isHour ? 'flex-1 border-t border-border/65' : 'flex-1 border-t border-dashed border-muted'} />
              </div>
            </div>
          )
        })}

            <div className="absolute inset-y-0 left-10 right-0 flex">
              <div className="relative flex-[15]">
                {parentLeft && parentLeftBlocks.map(schedule => (
                  <ParentBlock
                    key={`pl-${schedule.id}`}
                    schedule={schedule}
                    parent={parentLeft}
                  />
                ))}
              </div>

              <div className="relative mx-0.5 flex-[70]">
                {displaySchedules.map(schedule => (
                  <ChildScheduleBlock
                    key={schedule.id}
                    schedule={schedule}
                    onScheduleClick={onScheduleClick}
                  />
                ))}
              </div>

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
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * 중앙 아이 일정 블록 + 담당 부모 연결 표시
 */
const ChildScheduleBlock = memo(function ChildScheduleBlock({
  schedule,
  onScheduleClick,
}: {
  schedule: DisplaySchedule
  onScheduleClick: (schedule: ResolvedSchedule) => void
}) {
  const startMinutes = timeToMinutes(schedule.start_time)
  const endMinutes = timeToMinutes(schedule.end_time)
  const top = ((startMinutes - TIMELINE_START) / 60) * HOUR_HEIGHT
  const height = Math.max(((endMinutes - startMinutes) / 60) * HOUR_HEIGHT, MIN_BLOCK_HEIGHT)
  const palette = getScheduleBlockPalette(schedule)

  // 담당 부모 방향 결정 (좌/우 연결선)
  const isUnassigned = !schedule.isAutoCare && !schedule.assigned_parent_id
  const showText = height >= 28
  const showMeta = height >= 48
  const showChild = height >= 64
  const showBadge = height >= 24

  return (
    <button
      onClick={() => { if (!schedule.isAutoCare) onScheduleClick(schedule) }}
      className="absolute left-0 right-0 overflow-hidden rounded-[14px] p-2 text-left shadow-[var(--shadow-subtle)] transition-transform active:scale-[0.98]"
      disabled={schedule.isAutoCare}
      style={{
        top,
        height,
        backgroundColor: palette.background,
      }}
    >
      {showText && (
        <div className="flex items-start justify-between gap-1">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium" style={{ color: palette.text }}>
              {schedule.title}
            </p>
            {showMeta && (
              <div className="mt-0.5 flex items-center gap-1.5">
                <span className="flex items-center gap-0.5 text-[10px]" style={{ color: palette.mutedText }}>
                  <Clock className="h-2.5 w-2.5" />
                  {schedule.start_time.slice(0, 5)}~{schedule.end_time.slice(0, 5)}
                </span>
                {schedule.location && (
                  <span className="flex items-center gap-0.5 truncate text-[10px]" style={{ color: palette.mutedText }}>
                    <MapPin className="h-2.5 w-2.5" />
                    {schedule.location}
                  </span>
                )}
              </div>
            )}
          </div>
          {showBadge && schedule.isAutoCare && (
            <Badge className="shrink-0 border-0 px-1 py-0 text-[9px]" style={{ backgroundColor: palette.badgeBackground, color: palette.text }}>
              돌봄
            </Badge>
          )}
          {showBadge && schedule.assigned_parent && !schedule.isAutoCare && (
            <Badge
              className="shrink-0 border-0 px-1 py-0 text-[9px]"
              style={{ backgroundColor: palette.badgeBackground, color: palette.text }}
            >
              {schedule.assigned_parent.display_name}
            </Badge>
          )}
          {showBadge && isUnassigned && (
            <Badge className="shrink-0 border-0 px-1 py-0 text-[9px]" style={{ backgroundColor: palette.badgeBackground, color: palette.text }}>미배정</Badge>
          )}
        </div>
      )}
      {showChild && schedule.child && (
        <div className="mt-0.5 flex items-center gap-1">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: schedule.child.color }} />
          <span className="text-[10px]" style={{ color: palette.mutedText }}>{schedule.child.name}</span>
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
        backgroundColor: rgbaFromHex(parent.color, 0.18),
      }}
    >
      {height >= 32 && (
        <span className="px-0.5 text-center text-[9px] font-medium leading-tight truncate" style={{ color: rgbaFromHex(parent.color, 0.86) }}>
          {schedule.title}
        </span>
      )}
    </div>
  )
})
