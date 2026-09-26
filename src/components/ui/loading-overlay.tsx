import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LoadingOverlayProps {
  label?: string
  className?: string
}

export function LoadingOverlay({ label = 'Please wait…', className }: LoadingOverlayProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center bg-black/10 backdrop-blur-[1px]',
        className
      )}
    >
      <div className="flex flex-col items-center gap-3 rounded-2xl bg-surface-container-lowest px-8 py-6 shadow-lg ring-1 ring-outline-variant">
        <Loader2 className="size-8 animate-spin text-primary" />
        <span className="font-label-md text-label-md text-on-surface">{label}</span>
      </div>
    </div>
  )
}