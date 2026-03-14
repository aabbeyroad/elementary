'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { X, Check } from 'lucide-react'
import { CATEGORY_LABELS, DAY_LABELS, timeToMinutes } from '@/lib/utils/schedule-helpers'
import type { Child, Profile, Schedule, ScheduleCategory } from '@/types/database'
import { format, getDay, parseISO } from 'date-fns'

interface ScheduleFormProps {
  familyId: string
  childList: Child[]
  parents: Profile[]
  schedules: Schedule[]
  schedule?: Schedule | null // 수정 시
  defaultDate?: Date
  onClose: () => void
  onSaved: (savedSchedules?: Schedule[]) => void
}

export function ScheduleForm({
  familyId,
  childList,
  parents,
  schedules,
  schedule,
  defaultDate,
  onClose,
  onSaved,
}: ScheduleFormProps) {
  const initialOtherParts = schedule?.category === 'other'
    ? schedule.title.split(' · ', 2)
    : []
  const [childId, setChildId] = useState(schedule?.child_id ?? childList[0]?.id ?? '')
  const [title, setTitle] = useState(
    schedule?.category === 'other'
      ? initialOtherParts.length > 1
        ? initialOtherParts[1]
        : ''
      : schedule?.title ?? ''
  )
  const [category, setCategory] = useState<ScheduleCategory>(schedule?.category as ScheduleCategory ?? 'academy')
  const [otherCategoryLabel, setOtherCategoryLabel] = useState(
    schedule?.category === 'other'
      ? initialOtherParts[0] ?? schedule?.title ?? ''
      : ''
  )
  const [location, setLocation] = useState(schedule?.location ?? '')
  const [startTime, setStartTime] = useState(schedule?.start_time?.slice(0, 5) ?? '14:00')
  const [endTime, setEndTime] = useState(schedule?.end_time?.slice(0, 5) ?? '15:00')
  const [isRecurring, setIsRecurring] = useState(schedule?.is_recurring ?? true)
  const [selectedDays, setSelectedDays] = useState<number[]>(
    schedule?.is_recurring && schedule?.day_of_week != null ? [schedule.day_of_week] : []
  )
  const [specificDate, setSpecificDate] = useState(
    schedule?.specific_date ?? (defaultDate ? format(defaultDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'))
  )
  const [assignedParentId, setAssignedParentId] = useState(schedule?.assigned_parent_id ?? '')
  const [notes, setNotes] = useState(schedule?.notes ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeButtonRef.current?.focus()

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }

      if (event.key !== 'Tab' || !dialogRef.current) {
        return
      }

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
        )
      )

      if (focusable.length === 0) {
        event.preventDefault()
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    window.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
      previousFocusRef.current?.focus()
    }
  }, [onClose])

  const hasTimeRangeError = timeToMinutes(startTime) >= timeToMinutes(endTime)

  const conflictsWithExistingSchedule = (() => {
    if (!childId || hasTimeRangeError) {
      return false
    }

    const compareStart = timeToMinutes(startTime)
    const compareEnd = timeToMinutes(endTime)

    return schedules.some(existing => {
      if (schedule && existing.id === schedule.id) {
        return false
      }

      if (existing.child_id !== childId) {
        return false
      }

      const sameDay = isRecurring
        ? existing.is_recurring
          ? selectedDays.includes(existing.day_of_week ?? -1)
          : selectedDays.includes(getDay(parseISO(existing.specific_date ?? '1970-01-01')))
        : existing.is_recurring
          ? existing.day_of_week === getDay(parseISO(specificDate))
          : existing.specific_date === specificDate

      if (!sameDay) {
        return false
      }

      const existingStart = timeToMinutes(existing.start_time)
      const existingEnd = timeToMinutes(existing.end_time)

      return compareStart < existingEnd && compareEnd > existingStart
    })
  })()

  const toggleDay = (day: number) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    )
  }

  const handleSave = async () => {
    const normalizedOtherCategory = otherCategoryLabel.trim()
    const normalizedTitle = title.trim()
    const resolvedTitle = category === 'other'
      ? [normalizedOtherCategory, normalizedTitle].filter(Boolean).join(' · ')
      : normalizedTitle

    if (!childId || !resolvedTitle) {
      setError('자녀와 제목을 입력해주세요.')
      return
    }
    if (category === 'other' && !normalizedOtherCategory) {
      setError('기타 카테고리 이름을 입력해주세요.')
      return
    }
    if (timeToMinutes(startTime) >= timeToMinutes(endTime)) {
      setError('시작 시간은 종료 시간보다 빨라야 합니다.')
      return
    }
    if (isRecurring && selectedDays.length === 0) {
      setError('반복 요일을 선택해주세요.')
      return
    }
    if (conflictsWithExistingSchedule) {
      setError('같은 자녀의 다른 일정과 시간이 겹칩니다.')
      return
    }
    setLoading(true)
    setError('')

    try {
      let savedSchedules: Schedule[] = []

      if (isRecurring) {
        // 반복 일정: 선택된 각 요일에 대해 일정 생성
        if (schedule) {
          // 수정: 기존 일정 업데이트
          const { data, error: err } = await supabase
            .from('schedules')
            .update({
              child_id: childId,
              title: resolvedTitle,
              category,
              location: location.trim() || null,
              start_time: startTime,
              end_time: endTime,
              day_of_week: selectedDays[0],
              is_recurring: true,
              specific_date: null,
              assigned_parent_id: assignedParentId || null,
              notes: notes.trim() || null,
            })
            .select()
            .eq('id', schedule.id)
          if (err) throw err
          savedSchedules = data ?? []
        } else {
          // 새 일정: 각 요일마다 생성
          const inserts = selectedDays.map(day => ({
            family_id: familyId,
            child_id: childId,
            title: resolvedTitle,
            category,
            location: location.trim() || null,
            start_time: startTime,
            end_time: endTime,
            day_of_week: day,
            is_recurring: true,
            specific_date: null,
            assigned_parent_id: assignedParentId || null,
            notes: notes.trim() || null,
          }))
          const { data, error: err } = await supabase.from('schedules').insert(inserts).select()
          if (err) throw err
          savedSchedules = data ?? []
        }
      } else {
        // 일회성 일정
        const data = {
          family_id: familyId,
          child_id: childId,
          title: resolvedTitle,
          category,
          location: location.trim() || null,
          start_time: startTime,
          end_time: endTime,
          day_of_week: null,
          is_recurring: false,
          specific_date: specificDate,
          assigned_parent_id: assignedParentId || null,
          notes: notes.trim() || null,
        }

        if (schedule) {
          const { data: updatedRows, error: err } = await supabase
            .from('schedules')
            .update(data)
            .select()
            .eq('id', schedule.id)
          if (err) throw err
          savedSchedules = updatedRows ?? []
        } else {
          const { data: insertedRows, error: err } = await supabase.from('schedules').insert(data).select()
          if (err) throw err
          savedSchedules = insertedRows ?? []
        }
      }

      onSaved(savedSchedules)
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-end justify-center" onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="schedule-form-title"
        className="w-full max-w-lg bg-background rounded-t-2xl max-h-[85dvh] overflow-y-auto"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 bg-background border-b px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 id="schedule-form-title" className="text-lg font-bold">{schedule ? '일정 수정' : '일정 추가'}</h2>
          <Button ref={closeButtonRef} variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-6 space-y-4">
          {/* 자녀 선택 */}
          <div className="space-y-1.5">
            <Label>자녀 *</Label>
            <div className="flex gap-2 flex-wrap">
              {childList.map(child => (
                <button
                  key={child.id}
                  type="button"
                  onClick={() => setChildId(child.id)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                    childId === child.id
                      ? 'text-white shadow-sm'
                      : 'bg-muted text-muted-foreground'
                  }`}
                  style={childId === child.id ? { backgroundColor: child.color } : {}}
                >
                  {child.name}
                </button>
              ))}
            </div>
          </div>

          {/* 제목 */}
          <div className="space-y-1.5">
            <Label>일정 이름 *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 수학 학원, 태권도" />
          </div>

          {/* 카테고리 */}
          <div className="space-y-1.5">
            <Label>카테고리</Label>
            <div className="flex gap-2 flex-wrap">
              {Object.entries(CATEGORY_LABELS).filter(([k]) => k !== 'custom').map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setCategory(key as ScheduleCategory)}
                  className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                    category === key
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {category === 'other' && (
            <div className="space-y-1.5">
              <Label>기타 카테고리 이름 *</Label>
              <Input
                value={otherCategoryLabel}
                onChange={(e) => setOtherCategoryLabel(e.target.value)}
                placeholder="예: 병원, 체험활동, 친구 약속"
              />
              <p className="text-xs text-muted-foreground">
                입력한 값은 일정 제목 앞에 함께 저장됩니다.
              </p>
            </div>
          )}

          {/* 시간 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>시작 시간</Label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} step={300} />
            </div>
            <div className="space-y-1.5">
              <Label>종료 시간</Label>
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} step={300} />
            </div>
          </div>
          {hasTimeRangeError && (
            <p className="text-sm text-destructive">시작 시간은 종료 시간보다 빨라야 합니다.</p>
          )}

          {/* 반복/일회성 */}
          <div className="space-y-1.5">
            <Label>일정 유형</Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsRecurring(true)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                  isRecurring ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}
              >
                매주 반복
              </button>
              <button
                type="button"
                onClick={() => setIsRecurring(false)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                  !isRecurring ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}
              >
                이번만
              </button>
            </div>
          </div>

          {/* 반복 요일 또는 날짜 선택 */}
          {isRecurring ? (
            <div className="space-y-1.5">
              <Label>반복 요일</Label>
              <div className="flex gap-1.5">
                {DAY_LABELS.map((label, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => toggleDay(idx)}
                    className={`w-10 h-10 rounded-full text-sm font-medium transition-all ${
                      selectedDays.includes(idx)
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    } ${idx === 0 ? 'text-red-500' : ''} ${idx === 6 ? 'text-blue-500' : ''}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label>날짜</Label>
              <Input type="date" value={specificDate} onChange={(e) => setSpecificDate(e.target.value)} />
            </div>
          )}

          {/* 담당 부모 */}
          <div className="space-y-1.5">
            <Label>담당 부모</Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setAssignedParentId('')}
                className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                  !assignedParentId ? 'bg-orange-100 text-orange-800 ring-1 ring-orange-300' : 'bg-muted text-muted-foreground'
                }`}
              >
                미배정
              </button>
              {parents.map(parent => (
                <button
                  key={parent.id}
                  type="button"
                  onClick={() => setAssignedParentId(parent.id)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                    assignedParentId === parent.id ? 'text-white' : 'bg-muted text-muted-foreground'
                  }`}
                  style={assignedParentId === parent.id ? { backgroundColor: parent.color } : {}}
                >
                  {parent.display_name}
                </button>
              ))}
            </div>
          </div>

          {/* 장소 */}
          <div className="space-y-1.5">
            <Label>장소 (선택)</Label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="예: 강남 학원" />
          </div>

          {/* 메모 */}
          <div className="space-y-1.5">
            <Label>메모 (선택)</Label>
            <textarea
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[60px]"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="추가 메모"
            />
          </div>

          {(conflictsWithExistingSchedule && !error) && (
            <p className="text-sm text-destructive">같은 자녀의 다른 일정과 시간이 겹칩니다.</p>
          )}
          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}

          <div className="pb-4">
            <Button onClick={handleSave} disabled={loading} className="w-full h-12">
              <Check className="h-4 w-4 mr-1" />
              {loading ? '저장 중...' : schedule ? '수정 완료' : '일정 추가'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
