import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
type Size = 'sm' | 'md' | 'lg' | 'icon'

const variants: Record<Variant, string> = {
  primary:
    'bg-accent text-accent-ink hover:bg-accent-strong active:bg-accent-strong shadow-lg shadow-accent/10 font-semibold',
  secondary:
    'bg-surface-2 text-text border border-border hover:bg-surface-3 active:bg-surface-3',
  ghost: 'bg-transparent text-muted hover:bg-surface-2 hover:text-text',
  outline:
    'bg-transparent text-text border border-border hover:border-accent/60 hover:text-accent',
  danger: 'bg-danger/10 text-danger border border-danger/30 hover:bg-danger/20',
}

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3 text-xs gap-1.5 rounded-lg',
  md: 'h-11 px-4 text-sm gap-2 rounded-xl',
  lg: 'h-13 px-5 text-base gap-2 rounded-2xl',
  icon: 'h-10 w-10 rounded-xl',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  leading?: ReactNode
  trailing?: ReactNode
}

export function Button({
  variant = 'secondary',
  size = 'md',
  className,
  leading,
  trailing,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex select-none items-center justify-center whitespace-nowrap font-medium transition-colors disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    >
      {leading}
      {children}
      {trailing}
    </button>
  )
}
