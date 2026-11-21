import { db } from './db'
import { maybeAutoBackup } from './autoBackup'
import { newId, nowISO } from '@/lib/id'
import { round1 } from '@/lib/format'
import { todayISO } from '@/lib/date'
import type {
  AppSettings,
  CoachAction,
  CoachMessage,
  Exercise,
  Measurement,
  Program,
  ProgramDay,
  Workout,
} from './types'

export { newId }

function cloneExerciseEntry(entry: Program['days'][number]['exercises'][number], programId: string) {
  return {
    ...entry,
    id: newId(),
    supersetGroup: entry.supersetGroup ? `${programId}-${newId()}` : undefined,
  }
}

export function buildWorkoutFromProgram(
  program: Program,
  day: ProgramDay,
  date = todayISO(),
): Workout {
  const stamp = nowISO()

  return {
    id: newId(),
    date,
    name: `${program.name} — ${day.name}`,
    programId: program.id,
    programDayId: day.id,
    startedAt: stamp,
    createdAt: stamp,
    exercises: day.exercises.map((entry) => ({
      id: newId(),
      exerciseId: entry.exerciseId,
      supersetGroup: entry.supersetGroup,
      targetSets: entry.sets,
      targetReps: entry.reps,
      restSec: entry.restSec,
      sets: Array.from({ length: Math.max(1, entry.sets) }, () => ({
        id: newId(),
        weight: 0,
        reps: 0,
        done: false,
      })),
    })),
  }
}

export function buildEmptyWorkout(date = todayISO(), name = 'Тренировка'): Workout {
  const stamp = nowISO()
  return {
    id: newId(),
    date,
    name,
    startedAt: stamp,
    createdAt: stamp,
    exercises: [],
  }
}

export async function saveWorkout(workout: Workout): Promise<void> {
  await db.workouts.put({
    ...workout,
    exercises: workout.exercises.map((exercise) => ({
      ...exercise,
      sets: exercise.sets.map((set) => ({
        ...set,
        weight: round1(set.weight),
        reps: Math.max(0, Math.round(set.reps)),
      })),
    })),
    updatedAt: nowISO(),
  })
}

export async function finishWorkout(workout: Workout): Promise<void> {
  await saveWorkout({ ...workout, finishedAt: workout.finishedAt ?? nowISO() })
  void maybeAutoBackup('После тренировки').catch((error) => {
    console.error('Не удалось создать автокопию', error)
  })
}

export async function deleteWorkout(id: string): Promise<void> {
  await db.workouts.delete(id)
}

export async function saveProgram(program: Program): Promise<void> {
  await db.programs.put({
    ...program,
    updatedAt: nowISO(),
    createdAt: program.createdAt || nowISO(),
  })
}

export async function duplicateProgram(program: Program): Promise<string> {
  const stamp = nowISO()
  const copy: Program = {
    ...program,
    id: newId(),
    name: `${program.name} (копия)`,
    isPreset: false,
    createdAt: stamp,
    updatedAt: stamp,
    days: program.days.map((day) => ({
      ...day,
      id: newId(),
      exercises: day.exercises.map((entry) => ({
        ...cloneExerciseEntry(entry, program.id),
        supersetGroup: entry.supersetGroup ? `${newId()}` : undefined,
      })),
    })),
  }
  await db.programs.put(copy)
  return copy.id
}

export async function deleteProgram(id: string): Promise<void> {
  const program = await db.programs.get(id)
  if (program?.isPreset) {
    throw new Error('Готовую программу нельзя удалить. Сделайте копию и измените её.')
  }
  await db.programs.delete(id)
}

export async function saveExercise(exercise: Exercise): Promise<void> {
  await db.exercises.put({ ...exercise, updatedAt: nowISO() })
}

export async function addCustomExercise(
  input: Pick<
    Exercise,
    | 'nameRu'
    | 'instructionsRu'
    | 'equipment'
    | 'level'
    | 'category'
    | 'group'
  >,
): Promise<string> {
  const stamp = nowISO()
  const exercise: Exercise = {
    id: `custom-${newId()}`,
    nameRu: input.nameRu,
    nameEn: input.nameRu,
    instructionsRu: input.instructionsRu,
    instructionsEn: [],
    primaryMuscles: [],
    secondaryMuscles: [],
    equipment: input.equipment,
    level: input.level,
    category: input.category,
    group: input.group,
    images: [],
    isCustom: true,
    createdAt: stamp,
    updatedAt: stamp,
  }
  await db.exercises.put(exercise)
  return exercise.id
}

export async function deleteExercise(id: string): Promise<void> {
  const exercise = await db.exercises.get(id)
  if (!exercise?.isCustom) {
    throw new Error('Упражнения из базы удалять нельзя')
  }
  await db.exercises.delete(id)
}

export async function saveMeasurement(measurement: Measurement): Promise<void> {
  await db.measurements.put({ ...measurement, updatedAt: nowISO() })
}

export async function deleteMeasurement(id: string): Promise<void> {
  await db.measurements.delete(id)
}

export async function updateSettings(
  patch: Partial<Omit<AppSettings, 'id'>>,
): Promise<void> {
  await db.settings.update('app', { ...patch, updatedAt: nowISO() })
}

export async function saveCoachMessage(message: CoachMessage): Promise<void> {
  await db.coachMessages.put(message)
}

export async function updateCoachAction(
  messageId: string,
  actionId: string,
  status: CoachAction['status'],
): Promise<void> {
  const message = await db.coachMessages.get(messageId)
  if (!message) return

  await db.coachMessages.put({
    ...message,
    actions: message.actions?.map((action) =>
      action.id === actionId ? { ...action, status } : action,
    ),
  })
}

export async function clearCoachMessages(): Promise<void> {
  await db.coachMessages.clear()
}
