import * as React from "react"
import { AlertCircle, CheckCircle2, Info, TriangleAlert } from "lucide-react"
import { cn } from "@/lib/utils"

const noticeStyles = {
  info: {
    icon: Info,
    className: "border-blue-100 bg-[rgba(0,113,227,0.08)] text-[#0b63c9]",
  },
  success: {
    icon: CheckCircle2,
    className: "border-emerald-100 bg-[rgba(52,199,89,0.1)] text-[#198754]",
  },
  warning: {
    icon: TriangleAlert,
    className: "border-orange-100 bg-[rgba(255,159,10,0.12)] text-[#b66800]",
  },
  destructive: {
    icon: AlertCircle,
    className: "border-red-100 bg-[rgba(217,45,32,0.1)] text-destructive",
  },
} as const

interface NoticeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: keyof typeof noticeStyles
  title?: string
}

export function Notice({ variant = "info", title, className, children, ...props }: NoticeProps) {
  const config = noticeStyles[variant]
  const Icon = config.icon

  return (
    <div
      className={cn(
        "surface-card-muted flex items-start gap-3 border px-4 py-3",
        config.className,
        className
      )}
      {...props}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0">
        {title ? <p className="text-sm font-semibold tracking-[-0.01em]">{title}</p> : null}
        <div className="text-sm leading-6">{children}</div>
      </div>
    </div>
  )
}
