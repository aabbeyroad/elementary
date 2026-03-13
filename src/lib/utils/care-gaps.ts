import type { ResolvedSchedule, Child, CareGap } from '@/types/database'
import { timeToMinutes } from './schedule-helpers'

/**
 * 미배정 일정 감지 알고리즘
 *
 * 일정이 없는 시간은 화면에서 자동 "돌봄" 블록으로 채우고,
 * 여기서는 실제로 담당 부모가 비어 있는 일정만 경고 대상으로 취급합니다.
 */
export function detectCareGaps(
  child: Child,
  schedules: ResolvedSchedule[],
  date: string
): CareGap[] {
  const careStart = timeToMinutes(child.care_window_start)
  const careEnd = timeToMinutes(child.care_window_end)

  const childSchedules = schedules
    .filter(schedule => schedule.child_id === child.id && !schedule.assigned_parent_id)
    .map(s => ({
      start: Math.max(timeToMinutes(s.start_time), careStart),
      end: Math.min(timeToMinutes(s.end_time), careEnd),
    }))
    .filter(s => s.end > s.start)
    .sort((a, b) => a.start - b.start)

  return childSchedules.map(schedule => ({
    child_id: child.id,
    date,
    start_time: `${Math.floor(schedule.start / 60).toString().padStart(2, '0')}:${(schedule.start % 60).toString().padStart(2, '0')}`,
    end_time: `${Math.floor(schedule.end / 60).toString().padStart(2, '0')}:${(schedule.end % 60).toString().padStart(2, '0')}`,
    duration_minutes: schedule.end - schedule.start,
  }))
}

/**
 * 여러 자녀의 돌봄 공백을 한번에 계산
 */
export function detectAllCareGaps(
  children: Child[],
  schedules: ResolvedSchedule[],
  date: string
): CareGap[] {
  return children.flatMap(child => detectCareGaps(child, schedules, date))
}
