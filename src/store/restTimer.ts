import { create } from 'zustand'

interface RestTimerState {
  endsAt: number | null
  remaining: number | null
  duration: number
  label: string
  running: boolean
  finished: boolean
  start: (seconds: number, label?: string) => void
  pause: () => void
  resume: () => void
  add: (seconds: number) => void
  finish: () => void
  stop: () => void
}

export const useRestTimer = create<RestTimerState>((set, get) => ({
  endsAt: null,
  remaining: null,
  duration: 0,
  label: 'Отдых',
  running: false,
  finished: false,

  start: (seconds, label = 'Отдых') => {
    const safe = Math.max(5, Math.round(seconds))
    set({
      endsAt: Date.now() + safe * 1000,
      remaining: safe,
      duration: safe,
      label,
      running: true,
      finished: false,
    })
  },

  pause: () => {
    const state = get()
    if (!state.running) return
    const remaining = restRemaining(state)
    set({ running: false, endsAt: null, remaining })
  },

  resume: () => {
    const state = get()
    const remaining = state.remaining ?? 0
    if (remaining <= 0) return
    set({
      running: true,
      finished: false,
      endsAt: Date.now() + remaining * 1000,
      duration: Math.max(state.duration, remaining),
    })
  },

  add: (seconds) => {
    const state = get()
    const delta = Math.round(seconds)
    if (state.running && state.endsAt) {
      set({ endsAt: state.endsAt + delta * 1000 })
      return
    }
    if (state.finished) {
      const next = Math.max(5, delta)
      set({
        running: true,
        finished: false,
        endsAt: Date.now() + next * 1000,
        remaining: next,
        duration: next,
      })
      return
    }
    set({ remaining: Math.max(5, (state.remaining ?? 0) + delta) })
  },

  finish: () => {
    set({
      running: false,
      finished: true,
      endsAt: null,
      remaining: 0,
    })
  },

  stop: () => {
    set({
      endsAt: null,
      remaining: null,
      duration: 0,
      label: 'Отдых',
      running: false,
      finished: false,
    })
  },
}))

export function restRemaining(
  state: Pick<RestTimerState, 'running' | 'endsAt' | 'remaining'>,
  now = Date.now(),
): number {
  if (state.running && state.endsAt) {
    return Math.max(0, Math.ceil((state.endsAt - now) / 1000))
  }
  return state.remaining ?? 0
}

export function formatClock(seconds: number): string {
  const safe = Math.max(0, Math.round(seconds))
  const minutes = Math.floor(safe / 60)
  const rest = safe % 60
  return `${minutes}:${String(rest).padStart(2, '0')}`
}
