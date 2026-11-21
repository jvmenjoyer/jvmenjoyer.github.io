import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

export function Card({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-border bg-surface p-4 shadow-[0_1px_0_rgba(255,255,255,0.03)_inset]',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  )
}

export function CardTitle({
  title,
  action,
  className,
}: {
  title: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('mb-3 flex items-center justify-between gap-3', className)}>
      <h2 className="text-sm font-semibold text-text">{title}</h2>
      {action}
    </div>
  )
}
