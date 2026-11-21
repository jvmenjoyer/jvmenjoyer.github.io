import { ChevronLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/cn'

interface PageHeaderProps {
  title: ReactNode
  subtitle?: ReactNode
  back?: boolean
  actions?: ReactNode
  className?: string
}

export function PageHeader({ title, subtitle, back, actions, className }: PageHeaderProps) {
  const navigate = useNavigate()

  return (
    <header className={cn('mb-5 flex items-start justify-between gap-4', className)}>
      <div className="flex min-w-0 items-start gap-2.5">
        {back ? (
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="-ml-1 mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted transition-colors hover:bg-surface-2 hover:text-text"
            aria-label="Назад"
          >
            <ChevronLeft size={20} />
          </button>
        ) : null}
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold tracking-tight text-text">{title}</h1>
          {subtitle ? <p className="mt-0.5 text-xs text-muted">{subtitle}</p> : null}
        </div>
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </header>
  )
}
