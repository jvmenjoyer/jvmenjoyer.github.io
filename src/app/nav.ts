import {
  BarChart3,
  CalendarDays,
  ClipboardList,
  Dumbbell,
  Home,
  Ruler,
  Settings,
} from 'lucide-react'
import type { ComponentType } from 'react'

export interface NavItem {
  to: string
  label: string
  icon: ComponentType<{ size?: number | string; className?: string }>
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Главная', icon: Home },
  { to: '/exercises', label: 'Упражнения', icon: Dumbbell },
  { to: '/calendar', label: 'Календарь', icon: CalendarDays },
  { to: '/programs', label: 'Программы', icon: ClipboardList },
  { to: '/measurements', label: 'Замеры', icon: Ruler },
  { to: '/progress', label: 'Прогресс', icon: BarChart3 },
  { to: '/settings', label: 'Настройки', icon: Settings },
]

export const MOBILE_MORE_PREFIXES = [
  '/more',
  '/measurements',
  '/progress',
  '/settings',
  '/workouts',
]
