import type { Exercise, Workout, WorkoutSet } from '@/db/types'
import { exerciseGroup, type MuscleGroup } from '@/lib/labels'
import { round1 } from '@/lib/format'

export interface WorkoutStats {
  volume: number
  sets: number
  reps: number
  durationSec: number
  exerciseCount: number
}

function isWorkingSet(set: WorkoutSet): boolean {
  return !set.warmup && set.reps > 0
}

export function workoutStats(workout: Workout, now: Date = new Date()): WorkoutStats {
  let volume = 0
  let sets = 0
  let reps = 0

  for (const exercise of workout.exercises) {
    for (const set of exercise.sets) {
      if (!isWorkingSet(set)) continue
      sets += 1
      reps += set.reps
      volume += set.weight * set.reps
    }
  }

  const start = new Date(workout.startedAt).getTime()
  const end = workout.finishedAt
    ? new Date(workout.finishedAt).getTime()
    : now.getTime()

  return {
    volume: round1(volume),
    sets,
    reps,
    durationSec: Math.max(0, Math.round((end - start) / 1000)),
    exerciseCount: workout.exercises.length,
  }
}

export interface PersonalBest {
  weight: number
  reps: number
  date: string
  workoutId: string
  oneRepMax: number
}

export function estimatedOneRepMax(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0
  return round1(weight * (1 + reps / 30))
}

export function personalBest(
  workouts: Workout[],
  exerciseId: string,
): PersonalBest | null {
  let best: PersonalBest | null = null

  for (const workout of workouts) {
    for (const exercise of workout.exercises) {
      if (exercise.exerciseId !== exerciseId) continue
      for (const set of exercise.sets) {
        if (!isWorkingSet(set) || set.weight <= 0) continue
        const candidate: PersonalBest = {
          weight: set.weight,
          reps: set.reps,
          date: workout.date,
          workoutId: workout.id,
          oneRepMax: estimatedOneRepMax(set.weight, set.reps),
        }
        if (
          !best ||
          candidate.weight > best.weight ||
          (candidate.weight === best.weight && candidate.reps > best.reps)
        ) {
          best = candidate
        }
      }
    }
  }

  return best
}

export interface HistoryPoint {
  date: string
  weight: number
  reps: number
  volume: number
}

export function exerciseHistory(
  workouts: Workout[],
  exerciseId: string,
): HistoryPoint[] {
  const points: HistoryPoint[] = []

  for (const workout of workouts) {
    const exercise = workout.exercises.find((item) => item.exerciseId === exerciseId)
    if (!exercise) continue

    let bestWeight = 0
    let bestReps = 0
    let volume = 0

    for (const set of exercise.sets) {
      if (!isWorkingSet(set)) continue
      volume += set.weight * set.reps
      if (set.weight > bestWeight || (set.weight === bestWeight && set.reps > bestReps)) {
        bestWeight = set.weight
        bestReps = set.reps
      }
    }

    if (volume <= 0) continue
    points.push({
      date: workout.date,
      weight: bestWeight,
      reps: bestReps,
      volume: round1(volume),
    })
  }

  return points.sort((a, b) => a.date.localeCompare(b.date))
}

export interface LastPerformance {
  weight: number
  reps: number
  date: string
}

export function lastPerformance(
  workouts: Workout[],
  exerciseId: string,
  excludeWorkoutId?: string,
): LastPerformance | null {
  for (const workout of workouts) {
    if (workout.id === excludeWorkoutId) continue
    for (const exercise of workout.exercises) {
      if (exercise.exerciseId !== exerciseId) continue
      let best: LastPerformance | null = null
      for (const set of exercise.sets) {
        if (!isWorkingSet(set) || set.weight <= 0) continue
        if (!best || set.weight > best.weight) {
          best = { weight: set.weight, reps: set.reps, date: workout.date }
        }
      }
      if (best) return best
    }
  }
  return null
}

export function volumeByGroup(
  workouts: Workout[],
  exercises: Exercise[],
): Record<MuscleGroup, number> {
  const byId = new Map(exercises.map((exercise) => [exercise.id, exercise]))
  const result: Record<MuscleGroup, number> = {
    chest: 0,
    back: 0,
    shoulders: 0,
    biceps: 0,
    triceps: 0,
    forearms: 0,
    legs: 0,
    glutes: 0,
    abs: 0,
    other: 0,
  }

  for (const workout of workouts) {
    for (const item of workout.exercises) {
      const group = exerciseGroup(byId.get(item.exerciseId))
      for (const set of item.sets) {
        if (!isWorkingSet(set)) continue
        result[group] += set.weight * set.reps
      }
    }
  }

  for (const key of Object.keys(result) as MuscleGroup[]) {
    result[key] = round1(result[key])
  }

  return result
}

export function workoutCountInRange(
  workouts: Workout[],
  start: string,
  end: string,
): number {
  return workouts.filter((workout) => workout.date >= start && workout.date <= end)
    .length
}

export function totalVolume(workouts: Workout[]): number {
  return round1(workouts.reduce((sum, workout) => sum + workoutStats(workout).volume, 0))
}
