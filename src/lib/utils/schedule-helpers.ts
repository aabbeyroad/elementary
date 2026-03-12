import { format, getDay } from 'date-fns'
import type { Schedule, ScheduleOverride, ResolvedSchedule, Child, Profile } from '@/types/database'

/**
 * 특정 날짜에 해당하는 일정 목록을 계산합니다.
 * - 반복 일정: day_of_week가 해당 요일과 일치하는 일정
 * - 일회성 일정: specific_date가 해당 날짜와 일치하는 일정
 * - 예외 처리: schedule_overrides로 취소/변경된 일정 반영
 */
export function resolveSchedulesForDate(
  date: Date,
  schedules: Schedule[],
  overrides: ScheduleOverride[],
  children: Child[],
  parents: Profile[]
): ResolvedSchedule[] {
  const dateStr = format(date, 'yyyy-MM-dd')
  const dayOfWeek = getDay(date) // 0=일, 1=월, ..., 6=토

  const result: ResolvedSchedule[] = []

  for (const schedule of schedules) {
    // 이 일정이 해당 날짜에 적용되는지 확인
    const isApplicable = schedule.is_recurring
      ? schedule.day_of_week === dayOfWeek
      : schedule.specific_date === dateStr

    if (!isApplicable) continue

    // 예외 처리 확인
    const override = overrides.find(
      o => o.schedule_id === schedule.id && o.override_date === dateStr
    )

    // 취소된 일정은 건너뜀
    if (override?.is_cancelled) continue

    const resolved: ResolvedSchedule = {
      id: schedule.id,
      family_id: schedule.family_id,
      child_id: schedule.child_id,
      title: schedule.title,
      category: schedule.category,
      custom_category_id: schedule.custom_category_id,
      location: override?.override_notes ? schedule.location : schedule.location,
      start_time: override?.override_start_time ?? schedule.start_time,
      end_time: override?.override_end_time ?? schedule.end_time,
      assigned_parent_id: override?.override_assigned_parent_id ?? schedule.assigned_parent_id,
      notes: override?.override_notes ?? schedule.notes,
      date: dateStr,
      is_overridden: !!override,
      is_cancelled: false,
      child: children.find(c => c.id === schedule.child_id),
      assigned_parent: parents.find(p => p.id === (override?.override_assigned_parent_id ?? schedule.assigned_parent_id)),
      created_at: schedule.created_at,
      updated_at: schedule.updated_at,
    }

    result.push(resolved)
  }

  // 시작 시간 순으로 정렬
  return result.sort((a, b) => a.start_time.localeCompare(b.start_time))
}

/**
 * 시간 문자열 "HH:MM"을 분 단위로 변환
 */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

/**
 * 분 단위를 "HH:MM" 형식으로 변환
 */
export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
}

/**
 * 카테고리별 한국어 라벨
 */
export const CATEGORY_LABELS: Record<string, string> = {
  school: '학교수업',
  academy: '학원',
  pickup: '픽업',
  dropoff: '드롭오프',
  other: '기타',
  custom: '사용자 정의',
}

/**
 * 카테고리별 기본 색상
 */
export const CATEGORY_COLORS: Record<string, string> = {
  school: '#3b82f6',
  academy: '#8b5cf6',
  pickup: '#f59e0b',
  dropoff: '#ef4444',
  other: '#6b7280',
  custom: '#ec4899',
}

/**
 * 요일 한국어 라벨
 */
export const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']
