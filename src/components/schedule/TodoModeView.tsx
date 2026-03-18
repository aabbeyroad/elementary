'use client'

import { useState, useMemo, useCallback, startTransition, useEffect } from 'react'
import {
  format,
  addDays,
  addWeeks,
  addMonths,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
} from 'date-fns'
import { ko } from 'date-fns/locale'
import { Square, CheckSquare } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { DateNavigator } from '@/components/schedule/DateNavigator'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { resolveSchedulesForDate, CATEGORY_LABELS } from '@/lib/utils/schedule-helpers'
import { createClient } from '@/lib/supabase/client'
import type { Child, Profile, ResolvedSchedule, Schedule, ScheduleOverride, Supply } from '@/types/database'

type TodoPeriod = 'day' | 'week' | 'month'

interface TodoModeViewProps {
  familyId: string
  schedules: Schedule[]
  overrides: ScheduleOverride[]
  childList: Child[]
  parents: Profile[]
  loading: boolean
  initialPeriod?: TodoPeriod
}

interface ParentSection {
  parent: Profile | null
  tasks: ResolvedSchedule[]
}

export function TodoModeView({
  familyId,
  schedules,
  overrides,
  childList,
  parents,
  loading,
  initialPeriod = 'day',
}: TodoModeViewProps) {
  const [period, setPeriod] = useState<TodoPeriod>(initialPeriod)
  const [baseDate, setBaseDate] = useState(new Date())
  const [supplies, setSupplies] = useState<Supply[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [suppliesLoading, setSuppliesLoading] = useState(true)

  useEffect(() => {
    const fetchSupplies = async () => {
      setSuppliesLoading(true)
      const supabase = createClient()
      const [{ data: { user } }, { data }] = await Promise.all([
        supabase.auth.getUser(),
        supabase
          .from('supplies')
          .select('*')
          .eq('family_id', familyId)
          .order('target_date')
          .order('created_at'),
      ])
      if (user) setUserId(user.id)
      if (data) setSupplies(data)
      setSuppliesLoading(false)
    }
    fetchSupplies()
  }, [familyId])

  // Date range for selected period
  const dateRange = useMemo(() => {
    switch (period) {
      case 'day':
        return [baseDate]
      case 'week': {
        const start = startOfWeek(baseDate, { weekStartsOn: 1 })
        const end = endOfWeek(baseDate, { weekStartsOn: 1 })
        return eachDayOfInterval({ start, end })
      }
      case 'month': {
        const start = startOfMonth(baseDate)
        const end = endOfMonth(baseDate)
        return eachDayOfInterval({ start, end })
      }
    }
  }, [period, baseDate])

  // Navigation label
  const navLabel = useMemo(() => {
    if (period === 'day') return format(baseDate, 'M월 d일 (EEEE)', { locale: ko })
    if (period === 'week') {
      const start = startOfWeek(baseDate, { weekStartsOn: 1 })
      const end = endOfWeek(baseDate, { weekStartsOn: 1 })
      return `${format(start, 'M.d', { locale: ko })} ~ ${format(end, 'M.d', { locale: ko })}`
    }
    return format(baseDate, 'yyyy년 M월', { locale: ko })
  }, [period, baseDate])

  const goToPrev = useCallback(() =>
    startTransition(() =>
      setBaseDate(prev => {
        if (period === 'day') return addDays(prev, -1)
        if (period === 'week') return addWeeks(prev, -1)
        return addMonths(prev, -1)
      })
    ), [period])

  const goToNext = useCallback(() =>
    startTransition(() =>
      setBaseDate(prev => {
        if (period === 'day') return addDays(prev, 1)
        if (period === 'week') return addWeeks(prev, 1)
        return addMonths(prev, 1)
      })
    ), [period])

  // Resolve all schedules for the date range, grouped by parent
  const parentSections = useMemo((): ParentSection[] => {
    const allResolved = dateRange.flatMap(day =>
      resolveSchedulesForDate(day, schedules, overrides, childList, parents)
    )

    const byParentId = new Map<string | null, ResolvedSchedule[]>()
    for (const task of allResolved) {
      const key = task.assigned_parent_id
      if (!byParentId.has(key)) byParentId.set(key, [])
      byParentId.get(key)!.push(task)
    }

    const sections: ParentSection[] = parents.map(parent => ({
      parent,
      tasks: byParentId.get(parent.id) ?? [],
    }))

    const unassigned = byParentId.get(null) ?? []
    if (unassigned.length > 0) {
      sections.push({ parent: null, tasks: unassigned })
    }

    return sections
  }, [dateRange, schedules, overrides, childList, parents])

  // Filter supplies for the selected date range
  const suppliesInRange = useMemo(() => {
    if (dateRange.length === 0) return []
    const startStr = format(dateRange[0], 'yyyy-MM-dd')
    const endStr = format(dateRange[dateRange.length - 1], 'yyyy-MM-dd')
    return supplies.filter(s => {
      if (!s.target_date) return false
      return s.target_date >= startStr && s.target_date <= endStr
    })
  }, [supplies, dateRange])

  // Group supplies by child
  const suppliesByChildId = useMemo(() => {
    const map = new Map<string, Supply[]>()
    for (const s of suppliesInRange) {
      if (!map.has(s.child_id)) map.set(s.child_id, [])
      map.get(s.child_id)!.push(s)
    }
    return map
  }, [suppliesInRange])

  const toggleSupply = async (supply: Supply) => {
    const supabase = createClient()
    const now = new Date().toISOString()
    const updated = {
      is_checked: !supply.is_checked,
      checked_at: !supply.is_checked ? now : null,
      checked_by: !supply.is_checked ? userId : null,
    }
    setSupplies(prev => prev.map(s => s.id === supply.id ? { ...s, ...updated } : s))
    await supabase.from('supplies').update(updated).eq('id', supply.id)
  }

  const isOverallLoading = loading || suppliesLoading
  const hasSomething = parentSections.some(s => s.tasks.length > 0) || suppliesInRange.length > 0

  return (
    <div className="space-y-4">
      {/* Period selector */}
      <SegmentedControl
        className="max-w-[360px]"
        items={[
          {
            label: '오늘',
            active: period === 'day',
            onClick: () => { setPeriod('day'); setBaseDate(new Date()) },
          },
          { label: '주간', active: period === 'week', onClick: () => setPeriod('week') },
          { label: '월간', active: period === 'month', onClick: () => setPeriod('month') },
        ]}
      />

      {/* Date navigator */}
      <DateNavigator label={navLabel} onPrev={goToPrev} onNext={goToNext} />

      {isOverallLoading ? (
        <TodoSkeleton />
      ) : !hasSomething ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-muted-foreground">이 기간에 등록된 일정이 없습니다.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {/* Parent task sections */}
          {parentSections.map(({ parent, tasks }) => {
            if (tasks.length === 0) return null
            const sectionKey = parent?.id ?? 'unassigned'
            return (
              <Card key={sectionKey}>
                <CardContent className="p-4">
                  {/* Parent header */}
                  <div className="flex items-center gap-2.5 mb-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                      style={{ backgroundColor: parent?.color ?? '#9ca3af' }}
                    >
                      {parent?.display_name?.[0] ?? '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold leading-none">
                        {parent?.display_name ?? '미배정'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        담당 일정 {tasks.length}개
                      </p>
                    </div>
                  </div>

                  {/* Task list */}
                  <div className="space-y-0 divide-y divide-border/40">
                    {tasks.map(task => {
                      const child = childList.find(c => c.id === task.child_id)
                      const showDate = period !== 'day'
                      return (
                        <div
                          key={`${task.id}-${task.date}`}
                          className="flex items-start gap-2.5 py-2.5"
                        >
                          <div
                            className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                            style={{ backgroundColor: child?.color ?? '#9ca3af' }}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium leading-snug">{task.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {task.start_time.slice(0, 5)}–{task.end_time.slice(0, 5)}
                              {child ? ` · ${child.name}` : ''}
                              {showDate ? ` · ${format(new Date(task.date), 'M/d (EEE)', { locale: ko })}` : ''}
                            </p>
                            {task.location && (
                              <p className="text-xs text-muted-foreground">{task.location}</p>
                            )}
                          </div>
                          <span className="text-[10px] text-muted-foreground bg-secondary rounded-full px-1.5 py-0.5 shrink-0">
                            {CATEGORY_LABELS[task.category] ?? task.category}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )
          })}

          {/* Supplies section per child */}
          {suppliesByChildId.size > 0 && (
            <div className="space-y-3">
              {childList.map(child => {
                const childSupplies = suppliesByChildId.get(child.id)
                if (!childSupplies || childSupplies.length === 0) return null
                const unchecked = childSupplies.filter(s => !s.is_checked).length
                return (
                  <Card key={child.id}>
                    <CardContent className="p-4">
                      {/* Child header */}
                      <div className="flex items-center gap-2.5 mb-3">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                          style={{ backgroundColor: child.color }}
                        >
                          {child.name[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold leading-none">{child.name} 준비물</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {unchecked > 0 ? `${unchecked}개 미확인` : '모두 완료 ✓'}
                          </p>
                        </div>
                      </div>

                      {/* Supply list */}
                      <div className="space-y-1">
                        {childSupplies.map(supply => (
                          <button
                            key={supply.id}
                            onClick={() => toggleSupply(supply)}
                            className="flex items-center gap-2.5 w-full text-left py-1.5"
                          >
                            {supply.is_checked ? (
                              <CheckSquare className="h-4.5 w-4.5 text-green-500 shrink-0" />
                            ) : (
                              <Square className="h-4.5 w-4.5 text-muted-foreground shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <span
                                className={`text-sm ${
                                  supply.is_checked
                                    ? 'line-through text-muted-foreground'
                                    : 'font-medium'
                                }`}
                              >
                                {supply.title}
                              </span>
                              {(supply.notes || (supply.target_date && period !== 'day')) && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {supply.target_date && period !== 'day'
                                    ? format(new Date(supply.target_date), 'M/d (EEE)', { locale: ko })
                                    : ''}
                                  {supply.notes && supply.target_date && period !== 'day' ? ' · ' : ''}
                                  {supply.notes ?? ''}
                                </p>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function TodoSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {[1, 2, 3].map(i => (
        <div key={i} className="surface-card-muted rounded-2xl" style={{ height: `${80 + i * 24}px` }} />
      ))}
    </div>
  )
}
