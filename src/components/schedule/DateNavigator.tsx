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
    <div className={`glass-toolbar grid w-full max-w-[360px] grid-cols-[40px,minmax(0,1fr),40px] items-center gap-1 p-1 ${className ?? ''}`}>
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 justify-self-start rounded-[14px]"
        onClick={onPrev}
      >
        <ChevronLeft className="h-4.5 w-4.5" />
      </Button>
      <div className="truncate whitespace-nowrap px-2 text-center text-sm font-medium tracking-[-0.01em] text-foreground">
        {label}
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 justify-self-end rounded-[14px]"
        onClick={onNext}
      >
        <ChevronRight className="h-4.5 w-4.5" />
      </Button>
    </div>
  )
}
