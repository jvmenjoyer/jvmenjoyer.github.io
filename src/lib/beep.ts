import { showLocalNotification } from './notifications'

let context: AudioContext | null = null

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const Constructor =
    window.AudioContext ??
    (window as typeof window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext
  if (!Constructor) return null
  if (!context) context = new Constructor()
  return context
}

export function unlockAudio(): void {
  const audio = getContext()
  if (audio && audio.state === 'suspended') {
    void audio.resume().catch(() => undefined)
  }
}

export function playBeep(): void {
  const audio = getContext()
  if (!audio) return

  if (audio.state === 'suspended') {
    void audio.resume().catch(() => undefined)
  }

  const oscillator = audio.createOscillator()
  const gain = audio.createGain()
  const start = audio.currentTime

  oscillator.type = 'sine'
  oscillator.frequency.setValueAtTime(880, start)
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(0.22, start + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.45)

  oscillator.connect(gain)
  gain.connect(audio.destination)
  oscillator.start(start)
  oscillator.stop(start + 0.5)
}

export function vibrateRestFinished(): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate?.([200, 100, 200])
  }
}

export async function notifyRestFinished(): Promise<void> {
  if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
    return
  }
  await showLocalNotification(
    'Отдых закончился',
    'Пора к следующему подходу',
    'athly-rest',
  )
}
