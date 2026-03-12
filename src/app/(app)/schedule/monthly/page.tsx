import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { MonthlyViewPage } from '@/components/schedule/MonthlyViewPage'

export default async function MonthlyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('family_id')
    .eq('id', user.id)
    .single()

  if (!profile?.family_id) redirect('/onboarding')

  return <MonthlyViewPage userId={user.id} familyId={profile.family_id} />
}
