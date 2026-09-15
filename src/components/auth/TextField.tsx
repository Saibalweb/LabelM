import type { ComponentProps, ReactNode } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface TextFieldProps extends ComponentProps<'input'> {
  label: string
  icon?: ReactNode
  trailing?: ReactNode
  hint?: ReactNode
}

export function TextField({
  label,
  icon,
  trailing,
  hint,
  className,
  id,
  ...props
}: TextFieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block font-label-md text-label-md text-on-surface">
        {label}
      </label>
      <div className="relative">
        {icon ? (
          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-outline">
            {icon}
          </span>
        ) : null}
        <Input
          id={id}
          className={cn(
            'h-12 rounded-xl border-transparent bg-surface-container-low px-4 font-body-md text-body-md text-on-surface placeholder:text-outline focus-visible:border-primary focus-visible:bg-surface-container-lowest focus-visible:ring-2 focus-visible:ring-primary/30',
            icon && 'pl-11',
            trailing && 'pr-11',
            className
          )}
          {...props}
        />
        {trailing ? (
          <span className="absolute inset-y-0 right-0 flex items-center pr-3">{trailing}</span>
        ) : null}
      </div>
      {hint ? <div className="pt-0.5">{hint}</div> : null}
    </div>
  )
}
