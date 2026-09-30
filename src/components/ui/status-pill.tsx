import type { ReactNode } from "react"

import type { InvoiceStatus } from "@/lib/types"
import { invoiceStatusStyles } from "@/lib/styles"
import { cn } from "@/lib/utils"

interface StatusPillProps {
  status: InvoiceStatus
  className?: string
  children?: ReactNode
}

function StatusPill({ status, className, children }: StatusPillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 font-label-sm text-label-sm font-semibold",
        invoiceStatusStyles[status],
        className
      )}
    >
      {children ?? status}
    </span>
  )
}

export { StatusPill }
