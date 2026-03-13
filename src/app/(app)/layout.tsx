import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/layout/AppShell'
import { AppSessionProvider } from '@/components/layout/AppSessionProvider'

// 인증된 사용자만 접근 가능한 레이아웃
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('family_id')
    .eq('id', user.id)
    .maybeSingle()

  return (
    <AppSessionProvider value={{ userId: user.id, familyId: profile?.family_id ?? null }}>
      <AppShell>{children}</AppShell>
    </AppSessionProvider>
  )
}
