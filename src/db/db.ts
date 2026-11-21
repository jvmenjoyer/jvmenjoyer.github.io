import Dexie, { type Table } from 'dexie'
import type {
  AppSettings,
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

  constructor() {
    super('athly')

    this.version(1).stores({
      exercises: 'id, nameRu, category, level, equipment',
      programs: 'id, name, isPreset, createdAt',
      workouts: 'id, date, createdAt',
      measurements: 'id, date',
      settings: 'id',
    })
  }
}

export const db = new AthlyDB()
