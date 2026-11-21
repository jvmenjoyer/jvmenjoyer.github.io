import { describe, expect, it } from 'vitest'
import type { Exercise, Program, Workout } from '@/db/types'
import {
  buildSuggestedWorkout,
  nextProgramDay,
  parseRepRange,
  progressionIncrement,
  suggestWeight,
} from './progression'

const squat: Exercise = {
  id: 'Barbell_Squat',
  nameRu: 'Приседания со штангой',
  nameEn: 'Barbell Squat',
  instructionsRu: [],
  instructionsEn: [],
  primaryMuscles: ['quadriceps'],
  secondaryMuscles: [],
  equipment: 'barbell',
  level: 'intermediate',
  mechanic: 'compound',
  category: 'strength',
  images: [],
  createdAt: '2026-01-01T00:00:00.000Z',
}

function workout(partial: Partial<Workout> = {}): Workout {
  return {
    id: 'w1',
    date: '2026-11-20',
    name: 'Тест',
    startedAt: '2026-11-20T10:00:00.000Z',
    finishedAt: '2026-11-20T11:00:00.000Z',
    createdAt: '2026-11-20T10:00:00.000Z',
    exercises: [
      {
        id: 'e1',
        exerciseId: 'Barbell_Squat',
        sets: [
          { id: 's1', weight: 100, reps: 12, rpe: 8, done: true },
          { id: 's2', weight: 100, reps: 12, rpe: 8, done: true },
        ],
      },
    ],
    ...partial,
  }
}

describe('parseRepRange', () => {
  it('понимает диапазон и одно число', () => {
    expect(parseRepRange('8-12')).toEqual({ min: 8, max: 12 })
    expect(parseRepRange('5')).toEqual({ min: 5, max: 5 })
    expect(parseRepRange(undefined)).toEqual({ min: 8, max: 12 })
  })
})

describe('progressionIncrement', () => {
  it('выбирает шаг по инвентарю', () => {
    expect(progressionIncrement(squat)).toBe(2.5)
    expect(progressionIncrement({ ...squat, equipment: 'dumbbell' })).toBe(1)
    expect(progressionIncrement({ ...squat, equipment: 'body only' })).toBe(0)
  })
})

describe('suggestWeight', () => {
  it('повышает вес на верхней границе', () => {
    const result = suggestWeight({
      exercise: squat,
      lastSets: [
        { id: '1', weight: 100, reps: 12, rpe: 8 },
        { id: '2', weight: 100, reps: 12, rpe: 8 },
      ],
      targetReps: '8-12',
    })
    expect(result.weight).toBe(102.5)
    expect(result.direction).toBe('up')
  })

  it('снижает при пропусках', () => {
    const result = suggestWeight({
      exercise: squat,
      lastSets: [
        { id: '1', weight: 100, reps: 6 },
        { id: '2', weight: 100, reps: 5 },
      ],
      targetReps: '8-12',
    })
    expect(result.weight).toBe(95)
    expect(result.direction).toBe('down')
  })

  it('оставляет вес, если диапазон не закрыт', () => {
    const result = suggestWeight({
      exercise: squat,
      lastSets: [
        { id: '1', weight: 100, reps: 9 },
        { id: '2', weight: 100, reps: 8 },
      ],
      targetReps: '8-12',
    })
    expect(result.weight).toBe(100)
    expect(result.direction).toBe('hold')
  })

  it('собственный вес не увеличивает', () => {
    const result = suggestWeight({
      exercise: { ...squat, equipment: 'body only' },
      lastSets: [{ id: '1', weight: 0, reps: 12 }],
      targetReps: '8-12',
    })
    expect(result.weight).toBe(0)
    expect(result.direction).toBe('up')
  })
})

describe('nextProgramDay', () => {
  const program: Program = {
    id: 'p1',
    name: 'P',
    isPreset: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    days: [
      { id: 'd1', name: 'A', exercises: [] },
      { id: 'd2', name: 'B', exercises: [] },
    ],
  }

  it('берёт первый день без истории', () => {
    expect(nextProgramDay(program, []).id).toBe('d1')
  })

  it('переходит к следующему дню', () => {
    const w = workout({ programId: 'p1', programDayId: 'd1' })
    expect(nextProgramDay(program, [w]).id).toBe('d2')
  })

  it('зацикливается', () => {
    const w = workout({ programId: 'p1', programDayId: 'd2' })
    expect(nextProgramDay(program, [w]).id).toBe('d1')
  })
})

describe('buildSuggestedWorkout', () => {
  it('подставляет вес и цель', () => {
    const program: Program = {
      id: 'p1',
      name: 'P',
      isPreset: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      days: [
        {
          id: 'd1',
          name: 'A',
          exercises: [
            { id: 'pe1', exerciseId: 'Barbell_Squat', sets: 3, reps: '8-12' },
          ],
        },
      ],
    }
    const built = buildSuggestedWorkout(
      program,
      program.days[0],
      [workout()],
      new Map([['Barbell_Squat', squat]]),
    )

    expect(built.exercises[0].sets[0].weight).toBe(102.5)
    expect(built.exercises[0].autoNote).toContain('+2.5')
    expect(built.programId).toBe('p1')
  })
})
