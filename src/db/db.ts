import Dexie, { type Table } from 'dexie'
import type {
  AppSettings,
  BackupSnapshot,
  CoachMessage,
  Exercise,
  Measurement,
  Program,
  Workout,
} from './types'

export class AthlyDB extends Dexie {
  exercises!: Table<Exercise, string>
  programs!: Table<Program, string>
  workouts!: Table<Workout, string>
  measurements!: Table<Measurement, string>
  settings!: Table<AppSettings, string>
  coachMessages!: Table<CoachMessage, string>
  backups!: Table<BackupSnapshot, string>

  constructor() {
    super('athly')

    this.version(1).stores({
      exercises: 'id, nameRu, category, level, equipment',
      programs: 'id, name, isPreset, createdAt',
      workouts: 'id, date, createdAt',
      measurements: 'id, date',
      settings: 'id',
    })

    this.version(2).stores({
      exercises: 'id, nameRu, category, level, equipment',
      programs: 'id, name, isPreset, createdAt',
      workouts: 'id, date, createdAt',
      measurements: 'id, date',
      settings: 'id',
      coachMessages: 'id, createdAt',
    })

    this.version(3).stores({
      exercises: 'id, nameRu, category, level, equipment',
      programs: 'id, name, isPreset, createdAt',
      workouts: 'id, date, createdAt',
      measurements: 'id, date',
      settings: 'id',
      coachMessages: 'id, createdAt',
      backups: 'id, createdAt',
    })
  }
}

export const db = new AthlyDB()
