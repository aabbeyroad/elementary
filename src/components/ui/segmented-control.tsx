import Link from "next/link"
import { cn } from "@/lib/utils"

interface SegmentedItem {
  label: string
  href?: string
  active?: boolean
  onClick?: () => void
}

interface SegmentedControlProps {
  items: SegmentedItem[]
  className?: string
}

export function SegmentedControl({ items, className }: SegmentedControlProps) {
  return (
    <div className={cn("segmented-shell grid w-full grid-flow-col auto-cols-fr", className)}>
      {items.map((item) => {
        const itemClassName = cn(
          "inline-flex w-full items-center justify-center rounded-full px-4 py-2 text-sm font-medium tracking-[-0.01em] transition-all duration-200",
          item.active
            ? "bg-foreground text-background shadow-[var(--shadow-subtle)]"
            : "text-muted-foreground hover:bg-white/82 hover:text-foreground"
        )

        if (item.href) {
          return (
            <Link key={item.label} href={item.href} prefetch className={itemClassName}>
              {item.label}
            </Link>
          )
        }

        return (
          <button key={item.label} type="button" className={itemClassName} onClick={item.onClick}>
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
