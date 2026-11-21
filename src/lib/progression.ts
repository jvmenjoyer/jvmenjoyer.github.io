import type {
  Exercise,
  Program,
  ProgramDay,
  Workout,
  WorkoutSet,
} from '@/db/types'
import { buildWorkoutFromProgram, newId } from '@/db/repo'
import { round1 } from '@/lib/format'

export interface RepRange {
  min: number
  max: number
}

export function parseRepRange(reps: string | undefined): RepRange {
  const numbers = (reps ?? '')
    .match(/\d+/g)
    ?.map((value) => Number.parseInt(value, 10))
    .filter((value) => Number.isFinite(value) && value > 0)

  if (!numbers || numbers.length === 0) return { min: 8, max: 12 }
  if (numbers.length === 1) return { min: numbers[0], max: numbers[0] }
  return { min: Math.min(...numbers), max: Math.max(...numbers) }
}

export function progressionIncrement(exercise: Exercise | undefined): number {
  if (!exercise) return 1

  switch (exercise.equipment) {
    case 'body only':
      return 0
    case 'dumbbell':
    case 'kettlebells':
      return 1
    case 'barbell':
    case 'e-z curl bar':
    case 'machine':
    case 'cable':
      return 2.5
    default:
      return 1
  }
}

function roundTo(value: number, step: number): number {
  if (step <= 0) return round1(value)
  return round1(Math.max(step, Math.round(value / step) * step))
}

export interface LastExerciseSets {
  date: string
  workoutId: string
  sets: WorkoutSet[]
}

export function lastExerciseSets(
  workouts: Workout[],
  exerciseId: string,
): LastExerciseSets | null {
  const ordered = [...workouts]
    .filter((workout) => workout.finishedAt)
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
    )

  for (const workout of ordered) {
    const item = workout.exercises.find((entry) => entry.exerciseId === exerciseId)
    if (!item) continue

    const sets = item.sets.filter(
      (set) => !set.warmup && set.reps > 0 && set.weight >= 0,
    )

    if (sets.length > 0) {
      return { date: workout.date, workoutId: workout.id, sets }
    }
  }

  return null
}

export type ProgressionDirection = 'up' | 'down' | 'hold' | 'none'

export interface ProgressionSuggestion {
  weight: number
  reason: string
  direction: ProgressionDirection
}

export function suggestWeight(input: {
  exercise?: Exercise
  lastSets?: WorkoutSet[]
  targetReps?: string
}): ProgressionSuggestion {
  const { exercise, lastSets, targetReps } = input
  const range = parseRepRange(targetReps)
  const increment = progressionIncrement(exercise)

  if (!lastSets || lastSets.length === 0) {
    return {
      weight: 0,
      reason: 'нет истории — подбери рабочий вес',
      direction: 'none',
    }
  }

  const working = lastSets.filter(
    (set) => !set.warmup && set.reps > 0 && set.weight >= 0,
  )
  if (working.length === 0) {
    return { weight: 0, reason: 'нет рабочих подходов', direction: 'none' }
  }

  const maxWeight = Math.max(...working.map((set) => set.weight))
  if (maxWeight <= 0) {
    const allTop = working.every((set) => set.reps >= range.max)
    return {
      weight: 0,
      reason: allTop
        ? 'собственный вес — все подходы на верхней границе, добавь повторения'
        : 'собственный вес — добираем повторения',
      direction: allTop ? 'up' : 'hold',
    }
  }

  const allTop = working.every((set) => set.reps >= range.max)
  const failed = working.some((set) => set.reps < range.min)
  const rpeValues = working
    .map((set) => set.rpe)
    .filter((value): value is number => typeof value === 'number' && value > 0)
  const averageRpe =
    rpeValues.length > 0
      ? rpeValues.reduce((sum, value) => sum + value, 0) / rpeValues.length
      : 0

  if (increment === 0) {
    return {
      weight: 0,
      reason: allTop
        ? 'все подходы на верхней границе — добавь повторения'
        : 'держим вес — добираем повторения',
      direction: allTop ? 'up' : 'hold',
    }
  }

  if (allTop && (averageRpe === 0 || averageRpe <= 8.5)) {
    const weight = roundTo(maxWeight + increment, increment)
    return {
      weight,
      reason: `+${increment} кг — все подходы на верхней границе`,
      direction: 'up',
    }
  }

  if (failed || averageRpe >= 9.5) {
    const weight = roundTo(maxWeight * 0.95, increment)
    return {
      weight,
      reason: '−5% — были пропуски или RPE 10',
      direction: 'down',
    }
  }

  return {
    weight: maxWeight,
    reason: 'держим вес — добираем повторения',
    direction: 'hold',
  }
}

export function nextProgramDay(
  program: Program,
  workouts: Workout[],
): ProgramDay {
  if (program.days.length === 0) {
    return { id: newId(), name: 'День 1', exercises: [] }
  }

  const last = [...workouts]
    .filter(
      (workout) =>
        workout.finishedAt && workout.programId === program.id && workout.programDayId,
    )
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
    )[0]

  if (!last) return program.days[0]

  const index = program.days.findIndex((day) => day.id === last.programDayId)
  if (index < 0) return program.days[0]
  return program.days[(index + 1) % program.days.length]
}

export function activeProgram(
  programs: Program[],
  workouts: Workout[],
  activeProgramId?: string,
): Program | undefined {
  if (activeProgramId) {
    const selected = programs.find((program) => program.id === activeProgramId)
    if (selected) return selected
  }

  const lastProgramId = [...workouts]
    .filter((workout) => workout.finishedAt && workout.programId)
    .sort((a, b) => b.date.localeCompare(a.date))[0]?.programId

  if (lastProgramId) {
    const last = programs.find((program) => program.id === lastProgramId)
    if (last) return last
  }

  return (
    programs.find((program) => program.isPreset) ??
    programs[0] ??
    undefined
  )
}

export function buildSuggestedWorkout(
  program: Program,
  day: ProgramDay,
  workouts: Workout[],
  exercises: Map<string, Exercise>,
  date?: string,
  progressionEnabled = true,
): Workout {
  const workout = buildWorkoutFromProgram(program, day, date)

  workout.exercises = workout.exercises.map((item, index) => {
    const target = day.exercises[index]
    const exercise = exercises.get(item.exerciseId)
    const last = progressionEnabled
      ? lastExerciseSets(workouts, item.exerciseId)
      : null
    const suggestion = progressionEnabled
      ? suggestWeight({
          exercise,
          lastSets: last?.sets,
          targetReps: target?.reps,
        })
      : { weight: 0, reason: '', direction: 'none' as const }

    return {
      ...item,
      targetReps: target?.reps ?? item.targetReps,
      restSec: target?.restSec ?? item.restSec,
      autoNote: suggestion.reason || undefined,
      sets: item.sets.map((set) => ({
        id: set.id,
        weight: suggestion.weight,
        reps: 0,
        done: false,
      })),
    }
  })

  return workout
}
