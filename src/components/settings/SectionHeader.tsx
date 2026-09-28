import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function SectionHeader({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex items-start justify-between gap-4', className)}>
      <div className="flex min-w-0 items-start gap-3">
        {icon ? (
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-container-high text-on-surface-variant">
            {icon}
          </span>
        ) : null}
        <div className="min-w-0">
          <h2 className="font-headline-md text-headline-md font-semibold text-on-surface">{title}</h2>
          {description ? (
            <p className="mt-0.5 font-body-md text-body-md text-on-surface-variant">{description}</p>
          ) : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}
