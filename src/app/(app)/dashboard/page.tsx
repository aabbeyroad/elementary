import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardContent } from '@/components/dashboard/DashboardContent'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // 프로필 확인 - 없으면 온보딩으로
  const { data: profile } = await supabase
    .from('profiles')
    .select('*, families(*)')
    .eq('id', user.id)
    .single()

  if (!profile || !profile.family_id) {
    redirect('/onboarding')
  }

  return <DashboardContent userId={user.id} familyId={profile.family_id} />
}
