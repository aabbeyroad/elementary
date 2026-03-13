import * as React from "react"
import { cn } from "@/lib/utils"

interface TooltipProps {
  label: string
  children: React.ReactNode
  className?: string
}

export function Tooltip({ label, children, className }: TooltipProps) {
  return (
    <span className={cn("group relative inline-flex", className)}>
      {children}
      <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 hidden -translate-x-1/2 rounded-full bg-foreground px-3 py-1.5 text-xs font-medium text-background shadow-[var(--shadow-floating)] group-hover:inline-flex group-focus-within:inline-flex">
        {label}
      </span>
    </span>
  )
}
