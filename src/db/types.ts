export interface SyncMeta {
  updatedAt?: string
  deletedAt?: string
}

export interface Exercise extends SyncMeta {
  id: string
  nameRu: string
  nameEn?: string
  instructionsRu: string[]
  instructionsEn?: string[]
  primaryMuscles: string[]
  secondaryMuscles: string[]
  equipment: string
  level: string
  mechanic?: string | null
  force?: string | null
  category: string
  images: string[]
  isCustom?: boolean
  /** Группа мышц для кастомных упражнений */
  group?: string
  createdAt?: string
}

export interface ProgramExercise {
  id: string
  exerciseId: string
  sets: number
  reps: string
  restSec?: number
  rpe?: number
  supersetGroup?: string
  note?: string
}

export interface ProgramDay {
  id: string
  name: string
  exercises: ProgramExercise[]
}

export interface Program extends SyncMeta {
  id: string
  name: string
  description?: string
  goal?: string
  level?: string
  days: ProgramDay[]
  isPreset?: boolean
  createdAt: string
}

export interface WorkoutSet {
  id: string
  weight: number
  reps: number
  rpe?: number
  warmup?: boolean
  done?: boolean
}

export interface WorkoutExercise {
  id: string
  exerciseId: string
  sets: WorkoutSet[]
  supersetGroup?: string
  note?: string
  targetSets?: number
  targetReps?: string
  restSec?: number
}

export interface Workout extends SyncMeta {
  id: string
  date: string
  name: string
  programId?: string
  programDayId?: string
  startedAt: string
  finishedAt?: string
  notes?: string
  exercises: WorkoutExercise[]
  createdAt: string
}

export interface Measurement extends SyncMeta {
  id: string
  date: string
  weight: number
  bodyFat?: number
  chest?: number
  waist?: number
  hips?: number
  arm?: number
  thigh?: number
  calf?: number
  note?: string
  createdAt: string
}

export interface AppSettings extends SyncMeta {
  id: 'app'
  unit: 'kg'
  catalogVersion?: string
  programsSeeded?: boolean
  createdAt: string
}

export type CoachRole = 'user' | 'assistant'

export interface CoachActionBase {
  id: string
  status: 'pending' | 'applied' | 'cancelled'
}

export interface CoachProgramAction extends CoachActionBase {
  type: 'create_program'
  program: Program
}

export interface CoachMeasurementAction extends CoachActionBase {
  type: 'save_measurement'
  measurement: Measurement
}

export interface CoachWorkoutAction extends CoachActionBase {
  type: 'start_workout'
  workout: Workout
}

export type CoachAction =
  | CoachProgramAction
  | CoachMeasurementAction
  | CoachWorkoutAction

export interface CoachMessage {
  id: string
  role: CoachRole
  content: string
  createdAt: string
  actions?: CoachAction[]
  error?: boolean
}
