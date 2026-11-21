export type NotificationState = NotificationPermission | 'unsupported'

export function notificationState(): NotificationState {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') {
    return 'unsupported'
  }
  return Notification.permission
}

export async function requestNotificationPermission(): Promise<NotificationState> {
  if (notificationState() === 'unsupported') return 'unsupported'
  try {
    return await Notification.requestPermission()
  } catch {
    return Notification.permission
  }
}

export async function showLocalNotification(
  title: string,
  body: string,
  tag = 'athly',
): Promise<boolean> {
  if (notificationState() !== 'granted') return false

  try {
    const registration = await navigator.serviceWorker?.ready
    if (registration) {
      await registration.showNotification(title, {
        body,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag,
      })
      return true
    }
  } catch {
    // fall back to the Notification constructor
  }

  try {
    new Notification(title, { body, icon: '/icon-192.png', tag })
    return true
  } catch {
    return false
  }
}

/** Напоминание, пока приложение открыто или свёрнуто в фоне (вкладка PWA). */
let reminderTimer: number | null = null

export function scheduleWorkoutReminder(hour = 19): void {
  if (notificationState() !== 'granted') return
  if (reminderTimer !== null) window.clearTimeout(reminderTimer)

  const now = new Date()
  const target = new Date()
  target.setHours(hour, 0, 0, 0)
  if (target.getTime() <= now.getTime()) {
    target.setDate(target.getDate() + 1)
  }

  const delay = target.getTime() - now.getTime()
  reminderTimer = window.setTimeout(() => {
    void showLocalNotification(
      'Пора тренироваться',
      'Открой Athly и начни следующую тренировку — веса уже подставлены.',
      'athly-reminder',
    )
  }, Math.min(delay, 24 * 60 * 60 * 1000))
}

export function cancelWorkoutReminder(): void {
  if (reminderTimer !== null) {
    window.clearTimeout(reminderTimer)
    reminderTimer = null
  }
}
