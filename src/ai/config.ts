const STORAGE_KEY = 'athly.coach.v1'

export const DEFAULT_COACH_ENDPOINT =
  'https://athly-coach.jvmenjoyer.workers.dev'

export interface CoachConfig {
  endpoint: string
  accessCode: string
  model: string
}

function normalizeEndpoint(value: string): string {
  return value.trim().replace(/\/+$/, '')
}

export function getCoachConfig(): CoachConfig {
  const fallback: CoachConfig = {
    endpoint: DEFAULT_COACH_ENDPOINT,
    accessCode: '',
    model: 'deepseek-flash',
  }

  if (typeof localStorage === 'undefined') return fallback

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return fallback
    const parsed = JSON.parse(raw) as Partial<CoachConfig>
    return {
      endpoint: normalizeEndpoint(parsed.endpoint ?? '') || fallback.endpoint,
      accessCode:
        typeof parsed.accessCode === 'string' ? parsed.accessCode : '',
      model:
        typeof parsed.model === 'string' && parsed.model
          ? parsed.model
          : fallback.model,
    }
  } catch {
    return fallback
  }
}

export function saveCoachConfig(patch: Partial<CoachConfig>): CoachConfig {
  const next: CoachConfig = { ...getCoachConfig(), ...patch }
  next.endpoint = normalizeEndpoint(next.endpoint) || DEFAULT_COACH_ENDPOINT

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch (error) {
    console.error('Не удалось сохранить настройки тренера', error)
  }

  return next
}

export function isCoachConfigured(config: CoachConfig = getCoachConfig()): boolean {
  return Boolean(config.endpoint && config.accessCode)
}

export async function testCoachConnection(
  config: CoachConfig = getCoachConfig(),
): Promise<{ ok: boolean; model?: string }> {
  const response = await fetch(`${normalizeEndpoint(config.endpoint)}/health`, {
    headers: config.accessCode ? { 'x-athly-code': config.accessCode } : {},
  })

  if (!response.ok) throw new Error(`Сервер ответил ${response.status}`)
  return (await response.json()) as { ok: boolean; model?: string }
}
