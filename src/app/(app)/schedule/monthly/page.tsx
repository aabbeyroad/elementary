'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MonthlyViewPage } from '@/components/schedule/MonthlyViewPage'
import { useAppSession } from '@/components/layout/AppSessionProvider'

export default function MonthlyPage() {
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

  return <MonthlyViewPage familyId={familyId} />
}
