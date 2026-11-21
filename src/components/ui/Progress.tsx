import { cn } from '@/lib/cn'
import { clamp } from '@/lib/format'

interface ProgressProps {
  value: number
  color?: string
  className?: string
  height?: 'sm' | 'md'
}

export function Progress({
  value,
  color = 'var(--color-accent)',
  className,
  height = 'sm',
}: ProgressProps) {
  const safe = clamp(Number.isFinite(value) ? value : 0, 0, 100)

  return (
    <div
      className={cn(
        'w-full overflow-hidden rounded-full bg-surface-3',
        height === 'sm' ? 'h-1.5' : 'h-2.5',
        className,
      )}
      role="progressbar"
      aria-valuenow={Math.round(safe)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full transition-[width] duration-500 ease-out"
        style={{ width: `${safe}%`, backgroundColor: color }}
      />
    </div>
  )
}
