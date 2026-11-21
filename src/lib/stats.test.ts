import { describe, expect, it } from 'vitest'
import type { Workout, WorkoutSet } from '@/db/types'
import {
  estimatedOneRepMax,
  exerciseHistory,
  lastPerformance,
  personalBest,
  workoutStats,
} from './stats'

function set(partial: Partial<WorkoutSet> = {}): WorkoutSet {
  return { id: Math.random().toString(16), weight: 60, reps: 8, done: true, ...partial }
}

function workout(partial: Partial<Workout> = {}): Workout {
  return {
    id: 'w1',
    date: '2026-11-21',
    name: 'Тест',
    startedAt: '2026-11-21T10:00:00.000Z',
    finishedAt: '2026-11-21T11:00:00.000Z',
    createdAt: '2026-11-21T10:00:00.000Z',
    exercises: [
      {
        id: 'e1',
        exerciseId: 'Barbell_Squat',
        sets: [set({ weight: 100, reps: 5 }), set({ weight: 90, reps: 8 })],
      },
    ],
    ...partial,
  }
}

describe('workoutStats', () => {
  it('считает объём без разминки', () => {
    const w = workout({
      exercises: [
        {
          id: 'e1',
          exerciseId: 'Barbell_Squat',
          sets: [
            set({ weight: 50, reps: 5, warmup: true }),
            set({ weight: 100, reps: 5 }),
            set({ weight: 90, reps: 8 }),
            set({ weight: 0, reps: 0 }),
          ],
        },
      ],
    })

    const stats = workoutStats(w, new Date('2026-11-21T11:00:00.000Z'))
    expect(stats.volume).toBe(1220)
    expect(stats.sets).toBe(2)
    expect(stats.reps).toBe(13)
    expect(stats.durationSec).toBe(3600)
  })
})

describe('personalBest', () => {
  it('находит лучший вес и 1ПМ', () => {
    const best = personalBest([workout()], 'Barbell_Squat')
    expect(best?.weight).toBe(100)
    expect(best?.reps).toBe(5)
    expect(best?.oneRepMax).toBe(estimatedOneRepMax(100, 5))
  })

  it('возвращает null без данных', () => {
    expect(personalBest([workout()], 'unknown')).toBeNull()
  })
})

describe('lastPerformance', () => {
  it('берёт последнюю тренировку с упражнением', () => {
    const older = workout({
      id: 'w0',
      date: '2026-11-01',
      exercises: [
        { id: 'e0', exerciseId: 'Barbell_Squat', sets: [set({ weight: 80, reps: 5 })] },
      ],
    })
    const last = lastPerformance([workout(), older], 'Barbell_Squat')
    expect(last?.weight).toBe(100)
    expect(last?.date).toBe('2026-11-21')
  })
})

describe('exerciseHistory', () => {
  it('собирает точки по датам', () => {
    const history = exerciseHistory([workout()], 'Barbell_Squat')
    expect(history).toHaveLength(1)
    expect(history[0].weight).toBe(100)
    expect(history[0].volume).toBe(1220)
  })
})
