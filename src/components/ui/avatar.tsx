import type { ReactNode } from "react"

import type { InvoiceStatus } from "@/lib/types"
import { avatarStyles, invoiceStatusStyles, teamAvatarStyles } from "@/lib/styles"
import { cn } from "@/lib/utils"

const variantClasses = {
  customer: "font-headline-md text-headline-md",
  dues: "border border-outline-variant text-sm font-bold",
  invoice: "border border-outline-variant text-sm font-bold",
  team: "font-label-md text-label-md font-bold",
} as const

type AvatarProps = {
  variant: "invoice"
  status: InvoiceStatus
  index?: number
  className?: string
  children?: ReactNode
} | {
  variant: "customer" | "dues" | "team"
  index: number
  status?: never
  className?: string
  children?: ReactNode
}

function Avatar({ variant, index = 0, status, className, children }: AvatarProps) {
  const palette =
    variant === "invoice"
      ? invoiceStatusStyles[status]
      : variant === "team"
        ? teamAvatarStyles[index % teamAvatarStyles.length]
        : avatarStyles[index % avatarStyles.length]

  return (
    <span
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-full",
        variantClasses[variant],
        palette,
        className
      )}
    >
      {children}
    </span>
  )
}

export { Avatar }
