import { format, getDay } from 'date-fns'
import type {
  Child,
  DisplaySchedule,
  Profile,
  ResolvedSchedule,
  Schedule,
  ScheduleOverride,
} from '@/types/database'

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

export function buildDisplaySchedulesForDate(
  date: Date,
  child: Child,
  schedules: ResolvedSchedule[]
): DisplaySchedule[] {
  const careWindowStart = timeToMinutes(child.care_window_start)
  const careWindowEnd = timeToMinutes(child.care_window_end)
  const childSchedules = schedules
    .filter(schedule => schedule.child_id === child.id)
    .sort((left, right) => left.start_time.localeCompare(right.start_time))

  const displaySchedules: DisplaySchedule[] = []
  let cursor = careWindowStart

  for (const schedule of childSchedules) {
    const startMinutes = timeToMinutes(schedule.start_time)
    const endMinutes = timeToMinutes(schedule.end_time)

    if (startMinutes > cursor) {
      displaySchedules.push({
        id: `auto-care-${child.id}-${format(date, 'yyyy-MM-dd')}-${cursor}-${startMinutes}`,
        family_id: child.family_id,
        child_id: child.id,
        title: '돌봄',
        category: 'other',
        custom_category_id: null,
        location: '자동 채움',
        start_time: minutesToTime(cursor),
        end_time: minutesToTime(startMinutes),
        assigned_parent_id: null,
        notes: '명시된 일정 외 시간은 자동으로 돌봄 블록으로 표시됩니다.',
        created_at: schedule.created_at,
        updated_at: schedule.updated_at,
        date: format(date, 'yyyy-MM-dd'),
        is_overridden: false,
        is_cancelled: false,
        child,
        isAutoCare: true,
      })
    }

    displaySchedules.push(schedule)
    cursor = Math.max(cursor, endMinutes)
  }

  if (cursor < careWindowEnd) {
    const fallbackSchedule = childSchedules[childSchedules.length - 1]

    displaySchedules.push({
      id: `auto-care-${child.id}-${format(date, 'yyyy-MM-dd')}-${cursor}-${careWindowEnd}`,
      family_id: child.family_id,
      child_id: child.id,
      title: '돌봄',
      category: 'other',
      custom_category_id: null,
      location: '자동 채움',
      start_time: minutesToTime(cursor),
      end_time: minutesToTime(careWindowEnd),
      assigned_parent_id: null,
      notes: '명시된 일정 외 시간은 자동으로 돌봄 블록으로 표시됩니다.',
      created_at: fallbackSchedule?.created_at ?? new Date().toISOString(),
      updated_at: fallbackSchedule?.updated_at ?? new Date().toISOString(),
      date: format(date, 'yyyy-MM-dd'),
      is_overridden: false,
      is_cancelled: false,
      child,
      isAutoCare: true,
    })
  }

  return displaySchedules.sort((a, b) => a.start_time.localeCompare(b.start_time))
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

function normalizeHexColor(hex: string) {
  if (hex.length === 4) {
    return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
  }
  return hex
}

function parseHexColor(hex: string) {
  const normalized = normalizeHexColor(hex)
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(normalized)
  if (!match) {
    return { r: 107, g: 114, b: 128 }
  }

  return {
    r: Number.parseInt(match[1], 16),
    g: Number.parseInt(match[2], 16),
    b: Number.parseInt(match[3], 16),
  }
}

export function rgbaFromHex(hex: string, alpha: number) {
  const { r, g, b } = parseHexColor(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export function tintFromHex(hex: string, amount = 0.82) {
  const { r, g, b } = parseHexColor(hex)
  const mix = (channel: number) => Math.round(channel + (255 - channel) * amount)
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`
}

export function getScheduleBlockPalette(
  schedule: Pick<DisplaySchedule, 'category' | 'assigned_parent' | 'isAutoCare'>
) {
  const baseColor = schedule.isAutoCare
    ? '#34c759'
    : schedule.assigned_parent?.color ?? CATEGORY_COLORS[schedule.category] ?? '#6b7280'

  return {
    base: baseColor,
    background: schedule.isAutoCare ? rgbaFromHex(baseColor, 0.17) : tintFromHex(baseColor, 0.78),
    text: schedule.isAutoCare ? rgbaFromHex('#1f6f43', 0.96) : rgbaFromHex(baseColor, 0.92),
    mutedText: schedule.isAutoCare ? rgbaFromHex('#1f6f43', 0.72) : rgbaFromHex(baseColor, 0.72),
    badgeBackground: schedule.isAutoCare ? rgbaFromHex('#ffffff', 0.72) : rgbaFromHex('#ffffff', 0.56),
  }
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
  school: '#4f8ff7',
  academy: '#8a7cf6',
  pickup: '#f3a341',
  dropoff: '#ef6a5f',
  other: '#7c8596',
  custom: '#d96fb8',
}

/**
 * 요일 한국어 라벨
 */
export const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']
