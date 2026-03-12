'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

/**
 * Supabase Realtime을 사용하여 가족 데이터 변경을 실시간으로 감지합니다.
 * 테이블(schedules, supplies, children 등)에 변경이 발생하면 refetch 콜백을 호출합니다.
 */
export function useRealtimeSync(familyId: string, onDataChange: () => void) {
  const supabase = createClient()
  const callbackRef = useRef(onDataChange)
  callbackRef.current = onDataChange

  useEffect(() => {
    if (!familyId) return

    // 여러 테이블의 변경을 하나의 채널에서 감지
    const channel = supabase
      .channel(`family-${familyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'schedules',
          filter: `family_id=eq.${familyId}`,
        },
        () => callbackRef.current()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'children',
          filter: `family_id=eq.${familyId}`,
        },
        () => callbackRef.current()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'supplies',
          filter: `family_id=eq.${familyId}`,
        },
        () => callbackRef.current()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'schedule_overrides',
        },
        () => callbackRef.current()
      )
      .subscribe()

    // 탭이 다시 보일 때 데이터 갱신 (실시간 연결이 끊겼을 수 있으므로)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        callbackRef.current()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      supabase.removeChannel(channel)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [familyId, supabase])
}
