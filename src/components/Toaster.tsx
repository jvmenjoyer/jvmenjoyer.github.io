import { CircleAlert, CircleCheck } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useToastStore } from '@/store/toast'

export function Toaster() {
  const toasts = useToastStore((state) => state.toasts)

  if (toasts.length === 0) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex flex-col items-center gap-2 px-4 md:bottom-6">
      {toasts.map((item) => (
        <div
          key={item.id}
          className={cn(
            'pointer-events-auto flex w-full max-w-sm items-center gap-2.5 rounded-xl border px-4 py-3 text-sm shadow-xl animate-toast-in',
            item.tone === 'error'
              ? 'border-danger/30 bg-[#2a1618] text-danger'
              : item.tone === 'success'
                ? 'border-accent/30 bg-accent-soft text-accent'
                : 'border-border bg-surface-2 text-text',
          )}
          role="status"
        >
          {item.tone === 'error' ? (
            <CircleAlert size={16} className="shrink-0" />
          ) : item.tone === 'success' ? (
            <CircleCheck size={16} className="shrink-0" />
          ) : null}
          <span>{item.message}</span>
        </div>
      ))}
    </div>
  )
}
