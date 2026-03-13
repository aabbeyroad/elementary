import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { WeeklyViewPage } from '@/components/schedule/WeeklyViewPage'

export default async function SchedulePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('family_id')
    .eq('id', user.id)
    .single()

  if (!profile?.family_id) redirect('/onboarding')

  return <WeeklyViewPage userId={user.id} familyId={profile.family_id} />
}
