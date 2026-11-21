const numberFormat = new Intl.NumberFormat('ru-RU', {
  maximumFractionDigits: 1,
})

export function round1(value: number): number {
  return Math.round((value + Number.EPSILON) * 10) / 10
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return '0'
  return numberFormat.format(value)
}

export function formatWeight(value: number): string {
  if (!Number.isFinite(value)) return '0 кг'
  return `${formatNumber(value)} кг`
}

export function formatVolume(value: number): string {
  if (!Number.isFinite(value)) return '0 кг'
  if (value >= 1000) {
    return `${numberFormat.format(Math.round(value / 100) / 10)} т`
  }
  return `${numberFormat.format(value)} кг`
}

export function formatReps(reps: number | string): string {
  return String(reps)
}

export function parseNumber(input: string): number {
  if (!input) return 0
  const cleaned = input
    .replace(/\s/g, '')
    .replace(/\u00a0/g, '')
    .replace(',', '.')
    .replace(/[^\d.-]/g, '')
  const value = Number.parseFloat(cleaned)
  return Number.isFinite(value) ? round1(value) : 0
}

export function numberToInput(value: number): string {
  if (!Number.isFinite(value) || value === 0) return ''
  return String(value).replace('.', ',')
}

export function formatPercent(value: number): string {
  const safe = Number.isFinite(value) ? value : 0
  return `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(safe)}%`
}

export function pluralRu(
  count: number,
  one: string,
  few: string,
  many: string,
): string {
  const mod10 = Math.abs(count) % 10
  const mod100 = Math.abs(count) % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few
  return many
}

export function formatDuration(seconds: number): string {
  const safe = Math.max(0, Math.round(seconds))
  const hours = Math.floor(safe / 3600)
  const minutes = Math.floor((safe % 3600) / 60)
  if (hours > 0) return `${hours} ч ${minutes} мин`
  return `${minutes} мин`
}
