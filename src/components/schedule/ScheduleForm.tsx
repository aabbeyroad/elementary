'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { X, Check } from 'lucide-react'
import { CATEGORY_LABELS, DAY_LABELS } from '@/lib/utils/schedule-helpers'
import type { Schedule, Child, Profile, ScheduleCategory } from '@/types/database'
import { format } from 'date-fns'

interface ScheduleFormProps {
  familyId: string
  childList: Child[]
  parents: Profile[]
  schedule?: Schedule | null // 수정 시
  defaultDate?: Date
  onClose: () => void
  onSaved: () => void
}

export function ScheduleForm({
  familyId,
  childList,
  parents,
  schedule,
  defaultDate,
  onClose,
  onSaved,
}: ScheduleFormProps) {
  const [childId, setChildId] = useState(schedule?.child_id ?? childList[0]?.id ?? '')
  const [title, setTitle] = useState(schedule?.title ?? '')
  const [category, setCategory] = useState<ScheduleCategory>(schedule?.category as ScheduleCategory ?? 'academy')
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

  const toggleDay = (day: number) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    )
  }

  const handleSave = async () => {
    if (!childId || !title.trim()) {
      setError('자녀와 제목을 입력해주세요.')
      return
    }
    if (isRecurring && selectedDays.length === 0) {
      setError('반복 요일을 선택해주세요.')
      return
    }
    setLoading(true)
    setError('')

    try {
      if (isRecurring) {
        // 반복 일정: 선택된 각 요일에 대해 일정 생성
        if (schedule) {
          // 수정: 기존 일정 업데이트
          const { error: err } = await supabase
            .from('schedules')
            .update({
              child_id: childId,
              title: title.trim(),
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
            .eq('id', schedule.id)
          if (err) throw err
        } else {
          // 새 일정: 각 요일마다 생성
          const inserts = selectedDays.map(day => ({
            family_id: familyId,
            child_id: childId,
            title: title.trim(),
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
          const { error: err } = await supabase.from('schedules').insert(inserts)
          if (err) throw err
        }
      } else {
        // 일회성 일정
        const data = {
          family_id: familyId,
          child_id: childId,
          title: title.trim(),
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
          const { error: err } = await supabase.from('schedules').update(data).eq('id', schedule.id)
          if (err) throw err
        } else {
          const { error: err } = await supabase.from('schedules').insert(data)
          if (err) throw err
        }
      }

      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-end justify-center">
      <div className="w-full max-w-lg bg-background rounded-t-2xl max-h-[85dvh] overflow-y-auto">
        <div className="sticky top-0 bg-background border-b px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-lg font-bold">{schedule ? '일정 수정' : '일정 추가'}</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
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

          {error && <p className="text-sm text-destructive">{error}</p>}

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
