import { Minus, Pause, Play, Plus, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import {
  notifyRestFinished,
  playBeep,
  vibrateRestFinished,
} from '@/lib/beep'
import { cn } from '@/lib/cn'
import {
  formatClock,
  restRemaining,
  useRestTimer,
} from '@/store/restTimer'

export function RestTimerBar() {
  const timer = useRestTimer()
  const [now, setNow] = useState(() => Date.now())
  const finishedRef = useRef(false)
  const remaining = restRemaining(timer, now)
  const visible = timer.running || timer.finished || timer.remaining !== null

  useEffect(() => {
    if (!timer.running) return
    const interval = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(interval)
  }, [timer.running])

  useEffect(() => {
    if (timer.running) {
      finishedRef.current = false
      return
    }
    if (timer.finished) finishedRef.current = true
  }, [timer.running, timer.finished])

  useEffect(() => {
    if (!timer.running || remaining > 0 || finishedRef.current) return
    finishedRef.current = true
    timer.finish()
    playBeep()
    vibrateRestFinished()
    void notifyRestFinished()
  }, [remaining, timer])

  if (!visible) return null

  const progress =
    timer.duration > 0 ? Math.max(0, Math.min(100, (remaining / timer.duration) * 100)) : 0

  return (
    <div className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md rounded-2xl border border-border bg-surface/95 p-3 shadow-2xl backdrop-blur md:bottom-6">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="truncate text-[11px] text-muted">{timer.label}</span>
            <span
              className={cn(
                'text-lg font-semibold tabular',
                timer.finished ? 'text-accent' : 'text-text',
              )}
            >
              {timer.finished ? 'Готово' : formatClock(remaining)}
            </span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-3">
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {timer.finished ? (
          <div className="flex shrink-0 gap-1.5">
            <button
              type="button"
              onClick={() => timer.add(60)}
              className="rounded-lg border border-border px-2.5 py-1.5 text-[10px] text-muted transition-colors hover:text-text"
            >
              +1 мин
            </button>
            <button
              type="button"
              onClick={timer.stop}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-accent-ink"
              aria-label="Закрыть таймер"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => timer.add(-15)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-text"
              aria-label="Минус 15 секунд"
            >
              <Minus size={15} />
            </button>
            <button
              type="button"
              onClick={() => (timer.running ? timer.pause() : timer.resume())}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-2 text-text"
              aria-label={timer.running ? 'Пауза' : 'Продолжить'}
            >
              {timer.running ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <button
              type="button"
              onClick={() => timer.add(15)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-text"
              aria-label="Плюс 15 секунд"
            >
              <Plus size={15} />
            </button>
            <button
              type="button"
              onClick={timer.stop}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-faint transition-colors hover:text-danger"
              aria-label="Остановить таймер"
            >
              <X size={15} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
