import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

type Tone = 'default' | 'accent' | 'danger' | 'info'

const tones: Record<Tone, string> = {
  default: 'border-border bg-surface text-muted',
  accent: 'border-accent/30 bg-accent-soft text-accent',
  danger: 'border-danger/30 bg-danger/10 text-danger',
  info: 'border-info/30 bg-info/10 text-info',
}

export function Badge({
  children,
  tone = 'default',
  className,
}: {
  children: ReactNode
  tone?: Tone
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-1.5 py-0.5 text-[9px] font-medium leading-tight',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
