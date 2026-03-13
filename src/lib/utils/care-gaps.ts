import type { ResolvedSchedule, Child, CareGap } from '@/types/database'
import { timeToMinutes, minutesToTime } from './schedule-helpers'

/**
 * 돌봄 공백 감지 알고리즘
 *
 * 아이의 돌봄 시간대(care_window_start ~ care_window_end) 내에서
 * 담당 부모가 배정되지 않은 시간 구간을 찾습니다.
 *
 * 로직:
 * 1. 해당 아이의 일정을 시작 시간 순으로 정렬
 * 2. 돌봄 시간대 시작부터 끝까지 순회하며 공백 구간을 탐지
 * 3. 5분 이하의 공백은 무시 (이동 시간 등)
 */
export function detectCareGaps(
  child: Child,
  schedules: ResolvedSchedule[],
  date: string
): CareGap[] {
  const careStart = timeToMinutes(child.care_window_start)
  const careEnd = timeToMinutes(child.care_window_end)

  // 해당 아이의 일정만 필터링하고, 담당 부모가 있는 일정만 포함
  const childSchedules = schedules
    .filter(s => s.child_id === child.id && s.assigned_parent_id)
    .map(s => ({
      start: timeToMinutes(s.start_time),
      end: timeToMinutes(s.end_time),
    }))
    .filter(s => s.end > careStart && s.start < careEnd) // 돌봄 시간대와 겹치는 일정만
    .sort((a, b) => a.start - b.start)

  const gaps: CareGap[] = []
  let currentTime = careStart

  for (const schedule of childSchedules) {
    const scheduleStart = Math.max(schedule.start, careStart)
    const scheduleEnd = Math.min(schedule.end, careEnd)

    // 현재 시간과 다음 일정 사이에 공백이 있는 경우
    if (scheduleStart > currentTime) {
      const gapDuration = scheduleStart - currentTime
      // 5분 이상의 공백만 감지
      if (gapDuration >= 5) {
        gaps.push({
          child_id: child.id,
          date,
          start_time: minutesToTime(currentTime),
          end_time: minutesToTime(scheduleStart),
          duration_minutes: gapDuration,
        })
      }
    }

    currentTime = Math.max(currentTime, scheduleEnd)
  }

  // 마지막 일정 이후부터 돌봄 종료까지 공백 확인
  if (currentTime < careEnd) {
    const gapDuration = careEnd - currentTime
    if (gapDuration >= 5) {
      gaps.push({
        child_id: child.id,
        date,
        start_time: minutesToTime(currentTime),
        end_time: minutesToTime(careEnd),
        duration_minutes: gapDuration,
      })
    }
  }

  return gaps
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
