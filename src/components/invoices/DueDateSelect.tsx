import { Calendar } from 'lucide-react'
import { formatDate } from '@/lib/format'
import { DUE_TERM_OPTIONS, type DueTerms } from '@/lib/period'
import { cn } from '@/lib/utils'

interface DueDateSelectProps {
  terms: DueTerms
  onTermsChange: (terms: DueTerms) => void
  customDate: string
  onCustomDateChange: (value: string) => void
  dueDate: string
  inputClassName?: string
}

export function DueDateSelect({
  terms,
  onTermsChange,
  customDate,
  onCustomDateChange,
  dueDate,
  inputClassName,
}: DueDateSelectProps) {
  return (
    <div>
      <label className="mb-2 block font-label-sm text-label-sm tracking-wider text-on-surface-variant uppercase">
        Payment Terms
      </label>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {DUE_TERM_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onTermsChange(option.value)}
            className={cn(
              'h-11 rounded-lg border font-label-md text-label-md transition-colors',
              terms === option.value
                ? 'border-primary bg-primary-container text-on-primary-container'
                : 'border-outline-variant hover:bg-surface-container-low'
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {terms === 'custom' ? (
        <div className="relative mt-3">
          <span className="absolute top-1/2 left-4 -translate-y-1/2 text-on-surface-variant">
            <Calendar className="size-5" />
          </span>
          <input
            type="date"
            value={customDate}
            onChange={(e) => onCustomDateChange(e.target.value)}
            className={cn(inputClassName, 'pl-12 font-label-md text-label-md')}
          />
        </div>
      ) : null}

      {dueDate ? (
        <p className="mt-2 font-label-sm text-label-sm text-on-surface-variant">
          Due {formatDate(dueDate)}
        </p>
      ) : (
        <p className="mt-2 font-label-sm text-label-sm text-destructive">
          Select a due date to continue.
        </p>
      )}
    </div>
  )
}
