'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRealtimeSync } from './useRealtimeSync'
import type { Schedule, ScheduleOverride, Child, Profile } from '@/types/database'

type FamilyScheduleState = {
  schedules: Schedule[]
  overrides: ScheduleOverride[]
  children: Child[]
  parents: Profile[]
  loading: boolean
  hasFetched: boolean
  lastFetchedAt: number
}

type RefetchOptions = {
  force?: boolean
  background?: boolean
}

const STALE_TIME_MS = 60_000

const defaultState: FamilyScheduleState = {
  schedules: [],
  overrides: [],
  children: [],
  parents: [],
  loading: true,
  hasFetched: false,
  lastFetchedAt: 0,
}

const familyStore = new Map<string, FamilyScheduleState>()
const listenersStore = new Map<string, Set<() => void>>()
const inflightRequests = new Map<string, Promise<void>>()

function getFamilyState(familyId: string) {
  return familyStore.get(familyId) ?? defaultState
}

function setFamilyState(
  familyId: string,
  updater: FamilyScheduleState | ((current: FamilyScheduleState) => FamilyScheduleState)
) {
  const current = getFamilyState(familyId)
  const next = typeof updater === 'function' ? updater(current) : updater
  familyStore.set(familyId, next)
  listenersStore.get(familyId)?.forEach(listener => listener())
}

function subscribeToFamily(familyId: string, listener: () => void) {
  const listeners = listenersStore.get(familyId) ?? new Set<() => void>()
  listeners.add(listener)
  listenersStore.set(familyId, listeners)

  return () => {
    const currentListeners = listenersStore.get(familyId)
    if (!currentListeners) return
    currentListeners.delete(listener)
    if (currentListeners.size === 0) {
      listenersStore.delete(familyId)
    }
  }
}

function upsertById<T extends { id: string }>(current: T[], incoming: T[]) {
  if (incoming.length === 0) return current
  const map = new Map(current.map(item => [item.id, item]))
  for (const item of incoming) {
    map.set(item.id, item)
  }
  return Array.from(map.values())
}

async function fetchFamilyData(familyId: string, options: RefetchOptions = {}) {
  const current = getFamilyState(familyId)
  const isFresh = current.hasFetched && Date.now() - current.lastFetchedAt < STALE_TIME_MS

  if (!options.force) {
    if (inflightRequests.has(familyId)) {
      return inflightRequests.get(familyId)!
    }
    if (isFresh) {
      return Promise.resolve()
    }
  }

  if (!options.background || !current.hasFetched) {
    setFamilyState(familyId, {
      ...current,
      loading: true,
    })
  }

  const request = (async () => {
    const supabase = createClient()

    const [childrenRes, parentsRes] = await Promise.all([
      supabase.from('children').select('*').eq('family_id', familyId).order('sort_order'),
      supabase.from('profiles').select('*').eq('family_id', familyId),
    ])

    const partialState = {
      ...getFamilyState(familyId),
      children: childrenRes.data ?? getFamilyState(familyId).children,
      parents: parentsRes.data ?? getFamilyState(familyId).parents,
      hasFetched: getFamilyState(familyId).hasFetched,
      loading: !getFamilyState(familyId).hasFetched,
      lastFetchedAt: getFamilyState(familyId).lastFetchedAt,
      schedules: getFamilyState(familyId).schedules,
      overrides: getFamilyState(familyId).overrides,
    }

    setFamilyState(familyId, partialState)

    const [schedulesRes, overridesRes] = await Promise.all([
      supabase.from('schedules').select('*').eq('family_id', familyId),
      supabase.from('schedule_overrides').select('*, schedules!inner(family_id)').eq('schedules.family_id', familyId),
    ])

    setFamilyState(familyId, {
      schedules: schedulesRes.data ?? partialState.schedules,
      overrides: overridesRes.data ?? partialState.overrides,
      children: partialState.children,
      parents: partialState.parents,
      loading: false,
      hasFetched: true,
      lastFetchedAt: Date.now(),
    })
  })()
    .finally(() => {
      inflightRequests.delete(familyId)
    })

  inflightRequests.set(familyId, request)
  return request
}

export function useSchedules(familyId: string) {
  const [snapshot, setSnapshot] = useState<FamilyScheduleState>(() => getFamilyState(familyId))
  const isMountedRef = useRef(true)
  const scheduleIdsRef = useRef<string[]>(snapshot.schedules.map(schedule => schedule.id))

  useEffect(() => {
    isMountedRef.current = true
    setSnapshot(getFamilyState(familyId))

    const unsubscribe = subscribeToFamily(familyId, () => {
      if (!isMountedRef.current) return
      const nextState = getFamilyState(familyId)
      scheduleIdsRef.current = nextState.schedules.map(schedule => schedule.id)
      setSnapshot(nextState)
    })

    const cached = getFamilyState(familyId)
    const shouldBackgroundRefresh = cached.hasFetched
    void fetchFamilyData(familyId, shouldBackgroundRefresh ? { background: true } : {})

    return () => {
      isMountedRef.current = false
      unsubscribe()
    }
  }, [familyId])

  const refetch = useCallback(async (options: RefetchOptions = {}) => {
    await fetchFamilyData(familyId, {
      background: snapshot.hasFetched,
      ...options,
    })
  }, [familyId, snapshot.hasFetched])

  useRealtimeSync(familyId, () => {
    void fetchFamilyData(familyId, { background: true, force: true })
  }, scheduleIdsRef)

  const upsertSchedules = useCallback((incomingSchedules: Schedule[]) => {
    setFamilyState(familyId, current => ({
      ...current,
      schedules: upsertById(current.schedules, incomingSchedules),
      hasFetched: current.hasFetched || incomingSchedules.length > 0,
      loading: false,
      lastFetchedAt: Date.now(),
    }))
  }, [familyId])

  const deleteSchedule = useCallback(async (scheduleId: string) => {
    const previousSchedules = getFamilyState(familyId).schedules
    setFamilyState(familyId, current => ({
      ...current,
      schedules: current.schedules.filter(schedule => schedule.id !== scheduleId),
    }))

    const supabase = createClient()
    const { error } = await supabase.from('schedules').delete().eq('id', scheduleId)

    if (error) {
      setFamilyState(familyId, current => ({
        ...current,
        schedules: previousSchedules,
      }))
      void fetchFamilyData(familyId, { background: true, force: true })
    }
  }, [familyId])

  return {
    ...snapshot,
    refetch,
    deleteSchedule,
    upsertSchedules,
  }
}
