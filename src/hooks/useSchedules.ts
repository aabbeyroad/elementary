'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRealtimeSync } from './useRealtimeSync'
import type { Schedule, ScheduleOverride, Child, Profile } from '@/types/database'

// 가족의 일정 데이터를 가져오고 관리하는 훅 (실시간 동기화 포함)
export function useSchedules(familyId: string) {
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [overrides, setOverrides] = useState<ScheduleOverride[]>([])
  const [children, setChildren] = useState<Child[]>([])
  const [parents, setParents] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAll = useCallback(async () => {
    const supabase = createClient()
    setLoading(true)
    const [schedulesRes, overridesRes, childrenRes, parentsRes] = await Promise.all([
      supabase.from('schedules').select('*').eq('family_id', familyId),
      supabase.from('schedule_overrides').select('*, schedules!inner(family_id)').eq('schedules.family_id', familyId),
      supabase.from('children').select('*').eq('family_id', familyId).order('sort_order'),
      supabase.from('profiles').select('*').eq('family_id', familyId),
    ])

    if (schedulesRes.data) setSchedules(schedulesRes.data)
    if (overridesRes.data) setOverrides(overridesRes.data)
    if (childrenRes.data) setChildren(childrenRes.data)
    if (parentsRes.data) setParents(parentsRes.data)
    setLoading(false)
  }, [familyId])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  // 실시간 동기화: 다른 부모가 변경하면 자동 갱신
  useRealtimeSync(familyId, fetchAll)

  const deleteSchedule = async (scheduleId: string) => {
    const supabase = createClient()
    await supabase.from('schedules').delete().eq('id', scheduleId)
    fetchAll()
  }

  return {
    schedules,
    overrides,
    children,
    parents,
    loading,
    refetch: fetchAll,
    deleteSchedule,
  }
}
