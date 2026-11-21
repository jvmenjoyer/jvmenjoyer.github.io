import type { Exercise } from '@/db/types'

export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'legs'
  | 'glutes'
  | 'abs'
  | 'other'

export const MUSCLE_LABELS: Record<string, string> = {
  abdominals: 'Пресс',
  hamstrings: 'Бицепс бедра',
  quadriceps: 'Квадрицепс',
  glutes: 'Ягодицы',
  calves: 'Икры',
  chest: 'Грудь',
  lats: 'Широчайшие',
  'lower back': 'Поясница',
  'middle back': 'Середина спины',
  traps: 'Трапеции',
  shoulders: 'Плечи',
  biceps: 'Бицепс',
  triceps: 'Трицепс',
  forearms: 'Предплечья',
  neck: 'Шея',
  abductors: 'Отводящие',
  adductors: 'Приводящие',
}

export const MUSCLE_GROUPS: Record<MuscleGroup, string> = {
  chest: 'Грудь',
  back: 'Спина',
  shoulders: 'Плечи',
  biceps: 'Бицепс',
  triceps: 'Трицепс',
  forearms: 'Предплечья',
  legs: 'Ноги',
  glutes: 'Ягодицы',
  abs: 'Пресс',
  other: 'Другое',
}

export const GROUP_ORDER: MuscleGroup[] = [
  'chest',
  'back',
  'legs',
  'glutes',
  'shoulders',
  'biceps',
  'triceps',
  'forearms',
  'abs',
  'other',
]

const GROUP_BY_MUSCLE: Record<string, MuscleGroup> = {
  chest: 'chest',
  lats: 'back',
  'middle back': 'back',
  'lower back': 'back',
  traps: 'back',
  shoulders: 'shoulders',
  biceps: 'biceps',
  triceps: 'triceps',
  forearms: 'forearms',
  abdominals: 'abs',
  quadriceps: 'legs',
  hamstrings: 'legs',
  calves: 'legs',
  adductors: 'legs',
  abductors: 'legs',
  glutes: 'glutes',
  neck: 'other',
}

export function exerciseGroup(exercise: Exercise | undefined): MuscleGroup {
  if (!exercise) return 'other'
  if (exercise.group) return exercise.group as MuscleGroup
  for (const muscle of exercise.primaryMuscles) {
    const group = GROUP_BY_MUSCLE[muscle]
    if (group) return group
  }
  for (const muscle of exercise.secondaryMuscles) {
    const group = GROUP_BY_MUSCLE[muscle]
    if (group) return group
  }
  return 'other'
}

export function muscleLabel(muscle: string): string {
  return MUSCLE_LABELS[muscle] ?? muscle
}

export const EQUIPMENT_LABELS: Record<string, string> = {
  'body only': 'Своё тело',
  barbell: 'Штанга',
  dumbbell: 'Гантели',
  cable: 'Блок',
  machine: 'Тренажёр',
  kettlebells: 'Гиря',
  bands: 'Резинки',
  'medicine ball': 'Медбол',
  'exercise ball': 'Фитбол',
  'e-z curl bar': 'EZ-гриф',
  'foam roll': 'Массажный ролл',
  other: 'Другое',
}

export function equipmentLabel(equipment: string | null | undefined): string {
  if (!equipment) return 'Без инвентаря'
  return EQUIPMENT_LABELS[equipment] ?? equipment
}

export const LEVEL_LABELS: Record<string, string> = {
  beginner: 'Новичок',
  intermediate: 'Средний',
  expert: 'Продвинутый',
}

export function levelLabel(level: string | null | undefined): string {
  if (!level) return ''
  return LEVEL_LABELS[level] ?? level
}

export const CATEGORY_LABELS: Record<string, string> = {
  strength: 'Сила',
  stretching: 'Растяжка',
  cardio: 'Кардио',
  plyometrics: 'Плиометрика',
  powerlifting: 'Пауэрлифтинг',
  'olympic weightlifting': 'Тяжёлая атлетика',
  strongman: 'Стронгмен',
}

export function categoryLabel(category: string | null | undefined): string {
  if (!category) return ''
  return CATEGORY_LABELS[category] ?? category
}

export const GOAL_LABELS: Record<string, string> = {
  mass: 'Масса',
  strength: 'Сила',
  fatloss: 'Похудение',
  tone: 'Тонус',
  endurance: 'Выносливость',
}
