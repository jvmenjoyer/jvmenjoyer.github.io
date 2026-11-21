import { create } from 'zustand'

export type ToastTone = 'default' | 'success' | 'error'

export interface ToastItem {
  id: number
  message: string
  tone: ToastTone
}

interface ToastStore {
  toasts: ToastItem[]
  push: (message: string, tone?: ToastTone) => void
  remove: (id: number) => void
}

let nextId = 0

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  push: (message, tone = 'default') => {
    const id = (nextId += 1)
    set((state) => ({
      toasts: [...state.toasts, { id, message, tone }].slice(-3),
    }))
    window.setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((item) => item.id !== id) }))
    }, 3200)
  },
  remove: (id) => {
    set((state) => ({ toasts: state.toasts.filter((item) => item.id !== id) }))
  },
}))

export function toast(message: string, tone: ToastTone = 'default'): void {
  useToastStore.getState().push(message, tone)
}
