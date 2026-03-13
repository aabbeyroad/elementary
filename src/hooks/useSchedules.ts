'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRealtimeSync } from './useRealtimeSync'
import type { Schedule, ScheduleOverride, Child, Profile } from '@/types/database'

// 가족의 일정 데이터를 가져오고 관리하는 훅 (실시간 동기화 포함)
// 성능 최적화: 점진적 렌더링 + 캐시 + 낙관적 업데이트
export function useSchedules(familyId: string) {
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [overrides, setOverrides] = useState<ScheduleOverride[]>([])
  const [children, setChildren] = useState<Child[]>([])
  const [parents, setParents] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const isMountedRef = useRef(true)
  const hasFetchedRef = useRef(false)

  const fetchAll = useCallback(async () => {
    const supabase = createClient()
    // 첫 로딩에만 loading=true (이후 refetch는 백그라운드)
    if (!hasFetchedRef.current) {
      setLoading(true)
    }

    // 점진적 렌더링: children/parents 먼저 (빠름), schedules/overrides 다음 (느림)
    // 이렇게 하면 UI 골격을 먼저 보여줄 수 있음
    const [childrenRes, parentsRes] = await Promise.all([
      supabase.from('children').select('*').eq('family_id', familyId).order('sort_order'),
      supabase.from('profiles').select('*').eq('family_id', familyId),
    ])

    if (!isMountedRef.current) return

    if (childrenRes.data) setChildren(childrenRes.data)
    if (parentsRes.data) setParents(parentsRes.data)

    const [schedulesRes, overridesRes] = await Promise.all([
      supabase.from('schedules').select('*').eq('family_id', familyId),
      supabase.from('schedule_overrides').select('*, schedules!inner(family_id)').eq('schedules.family_id', familyId),
    ])

    if (!isMountedRef.current) return

    if (schedulesRes.data) setSchedules(schedulesRes.data)
    if (overridesRes.data) setOverrides(overridesRes.data)

    hasFetchedRef.current = true
    setLoading(false)
  }, [familyId])

  useEffect(() => {
    isMountedRef.current = true
    fetchAll()
    return () => { isMountedRef.current = false }
  }, [fetchAll])

  // 실시간 동기화: 다른 부모가 변경하면 자동 갱신 (디바운스 적용)
  useRealtimeSync(familyId, fetchAll)

  const deleteSchedule = useCallback(async (scheduleId: string) => {
    // 낙관적 업데이트: 즉시 UI에서 제거
    setSchedules(prev => prev.filter(s => s.id !== scheduleId))
    const supabase = createClient()
    const { error } = await supabase.from('schedules').delete().eq('id', scheduleId)
    if (error) {
      // 실패 시 롤백
      fetchAll()
    }
  }, [fetchAll])

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
