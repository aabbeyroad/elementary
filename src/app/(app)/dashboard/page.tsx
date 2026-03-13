'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardContent } from '@/components/dashboard/DashboardContent'
import { useAppSession } from '@/components/layout/AppSessionProvider'

export default function DashboardPage() {
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

  return <DashboardContent familyId={familyId} />
}
