import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db'
import { monthRange } from '@/lib/date'
import type {
  AppSettings,
  CoachMessage,
  Exercise,
  Measurement,
  Program,
  Workout,
} from './types'

export function useExercises(): Exercise[] {
  return (
    useLiveQuery(
      () =>
        db.exercises
          .toArray()
          .then((list) =>
            list
              .filter((exercise) => !exercise.deletedAt)
              .sort((a, b) => a.nameRu.localeCompare(b.nameRu, 'ru')),
          ),
      [],
      [] as Exercise[],
    ) ?? []
  )
}

export function useExercise(id: string | undefined): Exercise | undefined {
  return useLiveQuery(async () => {
    if (!id) return undefined
    const exercise = await db.exercises.get(id)
    return exercise && !exercise.deletedAt ? exercise : undefined
  }, [id])
}

export function usePrograms(): Program[] {
  return (
    useLiveQuery(
      () =>
        db.programs
          .toArray()
          .then((list) =>
            list
              .filter((program) => !program.deletedAt)
              .sort((a, b) => {
                if (Boolean(a.isPreset) !== Boolean(b.isPreset)) {
                  return a.isPreset ? -1 : 1
                }
                return a.name.localeCompare(b.name, 'ru')
              }),
          ),
      [],
      [] as Program[],
    ) ?? []
  )
}

export function useProgram(id: string | undefined): Program | undefined {
  return useLiveQuery(async () => {
    if (!id) return undefined
    const program = await db.programs.get(id)
    return program && !program.deletedAt ? program : undefined
  }, [id])
}

export function useWorkouts(): Workout[] {
  return (
    useLiveQuery(
      () =>
        db.workouts
          .toArray()
          .then((list) =>
            list
              .filter((workout) => !workout.deletedAt)
              .sort(
                (a, b) =>
                  b.date.localeCompare(a.date) ||
                  b.createdAt.localeCompare(a.createdAt),
              ),
          ),
      [],
      [] as Workout[],
    ) ?? []
  )
}

export function useMonthWorkouts(month: Date): Workout[] {
  const { start, end } = monthRange(month)
  return (
    useLiveQuery(
      async () => {
        const list = await db.workouts
          .where('date')
          .between(start, end, true, true)
          .toArray()
        return list
          .filter((workout) => !workout.deletedAt)
          .sort((a, b) => a.date.localeCompare(b.date))
      },
      [start, end],
      [] as Workout[],
    ) ?? []
  )
}

export function useWorkout(id: string | undefined): Workout | undefined {
  return useLiveQuery(async () => {
    if (!id) return undefined
    const workout = await db.workouts.get(id)
    return workout && !workout.deletedAt ? workout : undefined
  }, [id])
}

export function useMeasurements(): Measurement[] {
  return (
    useLiveQuery(
      () =>
        db.measurements
          .toArray()
          .then((list) =>
            list
              .filter((item) => !item.deletedAt)
              .sort((a, b) => b.date.localeCompare(a.date)),
          ),
      [],
      [] as Measurement[],
    ) ?? []
  )
}

export function useSettings(): AppSettings | undefined {
  return useLiveQuery(() => db.settings.get('app'), [])
}

export function useCoachMessages(): CoachMessage[] {
  return (
    useLiveQuery(
      () => db.coachMessages.orderBy('createdAt').toArray(),
      [],
      [] as CoachMessage[],
    ) ?? []
  )
}
