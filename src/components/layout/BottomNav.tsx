'use client'

import { memo } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { CalendarDays, ClipboardCheck, Settings } from 'lucide-react'

const navItems = [
  {
    label: '일정',
    href: '/dashboard',
    icon: CalendarDays,
    isActive: (path: string) => path.startsWith('/dashboard') || path.startsWith('/schedule'),
  },
  {
    label: '준비물',
    href: '/supplies',
    icon: ClipboardCheck,
    isActive: (path: string) => path.startsWith('/supplies'),
  },
  {
    label: '설정',
    href: '/settings',
    icon: Settings,
    isActive: (path: string) => path.startsWith('/settings') || path.startsWith('/children'),
  },
] as const

export const BottomNav = memo(function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed inset-x-0 bottom-4 z-50 px-4">
      <div className="mx-auto flex h-[72px] max-w-[440px] items-center justify-around rounded-[28px] border border-white/80 bg-white/78 px-3 shadow-[var(--shadow-floating)] backdrop-blur-2xl">
        {navItems.map((item) => {
          const active = item.isActive(pathname)
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              className={cn(
                'flex min-w-[88px] flex-col items-center gap-1 rounded-[20px] px-3 py-2 text-[0.72rem] font-medium tracking-[0.01em] transition-all duration-200',
                active
                  ? 'bg-accent text-primary shadow-[var(--shadow-subtle)]'
                  : 'text-muted-foreground hover:bg-white/80 hover:text-foreground'
              )}
            >
              <item.icon className={cn('h-[1.15rem] w-[1.15rem]', active && 'stroke-[2.35]')} />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
})
