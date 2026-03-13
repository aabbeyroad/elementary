'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface DateNavigatorProps {
  label: string
  onPrev: () => void
  onNext: () => void
  className?: string
}

export function DateNavigator({ label, onPrev, onNext, className }: DateNavigatorProps) {
  return (
    <div className={`glass-toolbar relative w-full max-w-[360px] px-11 py-1 ${className ?? ''}`}>
      <Button
        variant="ghost"
        size="icon"
        className="absolute left-1 top-1/2 h-9 w-9 -translate-y-1/2 rounded-[14px]"
        onClick={onPrev}
      >
        <ChevronLeft className="h-4.5 w-4.5" />
      </Button>
      <div className="truncate whitespace-nowrap px-2 py-2 text-center text-sm font-medium tracking-[-0.01em] text-foreground">
        {label}
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-1 top-1/2 h-9 w-9 -translate-y-1/2 rounded-[14px]"
        onClick={onNext}
      >
        <ChevronRight className="h-4.5 w-4.5" />
      </Button>
    </div>
  )
}
