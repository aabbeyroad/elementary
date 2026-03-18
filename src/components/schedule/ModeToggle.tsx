'use client'

import Link from 'next/link'
import { CalendarDays, ListTodo } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModeToggleProps {
  mode: 'schedule' | 'todo'
  todoHref?: string // 할 일 모드 버튼 클릭 시 이동할 URL (weekly/monthly에서 사용)
  onSchedule?: () => void // 일정 모드 버튼 클릭 콜백 (dashboard에서 사용)
  onTodo?: () => void // 할 일 모드 버튼 클릭 콜백 (dashboard에서 사용)
}

export function ModeToggle({ mode, todoHref, onSchedule, onTodo }: ModeToggleProps) {
  const baseBtn = 'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200'
  const activeClass = 'bg-foreground text-background shadow-sm'
  const inactiveClass = 'text-muted-foreground hover:text-foreground'

  return (
    <div className="inline-flex items-center rounded-full bg-secondary p-1 gap-0.5">
      {/* 일정 모드 버튼 */}
      {onSchedule ? (
        <button
          type="button"
          onClick={onSchedule}
          className={cn(baseBtn, mode === 'schedule' ? activeClass : inactiveClass)}
        >
          <CalendarDays className="h-3.5 w-3.5" />
          일정 모드
        </button>
      ) : (
        <Link
          href="/dashboard"
          className={cn(baseBtn, mode === 'schedule' ? activeClass : inactiveClass)}
        >
          <CalendarDays className="h-3.5 w-3.5" />
          일정 모드
        </Link>
      )}

      {/* 할 일 모드 버튼 */}
      {onTodo ? (
        <button
          type="button"
          onClick={onTodo}
          className={cn(baseBtn, mode === 'todo' ? activeClass : inactiveClass)}
        >
          <ListTodo className="h-3.5 w-3.5" />
          할 일 모드
        </button>
      ) : (
        <Link
          href={todoHref ?? '/dashboard?mode=todo'}
          className={cn(baseBtn, mode === 'todo' ? activeClass : inactiveClass)}
        >
          <ListTodo className="h-3.5 w-3.5" />
          할 일 모드
        </Link>
      )}
    </div>
  )
}
