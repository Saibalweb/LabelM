import { useNavigate } from 'react-router-dom'
import { Clock, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ComingSoon({
  title,
  description,
}: {
  title: string
  description: string
}) {
  const navigate = useNavigate()

  return (
    <div className="flex flex-1 items-center justify-center bg-surface-bright p-4 lg:p-8">
      <div className="w-full max-w-md rounded-xl border border-outline-variant bg-surface-container-lowest p-8 text-center shadow-sm">
        <span className="mx-auto flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Users className="size-6" />
        </span>
        <h2 className="mt-4 font-headline-lg text-headline-lg font-bold text-on-background">
          {title}
        </h2>
        <p className="mt-2 font-body-md text-body-md leading-relaxed text-on-surface-variant">
          {description}
        </p>
        <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-surface-container-high px-3 py-1 font-label-sm text-label-sm text-on-surface-variant">
          <Clock className="size-3.5" />
          Available in the final delivery
        </div>
        <div className="mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/')}
            className="h-11 rounded-lg border-outline-variant px-6 font-label-md text-label-md"
          >
            Back to dashboard
          </Button>
        </div>
      </div>
    </div>
  )
}