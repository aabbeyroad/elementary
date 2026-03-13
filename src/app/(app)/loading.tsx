import { AppShell } from '@/components/layout/AppShell'

export default function AppLoading() {
  return (
    <AppShell>
      <div className="page-shell animate-pulse">
        <div className="hero-header">
          <div className="h-4 w-24 rounded-full bg-muted" />
          <div className="mt-4 h-10 w-44 rounded-2xl bg-muted" />
          <div className="mt-5 h-12 max-w-[360px] rounded-[20px] bg-muted" />
          <div className="mt-5 h-12 max-w-[360px] rounded-[20px] bg-muted" />
        </div>
        <div className="surface-card mt-4 h-[420px]" />
      </div>
    </AppShell>
  )
}
