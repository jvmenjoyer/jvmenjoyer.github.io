import { subDays } from 'date-fns'
import { db } from '@/db/db'
import type {
  CoachAction,
  Exercise,
  Measurement,
  Program,
  Workout,
} from '@/db/types'
import { buildEmptyWorkout, buildWorkoutFromProgram, newId } from '@/db/repo'
import { nowISO } from '@/lib/id'
import { toISODate, todayISO } from '@/lib/date'
import {
  equipmentLabel,
  exerciseGroup,
  MUSCLE_GROUPS,
} from '@/lib/labels'
import {
  exerciseHistory,
  personalBest,
  totalVolume,
  volumeByGroup,
  workoutStats,
} from '@/lib/stats'
import { round1 } from '@/lib/format'
import type { ToolDefinition, ToolResult } from './types'

const emptyParameters = {
  type: 'object',
  properties: {},
  additionalProperties: false,
}

export const COACH_TOOLS: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'get_snapshot',
      description:
        'Компактный снимок данных пользователя: недавние тренировки, рекорды, программы, замеры, активная тренировка. Вызывай перед любым советом о тренировках.',
      parameters: emptyParameters,
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_exercises',
      description:
        'Поиск упражнений в базе по названию, группе мышц или инвентарю. Возвращает exerciseId, который нужно использовать в propose_program.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Название или часть названия' },
          group: {
            type: 'string',
            enum: [
              'chest',
              'back',
              'shoulders',
              'biceps',
              'triceps',
              'forearms',
              'legs',
              'glutes',
              'abs',
              'other',
            ],
            description: 'Группа мышц',
          },
          equipment: { type: 'string', description: 'Инвентарь, например barbell' },
          limit: { type: 'number', description: 'Сколько вернуть, максимум 20' },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_exercise',
      description:
        'Карточка упражнения: мышцы, инвентарь, техника, личный рекорд и последние результаты.',
      parameters: {
        type: 'object',
        properties: { exerciseId: { type: 'string' } },
        required: ['exerciseId'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_exercise_history',
      description:
        'История упражнения по датам: лучший вес, повторения, объём. Используй для анализа прогресса.',
      parameters: {
        type: 'object',
        properties: { exerciseId: { type: 'string' } },
        required: ['exerciseId'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_program',
      description:
        'Полная программа: дни, упражнения, подходы, повторения, отдых и суперсеты.',
      parameters: {
        type: 'object',
        properties: { programId: { type: 'string' } },
        required: ['programId'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_progress',
      description:
        'Сводка прогресса за период: тренировки, объём, группы мышц, свежие рекорды.',
      parameters: {
        type: 'object',
        properties: {
          days: { type: 'number', description: 'Период в днях, по умолчанию 28' },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'propose_program',
      description:
        'Предложить новую программу. Создаёт черновик, который пользователь подтвердит в приложении. Используй только реальные exerciseId из search_exercises.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          goal: {
            type: 'string',
            enum: ['mass', 'strength', 'fatloss', 'tone', 'endurance'],
          },
          level: { type: 'string', enum: ['beginner', 'intermediate', 'expert'] },
          days: {
            type: 'array',
            minItems: 1,
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                exercises: {
                  type: 'array',
                  minItems: 1,
                  items: {
                    type: 'object',
                    properties: {
                      exerciseId: { type: 'string' },
                      sets: { type: 'number' },
                      reps: { type: 'string', description: 'Например 8-12 или 5' },
                      restSec: { type: 'number' },
                      supersetGroup: { type: 'string' },
                    },
                    required: ['exerciseId', 'sets', 'reps'],
                    additionalProperties: false,
                  },
                },
              },
              required: ['name', 'exercises'],
              additionalProperties: false,
            },
          },
        },
        required: ['name', 'days'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'propose_measurement',
      description:
        'Предложить сохранить замер тела (вес и обхваты). Пользователь подтвердит в приложении.',
      parameters: {
        type: 'object',
        properties: {
          date: { type: 'string', description: 'YYYY-MM-DD, по умолчанию сегодня' },
          weight: { type: 'number' },
          bodyFat: { type: 'number' },
          chest: { type: 'number' },
          waist: { type: 'number' },
          hips: { type: 'number' },
          arm: { type: 'number' },
          thigh: { type: 'number' },
          calf: { type: 'number' },
          note: { type: 'string' },
        },
        required: ['weight'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'propose_workout',
      description:
        'Предложить начать тренировку по дню программы или с выбранных упражнений. Пользователь подтвердит, после чего откроется экран тренировки.',
      parameters: {
        type: 'object',
        properties: {
          programId: { type: 'string' },
          programDayId: { type: 'string' },
          date: { type: 'string' },
          name: { type: 'string' },
          exerciseIds: { type: 'array', items: { type: 'string' } },
        },
        additionalProperties: false,
      },
    },
  },
]

function numberArg(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function stringArg(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

async function buildSnapshot() {
  const [workouts, programs, measurements, exerciseCount, settings] =
    await Promise.all([
      db.workouts.toArray(),
      db.programs.toArray(),
      db.measurements.toArray(),
      db.exercises.filter((exercise) => !exercise.hidden).count(),
      db.settings.get('app'),
    ])

  const finished = workouts
    .filter((workout) => workout.finishedAt)
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
    )
  const recent = finished.slice(0, 14).map((workout) => {
    const stats = workoutStats(workout)
    return {
      id: workout.id,
      date: workout.date,
      name: workout.name,
      exercises: stats.exerciseCount,
      sets: stats.sets,
      volume: stats.volume,
      minutes: Math.round(stats.durationSec / 60),
    }
  })

  const usedIds = [
    ...new Set(
      finished.flatMap((workout) =>
        workout.exercises.map((exercise) => exercise.exerciseId),
      ),
    ),
  ]
  const exerciseRows = await db.exercises.bulkGet(usedIds)
  const nameById = new Map(
    exerciseRows
      .filter((exercise): exercise is Exercise => Boolean(exercise))
      .map((exercise) => [exercise.id, exercise.nameRu]),
  )

  const prs = usedIds
    .map((id) => ({ id, best: personalBest(finished, id) }))
    .filter((item) => item.best)
    .sort((a, b) => (b.best?.date ?? '').localeCompare(a.best?.date ?? ''))
    .slice(0, 10)
    .map((item) => ({
      exerciseId: item.id,
      name: nameById.get(item.id) ?? item.id,
      weight: item.best?.weight,
      reps: item.best?.reps,
      date: item.best?.date,
    }))

  const active = workouts.find((workout) => !workout.finishedAt)

  return {
    today: todayISO(),
    unit: settings?.unit ?? 'kg',
    totals: {
      workouts: finished.length,
      exercisesInCatalog: exerciseCount,
      programs: programs.length,
      measurements: measurements.length,
    },
    recent,
    prs,
    programs: programs.map((program) => ({
      id: program.id,
      name: program.name,
      isPreset: Boolean(program.isPreset),
      days: program.days.map((day) => ({
        id: day.id,
        name: day.name,
        exercises: day.exercises.length,
      })),
    })),
    measurements: measurements.slice(0, 5).map((measurement) => ({
      date: measurement.date,
      weight: measurement.weight,
      bodyFat: measurement.bodyFat,
      waist: measurement.waist,
    })),
    activeWorkout: active
      ? { id: active.id, name: active.name, date: active.date, exercises: active.exercises.length }
      : null,
  }
}

async function searchExercises(args: Record<string, unknown>) {
  const query = stringArg(args.query).toLowerCase()
  const group = stringArg(args.group)
  const equipment = stringArg(args.equipment)
  const limit = Math.min(Math.max(Math.round(numberArg(args.limit, 12)), 1), 20)

  const exercises = await db.exercises.toArray()
  return exercises
    .filter((exercise) => !exercise.hidden)
    .filter((exercise) => {
      if (group && exerciseGroup(exercise) !== group) return false
      if (equipment && exercise.equipment !== equipment) return false
      if (!query) return true
      return [exercise.nameRu, exercise.nameEn, exercise.equipment]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(query)
    })
    .slice(0, limit)
    .map((exercise) => ({
      exerciseId: exercise.id,
      nameRu: exercise.nameRu,
      nameEn: exercise.nameEn,
      group: exerciseGroup(exercise),
      groupLabel: MUSCLE_GROUPS[exerciseGroup(exercise)],
      equipment: exercise.equipment,
      equipmentLabel: equipmentLabel(exercise.equipment),
    }))
}

async function getExercise(args: Record<string, unknown>) {
  const id = stringArg(args.exerciseId)
  const exercise = await db.exercises.get(id)
  if (!exercise) return { error: 'Упражнение не найдено' }

  const workouts = (await db.workouts.toArray()).filter((workout) => workout.finishedAt)
  const best = personalBest(workouts, id)
  const history = exerciseHistory(workouts, id).slice(-8)

  return {
    exerciseId: exercise.id,
    nameRu: exercise.nameRu,
    nameEn: exercise.nameEn,
    groupLabel: MUSCLE_GROUPS[exerciseGroup(exercise)],
    equipmentLabel: equipmentLabel(exercise.equipment),
    muscles: exercise.primaryMuscles,
    instructions: exercise.instructionsRu.slice(0, 5),
    personalBest: best,
    history,
  }
}

async function getExerciseHistory(args: Record<string, unknown>) {
  const id = stringArg(args.exerciseId)
  const exercise = await db.exercises.get(id)
  if (!exercise) return { error: 'Упражнение не найдено' }

  const workouts = (await db.workouts.toArray()).filter((workout) => workout.finishedAt)
  const history = exerciseHistory(workouts, id)

  return {
    exerciseId: id,
    nameRu: exercise.nameRu,
    personalBest: personalBest(workouts, id),
    history: history.slice(-12),
  }
}

async function getProgram(args: Record<string, unknown>) {
  const id = stringArg(args.programId)
  const program = await db.programs.get(id)
  if (!program) return { error: 'Программа не найдена' }

  const ids = [
    ...new Set(program.days.flatMap((day) => day.exercises.map((entry) => entry.exerciseId))),
  ]
  const rows = await db.exercises.bulkGet(ids)
  const nameById = new Map(
    rows
      .filter((exercise): exercise is Exercise => Boolean(exercise))
      .map((exercise) => [exercise.id, exercise.nameRu]),
  )

  return {
    id: program.id,
    name: program.name,
    description: program.description,
    goal: program.goal,
    level: program.level,
    isPreset: Boolean(program.isPreset),
    days: program.days.map((day) => ({
      programDayId: day.id,
      name: day.name,
      exercises: day.exercises.map((entry) => ({
        exerciseId: entry.exerciseId,
        name: nameById.get(entry.exerciseId) ?? entry.exerciseId,
        sets: entry.sets,
        reps: entry.reps,
        restSec: entry.restSec,
        supersetGroup: entry.supersetGroup,
      })),
    })),
  }
}

async function getProgress(args: Record<string, unknown>) {
  const days = Math.min(Math.max(Math.round(numberArg(args.days, 28)), 7), 365)
  const start = toISODate(subDays(new Date(), days - 1))
  const workouts = (await db.workouts.toArray()).filter(
    (workout) => workout.finishedAt && workout.date >= start,
  )
  const exercises = await db.exercises.toArray()
  const groups = volumeByGroup(workouts, exercises)
  const usedIds = [
    ...new Set(workouts.flatMap((workout) => workout.exercises.map((item) => item.exerciseId))),
  ]
  const nameById = new Map(exercises.map((exercise) => [exercise.id, exercise.nameRu]))

  const prs = usedIds
    .map((id) => ({ id, best: personalBest(workouts, id) }))
    .filter((item) => item.best)
    .sort((a, b) => (b.best?.date ?? '').localeCompare(a.best?.date ?? ''))
    .slice(0, 8)
    .map((item) => ({
      exerciseId: item.id,
      name: nameById.get(item.id) ?? item.id,
      weight: item.best?.weight,
      reps: item.best?.reps,
      date: item.best?.date,
    }))

  return {
    periodDays: days,
    workouts: workouts.length,
    volume: totalVolume(workouts),
    sets: workouts.reduce((sum, workout) => sum + workoutStats(workout).sets, 0),
    groups,
    prs,
  }
}

async function proposeProgram(args: Record<string, unknown>): Promise<ToolResult> {
  const name = stringArg(args.name)
  const rawDays = Array.isArray(args.days) ? args.days : []

  if (!name) return { content: { error: 'Нужно название программы' } }
  if (rawDays.length === 0) return { content: { error: 'Нужен хотя бы один день' } }

  const days = rawDays.map((rawDay) => {
    const day = rawDay as Record<string, unknown>
    const rawExercises = Array.isArray(day.exercises) ? day.exercises : []
    return {
      name: stringArg(day.name) || 'День',
      exercises: rawExercises.map((rawExercise) => {
        const entry = rawExercise as Record<string, unknown>
        return {
          exerciseId: stringArg(entry.exerciseId),
          sets: Math.max(1, Math.round(numberArg(entry.sets, 3))),
          reps: stringArg(entry.reps) || '8-12',
          restSec:
            typeof entry.restSec === 'number'
              ? Math.max(0, Math.round(entry.restSec))
              : undefined,
          supersetGroup: stringArg(entry.supersetGroup) || undefined,
        }
      }),
    }
  })

  const allIds = [...new Set(days.flatMap((day) => day.exercises.map((item) => item.exerciseId)))]
  const rows = await db.exercises.bulkGet(allIds)
  const missing = allIds.filter((_, index) => !rows[index])
  if (missing.length > 0) {
    return {
      content: {
        error: `Неизвестные exerciseId: ${missing.join(', ')}. Используй search_exercises.`,
      },
    }
  }

  if (days.some((day) => day.exercises.length === 0)) {
    return { content: { error: 'В каждом дне должно быть хотя бы одно упражнение' } }
  }

  const program: Program = {
    id: newId(),
    name,
    description: stringArg(args.description) || undefined,
    goal: stringArg(args.goal) || 'mass',
    level: stringArg(args.level) || 'intermediate',
    isPreset: false,
    createdAt: nowISO(),
    days: days.map((day) => ({
      id: newId(),
      name: day.name,
      exercises: day.exercises.map((entry) => ({ ...entry, id: newId() })),
    })),
  }

  const action: CoachAction = {
    id: newId(),
    type: 'create_program',
    status: 'pending',
    program,
  }

  return {
    content: {
      status: 'pending_confirmation',
      message: 'Программа подготовлена. Пользователь должен подтвердить создание.',
      summary: {
        name: program.name,
        days: program.days.length,
        exercises: program.days.reduce((sum, day) => sum + day.exercises.length, 0),
      },
    },
    action,
    trace: 'Готовлю программу',
  }
}

async function proposeMeasurement(args: Record<string, unknown>): Promise<ToolResult> {
  const weight = numberArg(args.weight)
  if (weight <= 0) return { content: { error: 'Нужен корректный вес' } }

  const measurement: Measurement = {
    id: newId(),
    date: stringArg(args.date) || todayISO(),
    weight: round1(weight),
    bodyFat: numberArg(args.bodyFat) || undefined,
    chest: numberArg(args.chest) || undefined,
    waist: numberArg(args.waist) || undefined,
    hips: numberArg(args.hips) || undefined,
    arm: numberArg(args.arm) || undefined,
    thigh: numberArg(args.thigh) || undefined,
    calf: numberArg(args.calf) || undefined,
    note: stringArg(args.note) || undefined,
    createdAt: nowISO(),
  }

  const action: CoachAction = {
    id: newId(),
    type: 'save_measurement',
    status: 'pending',
    measurement,
  }

  return {
    content: {
      status: 'pending_confirmation',
      message: 'Замер подготовлен. Пользователь должен подтвердить.',
      measurement: { date: measurement.date, weight: measurement.weight },
    },
    action,
    trace: 'Готовлю замер',
  }
}

async function proposeWorkout(args: Record<string, unknown>): Promise<ToolResult> {
  const programId = stringArg(args.programId)
  const programDayId = stringArg(args.programDayId)
  const date = stringArg(args.date) || todayISO()
  const name = stringArg(args.name)
  const exerciseIds = Array.isArray(args.exerciseIds)
    ? args.exerciseIds.filter((value): value is string => typeof value === 'string')
    : []

  let workout: Workout

  if (programId && programDayId) {
    const program = await db.programs.get(programId)
    if (!program) return { content: { error: 'Программа не найдена' } }
    const day = program.days.find((item) => item.id === programDayId)
    if (!day) return { content: { error: 'День программы не найден' } }
    workout = buildWorkoutFromProgram(program, day, date)
  } else if (exerciseIds.length > 0) {
    const rows = await db.exercises.bulkGet(exerciseIds)
    const missing = exerciseIds.filter((_, index) => !rows[index])
    if (missing.length > 0) {
      return { content: { error: `Неизвестные exerciseId: ${missing.join(', ')}` } }
    }
    workout = buildEmptyWorkout(date, name || 'Тренировка')
    workout.exercises = exerciseIds.map((exerciseId) => ({
      id: newId(),
      exerciseId,
      targetSets: 3,
      targetReps: '8-12',
      sets: Array.from({ length: 3 }, () => ({
        id: newId(),
        weight: 0,
        reps: 0,
        done: false,
      })),
    }))
  } else {
    return {
      content: {
        error: 'Укажи programId + programDayId или exerciseIds',
      },
    }
  }

  const action: CoachAction = {
    id: newId(),
    type: 'start_workout',
    status: 'pending',
    workout,
  }

  return {
    content: {
      status: 'pending_confirmation',
      message: 'Тренировка подготовлена. Пользователь должен подтвердить.',
      workout: { name: workout.name, date: workout.date, exercises: workout.exercises.length },
    },
    action,
    trace: 'Готовлю тренировку',
  }
}

export async function executeTool(
  name: string,
  args: Record<string, unknown>,
): Promise<ToolResult> {
  try {
    switch (name) {
      case 'get_snapshot':
        return { content: await buildSnapshot(), trace: 'Смотрю данные' }
      case 'search_exercises':
        return { content: await searchExercises(args), trace: 'Ищу упражнения' }
      case 'get_exercise':
        return { content: await getExercise(args), trace: 'Открываю упражнение' }
      case 'get_exercise_history':
        return { content: await getExerciseHistory(args), trace: 'Смотрю историю' }
      case 'get_program':
        return { content: await getProgram(args), trace: 'Смотрю программу' }
      case 'get_progress':
        return { content: await getProgress(args), trace: 'Считаю прогресс' }
      case 'propose_program':
        return await proposeProgram(args)
      case 'propose_measurement':
        return await proposeMeasurement(args)
      case 'propose_workout':
        return await proposeWorkout(args)
      default:
        return { content: { error: `Неизвестный инструмент: ${name}` } }
    }
  } catch (error) {
    console.error(`Ошибка инструмента ${name}`, error)
    return {
      content: {
        error: error instanceof Error ? error.message : 'Ошибка инструмента',
      },
    }
  }
}
