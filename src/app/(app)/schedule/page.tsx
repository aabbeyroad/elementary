'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { WeeklyViewPage } from '@/components/schedule/WeeklyViewPage'
import { useAppSession } from '@/components/layout/AppSessionProvider'

export default function SchedulePage() {
  const router = useRouter()
  const { familyId } = useAppSession()

  useEffect(() => {
    if (!familyId) {
      router.replace('/onboarding')
    }
  }, [familyId, router])

  if (!familyId) {
    return null
  }

  return <WeeklyViewPage familyId={familyId} />
}
