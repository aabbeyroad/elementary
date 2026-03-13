import * as React from "react"
import { cn } from "@/lib/utils"

interface PageHeaderProps {
  kicker?: string
  title: string
  subtitle?: string
  leading?: React.ReactNode
  actions?: React.ReactNode
  children?: React.ReactNode
  className?: string
}

export function PageHeader({
  kicker,
  title,
  subtitle,
  leading,
  actions,
  children,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn("hero-header", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-3">
          {kicker ? <p className="hero-kicker">{kicker}</p> : null}
          <div>
            <h1 className="hero-title">{title}</h1>
            {subtitle ? <p className="hero-subtitle">{subtitle}</p> : null}
          </div>
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
      {leading ? <div className="hero-toolbar">{leading}</div> : null}
      {children ? <div className="mt-5">{children}</div> : null}
    </header>
  )
}
