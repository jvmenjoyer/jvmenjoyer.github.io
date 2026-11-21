import { z } from 'zod'
import { db } from './db'
import { downloadJson, fileStamp } from '@/lib/download'
import type {
  AppSettings,
  Exercise,
  Measurement,
  Program,
  Workout,
} from './types'

export interface BackupPayload {
  app: 'athly'
  version: number
  exportedAt: string
  programs: Program[]
  workouts: Workout[]
  measurements: Measurement[]
  customExercises?: Exercise[]
  settings?: AppSettings
}

const schema = z.object({
  app: z.literal('athly'),
  version: z.number(),
  programs: z.array(z.any()),
  workouts: z.array(z.any()),
  measurements: z.array(z.any()),
  customExercises: z.array(z.any()).optional(),
  settings: z.any().optional(),
})

export async function buildBackup(): Promise<BackupPayload> {
  const [programs, workouts, measurements, customExercises, settings] =
    await Promise.all([
      db.programs.toArray(),
      db.workouts.toArray(),
      db.measurements.toArray(),
      db.exercises.filter((exercise) => Boolean(exercise.isCustom)).toArray(),
      db.settings.get('app'),
    ])

  return {
    app: 'athly',
    version: 1,
    exportedAt: new Date().toISOString(),
    programs,
    workouts,
    measurements,
    customExercises,
    settings,
  }
}

export async function exportBackupJson(): Promise<void> {
  const payload = await buildBackup()
  downloadJson(`athly-backup-${fileStamp()}.json`, payload)
}

function parseBackup(text: string): BackupPayload {
  let parsed: unknown

  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('Файл не является корректным JSON')
  }

  const result = schema.safeParse(parsed)
  if (!result.success) {
    throw new Error('Файл не похож на резервную копию Athly')
  }

  return result.data as unknown as BackupPayload
}

export async function applyBackupPayload(data: BackupPayload): Promise<void> {
  await db.transaction(
    'rw',
    [db.programs, db.workouts, db.measurements, db.exercises, db.settings],
    async () => {
      const customIds = (await db.exercises.toArray())
        .filter((exercise) => exercise.isCustom)
        .map((exercise) => exercise.id)

      await Promise.all([
        db.programs.clear(),
        db.workouts.clear(),
        db.measurements.clear(),
        customIds.length > 0
          ? db.exercises.bulkDelete(customIds)
          : Promise.resolve(),
      ])

      await db.programs.bulkPut(data.programs)
      await db.workouts.bulkPut(data.workouts)
      await db.measurements.bulkPut(data.measurements)
      if (data.customExercises?.length) {
        await db.exercises.bulkPut(data.customExercises)
      }
      if (data.settings?.id === 'app') {
        await db.settings.put({
          ...data.settings,
          id: 'app',
          unit: 'kg',
        })
      }
    },
  )
}

export async function importBackupJson(text: string): Promise<void> {
  await applyBackupPayload(parseBackup(text))
}

export async function importBackup(file: File): Promise<void> {
  await importBackupJson(await file.text())
}
