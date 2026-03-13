'use client'

import { BottomNav } from './BottomNav'

interface AppShellProps {
  children: React.ReactNode
}

// 모바일 최적화된 앱 셸: 상단 콘텐츠 + 하단 네비게이션
export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-dvh bg-background">
      <main className="mx-auto max-w-lg pb-20">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
