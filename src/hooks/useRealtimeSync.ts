'use client'

import { useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

/**
 * Supabase Realtime을 사용하여 가족 데이터 변경을 실시간으로 감지합니다.
 * 성능 최적화: 디바운스 적용 (300ms 내 연속 변경 시 한 번만 refetch)
 */
export function useRealtimeSync(familyId: string, onDataChange: () => void) {
  const callbackRef = useRef(onDataChange)
  callbackRef.current = onDataChange
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const debouncedCallback = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    debounceTimerRef.current = setTimeout(() => {
      callbackRef.current()
      debounceTimerRef.current = null
    }, 300)
  }, [])

  useEffect(() => {
    if (!familyId) return

    const supabase = createClient()

    // 여러 테이블의 변경을 하나의 채널에서 감지 (디바운스됨)
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
        debouncedCallback
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'children',
          filter: `family_id=eq.${familyId}`,
        },
        debouncedCallback
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'supplies',
          filter: `family_id=eq.${familyId}`,
        },
        debouncedCallback
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'schedule_overrides',
        },
        debouncedCallback
      )
      .subscribe()

    // 탭이 다시 보일 때 데이터 갱신 (최소 5초 간격)
    let lastVisibilityFetch = 0
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        const now = Date.now()
        if (now - lastVisibilityFetch > 5000) {
          lastVisibilityFetch = now
          callbackRef.current()
        }
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      supabase.removeChannel(channel)
      document.removeEventListener('visibilitychange', handleVisibility)
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [familyId, debouncedCallback])
}
