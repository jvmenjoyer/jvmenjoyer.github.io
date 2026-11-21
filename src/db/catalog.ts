import { db } from './db'
import { PRESET_PROGRAMS } from '@/data/presets'
import { nowISO } from '@/lib/id'
import type { AppSettings, Exercise } from './types'

const CATALOG_VERSION = 'en-1'
export const CATALOG_URL = '/data/exercises.json'

const DEFAULT_SETTINGS: AppSettings = {
  id: 'app',
  unit: 'kg',
  createdAt: nowISO(),
}

async function ensureSettings(): Promise<AppSettings> {
  const existing = await db.settings.get('app')
  if (existing) return existing
  const settings: AppSettings = { ...DEFAULT_SETTINGS, createdAt: nowISO() }
  await db.settings.put(settings)
  return settings
}

async function ensurePresets(settings: AppSettings): Promise<void> {
  if (settings.programsSeeded) return

  const stamp = nowISO()
  await db.programs.bulkPut(
    PRESET_PROGRAMS.map((program) => ({
      ...program,
      createdAt: program.createdAt ?? stamp,
      updatedAt: stamp,
    })),
  )

  await db.settings.update('app', { programsSeeded: true, updatedAt: stamp })
}

export async function ensureCatalog(): Promise<number> {
  const settings = await ensureSettings()
  const count = await db.exercises.count()

  const needsLoad =
    !settings.catalogVersion ||
    settings.catalogVersion !== CATALOG_VERSION ||
    count === 0

  if (needsLoad) {
    const response = await fetch(CATALOG_URL, { cache: 'no-store' })
    if (!response.ok) {
      throw new Error(`РќРµ СѓРґР°Р»РѕСЃСЊ СЃРєР°С‡Р°С‚СЊ Р±Р°Р·Сѓ СѓРїСЂР°Р¶РЅРµРЅРёР№ (${response.status})`)
    }

    const list = (await response.json()) as Exercise[]
    if (!Array.isArray(list) || list.length < 100) {
      throw new Error('Р‘Р°Р·Р° СѓРїСЂР°Р¶РЅРµРЅРёР№ РїРѕРІСЂРµР¶РґРµРЅР° РёР»Рё РЅРµ СЃРєР°С‡Р°Р»Р°СЃСЊ')
    }

    const stamp = nowISO()
    await db.exercises.bulkPut(
      list.map((exercise) => ({
        ...exercise,
        isCustom: false,
        createdAt: exercise.createdAt ?? stamp,
        updatedAt: exercise.updatedAt ?? stamp,
      })),
    )

    await db.settings.update('app', {
      catalogVersion: CATALOG_VERSION,
      updatedAt: stamp,
    })
  }

  const fresh = await ensureSettings()
  await ensurePresets(fresh)
  return db.exercises.count()
}

export async function reseedPresets(): Promise<void> {
  const stamp = nowISO()
  await db.programs.bulkPut(
    PRESET_PROGRAMS.map((program) => ({
      ...program,
      createdAt: program.createdAt ?? stamp,
      updatedAt: stamp,
    })),
  )
  await db.settings.update('app', { programsSeeded: true, updatedAt: stamp })
}


