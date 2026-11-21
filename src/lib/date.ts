import {
  addMonths,
  endOfMonth,
  format,
  isToday,
  isYesterday,
  parseISO,
  startOfMonth,
  subMonths,
} from 'date-fns'
import { ru } from 'date-fns/locale'

export const toISODate = (date: Date) => format(date, 'yyyy-MM-dd')
export const todayISO = () => toISODate(new Date())
export const fromISODate = (iso: string) => parseISO(iso)

export function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export function monthRange(month: Date): { start: string; end: string } {
  return {
    start: toISODate(startOfMonth(month)),
    end: toISODate(endOfMonth(month)),
  }
}

export function monthLabel(month: Date): string {
  return capitalize(format(month, 'LLLL yyyy', { locale: ru }))
}

export function monthShortLabel(month: Date): string {
  return capitalize(format(month, 'LLL', { locale: ru })).replace('.', '')
}

export function humanDate(iso: string): string {
  const date = parseISO(iso)
  if (isToday(date)) return 'Сегодня'
  if (isYesterday(date)) return 'Вчера'
  return format(date, 'd MMM', { locale: ru }).replace('.', '')
}

export function fullDate(iso: string): string {
  return capitalize(format(parseISO(iso), 'd MMMM yyyy', { locale: ru }))
}

export function shortDate(iso: string): string {
  return format(parseISO(iso), 'd MMM yyyy', { locale: ru })
}

export function weekdayShort(iso: string): string {
  return capitalize(format(parseISO(iso), 'EEEEEE', { locale: ru }))
}

export function weekdayDate(iso: string): string {
  return capitalize(format(parseISO(iso), 'EEEE, d MMMM', { locale: ru }))
}

export function shiftMonth(month: Date, delta: number): Date {
  return addMonths(month, delta)
}

export function previousMonths(month: Date, count: number): Date[] {
  return Array.from({ length: count }, (_, index) =>
    subMonths(startOfMonth(month), count - 1 - index),
  )
}
