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
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto max-w-lg flex items-center justify-around h-16">
        {navItems.map((item) => {
          const active = item.isActive(pathname)
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              className={cn(
                'flex flex-col items-center gap-1 px-3 py-2 text-xs transition-colors',
                active
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <item.icon className={cn('h-5 w-5', active && 'stroke-[2.5]')} />
              <span className={cn(active && 'font-semibold')}>{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
})
