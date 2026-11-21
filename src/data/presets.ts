import type { Program, ProgramDay, ProgramExercise } from '@/db/types'

function exercise(
  id: string,
  exerciseId: string,
  sets: number,
  reps: string,
  restSec = 90,
  supersetGroup?: string,
): ProgramExercise {
  return { id, exerciseId, sets, reps, restSec, supersetGroup }
}

function day(id: string, name: string, exercises: ProgramExercise[]): ProgramDay {
  return { id, name, exercises }
}

const createdAt = '2026-01-01T00:00:00.000Z'

export const PRESET_PROGRAMS: Program[] = [
  {
    id: 'preset-full-body',
    name: 'Full Body 3×',
    description:
      'Три тренировки в неделю на всё тело. Хороший вариант для старта и для тех, у кого мало времени.',
    goal: 'tone',
    level: 'beginner',
    isPreset: true,
    createdAt,
    days: [
      day('fb-a', 'День A', [
        exercise('fb-a-1', 'Barbell_Squat', 3, '5', 120),
        exercise('fb-a-2', 'Barbell_Bench_Press_-_Medium_Grip', 3, '5', 120),
        exercise('fb-a-3', 'Bent_Over_Barbell_Row', 3, '8', 90),
        exercise('fb-a-4', 'Plank', 3, '30-45 сек', 60),
      ]),
      day('fb-b', 'День B', [
        exercise('fb-b-1', 'Barbell_Deadlift', 3, '5', 150),
        exercise('fb-b-2', 'Standing_Military_Press', 3, '5', 100),
        exercise('fb-b-3', 'Wide-Grip_Lat_Pulldown', 3, '8-10', 90),
        exercise('fb-b-4', 'Hanging_Leg_Raise', 3, '10-12', 60),
      ]),
      day('fb-c', 'День C', [
        exercise('fb-c-1', 'Leg_Press', 3, '10-12', 90),
        exercise('fb-c-2', 'Incline_Dumbbell_Press', 3, '8-10', 90),
        exercise('fb-c-3', 'Seated_Cable_Rows', 3, '10-12', 90),
        exercise('fb-c-4', 'Dumbbell_Shoulder_Press', 3, '10-12', 75),
        exercise('fb-c-5', 'Barbell_Curl', 2, '12', 60, 'fb-c-superset'),
        exercise('fb-c-6', 'Triceps_Pushdown', 2, '12', 60, 'fb-c-superset'),
      ]),
    ],
  },
  {
    id: 'preset-upper-lower',
    name: 'Upper / Lower 4×',
    description:
      'Верх и низ тела по два раза в неделю. Баланс объёма и восстановления.',
    goal: 'mass',
    level: 'intermediate',
    isPreset: true,
    createdAt,
    days: [
      day('ul-upper-a', 'Верх A', [
        exercise('ul-upper-a-1', 'Barbell_Bench_Press_-_Medium_Grip', 4, '6-8', 120),
        exercise('ul-upper-a-2', 'Bent_Over_Barbell_Row', 4, '6-8', 120),
        exercise('ul-upper-a-3', 'Dumbbell_Shoulder_Press', 3, '8-10', 90),
        exercise('ul-upper-a-4', 'Wide-Grip_Lat_Pulldown', 3, '8-10', 90),
        exercise('ul-upper-a-5', 'Barbell_Curl', 3, '10-12', 60, 'ul-upper-a-superset'),
        exercise('ul-upper-a-6', 'Triceps_Pushdown', 3, '10-12', 60, 'ul-upper-a-superset'),
      ]),
      day('ul-lower-a', 'Низ A', [
        exercise('ul-lower-a-1', 'Barbell_Squat', 4, '6-8', 150),
        exercise('ul-lower-a-2', 'Romanian_Deadlift', 3, '8-10', 120),
        exercise('ul-lower-a-3', 'Leg_Press', 3, '10-12', 90),
        exercise('ul-lower-a-4', 'Lying_Leg_Curls', 3, '10-12', 75),
        exercise('ul-lower-a-5', 'Standing_Calf_Raises', 4, '12-15', 60),
        exercise('ul-lower-a-6', 'Plank', 3, '45 сек', 60),
      ]),
      day('ul-upper-b', 'Верх B', [
        exercise('ul-upper-b-1', 'Incline_Dumbbell_Press', 4, '8-10', 100),
        exercise('ul-upper-b-2', 'Seated_Cable_Rows', 4, '8-10', 100),
        exercise('ul-upper-b-3', 'Side_Lateral_Raise', 3, '12-15', 60),
        exercise('ul-upper-b-4', 'Face_Pull', 3, '15', 60),
        exercise('ul-upper-b-5', 'Hammer_Curls', 3, '10-12', 60, 'ul-upper-b-superset'),
        exercise('ul-upper-b-6', 'Dips_-_Triceps_Version', 3, '8-12', 75, 'ul-upper-b-superset'),
      ]),
      day('ul-lower-b', 'Низ B', [
        exercise('ul-lower-b-1', 'Barbell_Deadlift', 3, '5', 180),
        exercise('ul-lower-b-2', 'Barbell_Lunge', 3, '10', 90),
        exercise('ul-lower-b-3', 'Leg_Extensions', 3, '12-15', 75),
        exercise('ul-lower-b-4', 'Seated_Leg_Curl', 3, '12-15', 75),
        exercise('ul-lower-b-5', 'Seated_Calf_Raise', 4, '15', 60),
        exercise('ul-lower-b-6', 'Hanging_Leg_Raise', 3, '10-12', 60),
      ]),
    ],
  },
  {
    id: 'preset-ppl',
    name: 'Push / Pull / Legs 6×',
    description:
      'Шесть тренировок в неделю: жим, тяга, ноги. Для опытных и восстановления хватает не всегда — следи за сном и питанием.',
    goal: 'mass',
    level: 'advanced',
    isPreset: true,
    createdAt,
    days: [
      day('ppl-push-a', 'Push A', [
        exercise('ppl-push-a-1', 'Barbell_Bench_Press_-_Medium_Grip', 4, '6-8', 120),
        exercise('ppl-push-a-2', 'Seated_Barbell_Military_Press', 3, '6-8', 110),
        exercise('ppl-push-a-3', 'Incline_Dumbbell_Press', 3, '8-10', 90),
        exercise('ppl-push-a-4', 'Side_Lateral_Raise', 3, '12-15', 60),
        exercise('ppl-push-a-5', 'Triceps_Pushdown', 3, '10-12', 60),
      ]),
      day('ppl-pull-a', 'Pull A', [
        exercise('ppl-pull-a-1', 'Barbell_Deadlift', 3, '5', 180),
        exercise('ppl-pull-a-2', 'Pullups', 3, '6-10', 120),
        exercise('ppl-pull-a-3', 'Seated_Cable_Rows', 3, '8-10', 90),
        exercise('ppl-pull-a-4', 'Face_Pull', 3, '15', 60),
        exercise('ppl-pull-a-5', 'Barbell_Curl', 3, '10-12', 60),
      ]),
      day('ppl-legs-a', 'Legs A', [
        exercise('ppl-legs-a-1', 'Barbell_Squat', 4, '6-8', 150),
        exercise('ppl-legs-a-2', 'Romanian_Deadlift', 3, '8-10', 120),
        exercise('ppl-legs-a-3', 'Leg_Press', 3, '10-12', 90),
        exercise('ppl-legs-a-4', 'Lying_Leg_Curls', 3, '10-12', 75),
        exercise('ppl-legs-a-5', 'Standing_Calf_Raises', 4, '12-15', 60),
      ]),
      day('ppl-push-b', 'Push B', [
        exercise('ppl-push-b-1', 'Incline_Dumbbell_Press', 4, '8-10', 100),
        exercise('ppl-push-b-2', 'Dumbbell_Shoulder_Press', 3, '8-10', 90),
        exercise('ppl-push-b-3', 'Cable_Crossover', 3, '12-15', 60),
        exercise('ppl-push-b-4', 'Side_Lateral_Raise', 4, '12-15', 60),
        exercise('ppl-push-b-5', 'Close-Grip_Barbell_Bench_Press', 3, '8-10', 90),
      ]),
      day('ppl-pull-b', 'Pull B', [
        exercise('ppl-pull-b-1', 'Wide-Grip_Lat_Pulldown', 4, '8-10', 90),
        exercise('ppl-pull-b-2', 'Bent_Over_Barbell_Row', 3, '8-10', 100),
        exercise('ppl-pull-b-3', 'One-Arm_Dumbbell_Row', 3, '10-12', 75),
        exercise('ppl-pull-b-4', 'Reverse_Flyes', 3, '12-15', 60),
        exercise('ppl-pull-b-5', 'Hammer_Curls', 3, '10-12', 60),
      ]),
      day('ppl-legs-b', 'Legs B', [
        exercise('ppl-legs-b-1', 'Front_Squat_Clean_Grip', 4, '6-8', 150),
        exercise('ppl-legs-b-2', 'Barbell_Hip_Thrust', 3, '8-10', 100),
        exercise('ppl-legs-b-3', 'Leg_Extensions', 3, '12-15', 75),
        exercise('ppl-legs-b-4', 'Seated_Leg_Curl', 3, '12-15', 75),
        exercise('ppl-legs-b-5', 'Seated_Calf_Raise', 4, '15', 60),
      ]),
    ],
  },
  {
    id: 'preset-bro-split',
    name: 'Bro Split 5×',
    description:
      'Одна мышечная группа в день: грудь, спина, плечи, руки, ноги. Много объёма на каждую группу раз в неделю.',
    goal: 'mass',
    level: 'intermediate',
    isPreset: true,
    createdAt,
    days: [
      day('bro-chest', 'Грудь', [
        exercise('bro-chest-1', 'Barbell_Bench_Press_-_Medium_Grip', 4, '6-8', 120),
        exercise('bro-chest-2', 'Incline_Dumbbell_Press', 4, '8-10', 100),
        exercise('bro-chest-3', 'Cable_Crossover', 3, '12-15', 60),
        exercise('bro-chest-4', 'Dips_-_Chest_Version', 3, '8-12', 90),
      ]),
      day('bro-back', 'Спина', [
        exercise('bro-back-1', 'Barbell_Deadlift', 3, '5', 180),
        exercise('bro-back-2', 'Pullups', 4, '6-10', 120),
        exercise('bro-back-3', 'T-Bar_Row_with_Handle', 3, '8-10', 100),
        exercise('bro-back-4', 'Seated_Cable_Rows', 3, '10-12', 90),
      ]),
      day('bro-shoulders', 'Плечи', [
        exercise('bro-shoulders-1', 'Standing_Military_Press', 4, '6-8', 120),
        exercise('bro-shoulders-2', 'Dumbbell_Shoulder_Press', 3, '8-10', 90),
        exercise('bro-shoulders-3', 'Side_Lateral_Raise', 4, '12-15', 60),
        exercise('bro-shoulders-4', 'Face_Pull', 3, '15', 60),
        exercise('bro-shoulders-5', 'Reverse_Flyes', 3, '12-15', 60),
      ]),
      day('bro-arms', 'Руки', [
        exercise('bro-arms-1', 'Barbell_Curl', 4, '8-10', 75, 'bro-arms-superset-a'),
        exercise('bro-arms-2', 'Close-Grip_Barbell_Bench_Press', 4, '6-8', 90, 'bro-arms-superset-a'),
        exercise('bro-arms-3', 'Hammer_Curls', 3, '10-12', 60, 'bro-arms-superset-b'),
        exercise('bro-arms-4', 'Triceps_Pushdown', 3, '10-12', 60, 'bro-arms-superset-b'),
        exercise('bro-arms-5', 'EZ-Bar_Curl', 3, '12', 60),
      ]),
      day('bro-legs', 'Ноги', [
        exercise('bro-legs-1', 'Barbell_Squat', 4, '6-8', 150),
        exercise('bro-legs-2', 'Romanian_Deadlift', 3, '8-10', 120),
        exercise('bro-legs-3', 'Leg_Press', 3, '10-12', 90),
        exercise('bro-legs-4', 'Leg_Extensions', 3, '12-15', 75),
        exercise('bro-legs-5', 'Lying_Leg_Curls', 3, '12-15', 75),
        exercise('bro-legs-6', 'Standing_Calf_Raises', 4, '15', 60),
      ]),
    ],
  },
  {
    id: 'preset-stronglifts',
    name: 'StrongLifts 5×5',
    description:
      'Простая силовая программа: три базовых упражнения, 5 подходов по 5 повторений, вес растёт от тренировки к тренировке.',
    goal: 'strength',
    level: 'beginner',
    isPreset: true,
    createdAt,
    days: [
      day('sl-a', 'Тренировка A', [
        exercise('sl-a-1', 'Barbell_Squat', 5, '5', 180),
        exercise('sl-a-2', 'Barbell_Bench_Press_-_Medium_Grip', 5, '5', 180),
        exercise('sl-a-3', 'Bent_Over_Barbell_Row', 5, '5', 180),
      ]),
      day('sl-b', 'Тренировка B', [
        exercise('sl-b-1', 'Barbell_Squat', 5, '5', 180),
        exercise('sl-b-2', 'Standing_Military_Press', 5, '5', 180),
        exercise('sl-b-3', 'Barbell_Deadlift', 1, '5', 180),
      ]),
    ],
  },
]
