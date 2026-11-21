import { subDays } from 'date-fns'
import { useMemo } from 'react'
import type { ReactNode } from 'react'
import {
  ArrowRight,
  CalendarDays,
  ClipboardList,
  Dumbbell,
  Play,
  Plus,
  Ruler,
  Timer,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { StatTile } from '@/components/StatTile'
import { Button } from '@/components/ui/Button'
import { Card, CardTitle } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { useExercises, useMeasurements, usePrograms, useSettings, useWorkouts } from '@/db/hooks'
import { buildEmptyWorkout, saveWorkout } from '@/db/repo'
import type { Exercise, Workout } from '@/db/types'
import { activeProgram, buildSuggestedWorkout, nextProgramDay } from '@/lib/progression'
import { fullDate, humanDate, toISODate } from '@/lib/date'
import { formatVolume, formatWeight, pluralRu } from '@/lib/format'
import { totalVolume, workoutStats } from '@/lib/stats'

export function HomePage() {
  const navigate = useNavigate()
  const workouts = useWorkouts()
  const programs = usePrograms()
  const measurements = useMeasurements()
  const settings = useSettings()
  const exercises = useExercises()

  const exerciseMap = useMemo(
    () => new Map(exercises.map((exercise) => [exercise.id, exercise])),
    [exercises],
  )
  const nextProgram = activeProgram(programs, workouts, settings?.activeProgramId)
  const nextDay = nextProgram ? nextProgramDay(nextProgram, workouts) : undefined
  const suggestedWorkout = useMemo(
    () =>
      nextProgram && nextDay && exercises.length > 0
        ? buildSuggestedWorkout(
            nextProgram,
            nextDay,
            workouts,
            exerciseMap,
            undefined,
            settings?.progressionEnabled !== false,
          )
        : null,
    [
      nextProgram,
      nextDay,
      workouts,
      exerciseMap,
      exercises.length,
      settings?.progressionEnabled,
    ],
  )

  const active = workouts.find((workout) => !workout.finishedAt)
  const finished = workouts.filter((workout) => workout.finishedAt)

  const weekStart = toISODate(subDays(new Date(), 6))
  const weekWorkouts = workouts.filter(
    (workout) => workout.date >= weekStart && workout.finishedAt,
  )
  const weekVolume = totalVolume(weekWorkouts)
  const latestWeight = measurements[0]?.weight
  const presets = programs.filter((program) => program.isPreset).slice(0, 3)
  const recent = finished.slice(0, 3)

  async function startEmpty() {
    const workout = buildEmptyWorkout()
    await saveWorkout(workout)
    navigate(`/workout/${workout.id}`)
  }

  async function startSuggested() {
    if (!suggestedWorkout) return
    await saveWorkout(suggestedWorkout)
    navigate(`/workout/${suggestedWorkout.id}`)
  }

  return (
    <div>
      <PageHeader
        title="Сегодня"
        subtitle={fullDate(toISODate(new Date()))}
        actions={
          <Link to="/calendar">
            <Button variant="secondary" size="sm" leading={<CalendarDays size={14} />}>
              Календарь
            </Button>
          </Link>
        }
      />

      {active ? (
        <Card className="relative mb-4 overflow-hidden border-accent/30 bg-gradient-to-br from-accent-soft to-surface">
          <p className="text-[10px] uppercase tracking-wide text-accent">
            Незаконченная тренировка
          </p>
          <p className="mt-1 text-lg font-semibold">{active.name}</p>
          <p className="mt-0.5 text-xs text-muted">
            {humanDate(active.date)} · упражнений: {active.exercises.length}
          </p>
          <Button
            variant="primary"
            size="md"
            className="mt-4 w-full"
            leading={<Play size={16} />}
            onClick={() => navigate(`/workout/${active.id}`)}
          >
            Продолжить
          </Button>
        </Card>
      ) : suggestedWorkout && nextProgram ? (
        <NextWorkoutCard
          programName={nextProgram.name}
          dayName={nextDay?.name ?? 'День 1'}
          workout={suggestedWorkout}
          exerciseMap={exerciseMap}
          progressionEnabled={settings?.progressionEnabled !== false}
          onStart={startSuggested}
          onEmpty={startEmpty}
        />
      ) : (
        <Card className="relative mb-4 overflow-hidden border-accent/25 bg-gradient-to-br from-accent-soft to-surface">
          <div className="pointer-events-none absolute -right-16 -top-20 h-44 w-44 rounded-full bg-accent/10 blur-3xl" />
          <p className="relative text-[10px] uppercase tracking-wide text-accent">
            Тренировка
          </p>
          <p className="relative mt-1 text-xl font-semibold">Готов начать?</p>
          <p className="relative mt-0.5 text-xs text-muted">
            Собери тренировку с нуля или выбери программу.
          </p>
          <div className="relative mt-4 flex gap-2">
            <Button
              variant="primary"
              size="md"
              className="flex-1"
              leading={<Play size={16} />}
              onClick={startEmpty}
            >
              Начать
            </Button>
            <Button variant="secondary" size="md" className="flex-1" onClick={() => navigate('/programs')}>
              Программы
            </Button>
          </div>
        </Card>
      )}

      <div className="mb-4 grid grid-cols-3 gap-2">
        <StatTile
          label="За неделю"
          value={weekWorkouts.length}
          hint={pluralRu(weekWorkouts.length, 'тренировка', 'тренировки', 'тренировок')}
        />
        <StatTile label="Тоннаж" value={formatVolume(weekVolume)} hint="за 7 дней" />
        <StatTile
          label="Вес"
          value={latestWeight ? formatWeight(latestWeight) : '—'}
          hint={measurements[0] ? humanDate(measurements[0].date) : 'нет замеров'}
        />
      </div>

      <Card className="mb-4">
        <CardTitle
          title="Быстрый доступ"
          action={
            <Link to="/more" className="flex items-center gap-1 text-xs text-accent">
              Ещё <ArrowRight size={12} />
            </Link>
          }
        />
        <div className="grid grid-cols-2 gap-2">
          <QuickLink to="/exercises" icon={<Dumbbell size={17} />} title="Упражнения" hint="876 в базе" />
          <QuickLink to="/programs" icon={<ClipboardList size={17} />} title="Программы" hint={`${programs.length} шт.`} />
          <QuickLink to="/calendar" icon={<CalendarDays size={17} />} title="Календарь" hint="История" />
          <QuickLink to="/measurements" icon={<Ruler size={17} />} title="Замеры" hint="Вес тела" />
        </div>
      </Card>

      {presets.length > 0 ? (
        <Card className="mb-4">
          <CardTitle
            title="Готовые программы"
            action={
              <Link to="/programs" className="flex items-center gap-1 text-xs text-accent">
                Все <ArrowRight size={12} />
              </Link>
            }
          />
          <div className="space-y-1">
            {presets.map((program) => (
              <Link
                key={program.id}
                to={`/programs/${program.id}`}
                className="flex items-center gap-3 rounded-xl px-1 py-2 transition-colors hover:bg-surface-2"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-accent">
                  <ClipboardList size={16} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{program.name}</span>
                  <span className="block text-[10px] text-muted">
                    {program.days.length}{' '}
                    {pluralRu(program.days.length, 'день', 'дня', 'дней')}
                  </span>
                </span>
                <ArrowRight size={14} className="text-faint" />
              </Link>
            ))}
          </div>
        </Card>
      ) : null}

      <Card>
        <CardTitle
          title="Последние тренировки"
          action={
            <Link to="/calendar" className="flex items-center gap-1 text-xs text-accent">
              Все <ArrowRight size={12} />
            </Link>
          }
        />
        {recent.length === 0 ? (
          <EmptyState
            icon={<Timer size={20} />}
            title="Пока нет тренировок"
            description="Начни первую — она появится здесь и в календаре."
            action={
              <Button variant="secondary" size="sm" leading={<Plus size={14} />} onClick={startEmpty}>
                Начать тренировку
              </Button>
            }
          />
        ) : (
          <div className="divide-y divide-border/60">
            {recent.map((workout) => {
              const stats = workoutStats(workout)
              return (
                <Link
                  key={workout.id}
                  to={`/workouts/${workout.id}`}
                  className="flex items-center gap-3 py-2.5"
                >
                  <span className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-xl bg-surface-2 text-[10px] text-muted">
                    <span className="text-sm font-semibold leading-none text-text">
                      {workout.date.slice(8, 10)}
                    </span>
                    {humanDate(workout.date)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{workout.name}</span>
                    <span className="mt-0.5 block text-[11px] text-muted">
                      {stats.exerciseCount}{' '}
                      {pluralRu(stats.exerciseCount, 'упражнение', 'упражнения', 'упражнений')} ·{' '}
                      {formatVolume(stats.volume)}
                    </span>
                  </span>
                  <ArrowRight size={14} className="shrink-0 text-faint" />
                </Link>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}

function QuickLink({
  to,
  icon,
  title,
  hint,
}: {
  to: string
  icon: ReactNode
  title: string
  hint: string
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-2.5 rounded-xl border border-border bg-surface-2/40 p-2.5 transition-colors hover:bg-surface-2"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-accent">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-xs font-medium">{title}</span>
        <span className="block truncate text-[10px] text-muted">{hint}</span>
      </span>
    </Link>
  )
}

function NextWorkoutCard({
  programName,
  dayName,
  workout,
  exerciseMap,
  progressionEnabled,
  onStart,
  onEmpty,
}: {
  programName: string
  dayName: string
  workout: Workout
  exerciseMap: Map<string, Exercise>
  progressionEnabled: boolean
  onStart: () => void
  onEmpty: () => void
}) {
  return (
    <Card className="relative mb-4 overflow-hidden border-accent/25 bg-gradient-to-br from-accent-soft to-surface">
      <div className="pointer-events-none absolute -right-16 -top-20 h-44 w-44 rounded-full bg-accent/10 blur-3xl" />
      <div className="relative flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-accent">
            Следующая тренировка
          </p>
          <p className="mt-1 text-lg font-semibold">
            {programName} — {dayName}
          </p>
          <p className="mt-0.5 text-[11px] text-muted">
            {progressionEnabled
              ? 'Веса подобраны по последним результатам'
              : 'Автопрогрессия выключена в настройках'}
          </p>
        </div>
        <Link to="/programs" className="shrink-0 text-xs text-accent">
          Сменить
        </Link>
      </div>

      <div className="relative mt-3 space-y-1.5">
        {workout.exercises.slice(0, 4).map((item) => {
          const exercise = exerciseMap.get(item.exerciseId)
          const weight = item.sets[0]?.weight ?? 0
          return (
            <div key={item.id} className="flex items-center gap-2 text-xs">
              <span className="min-w-0 flex-1 truncate text-muted">
                {exercise?.nameRu ?? 'Упражнение'}
              </span>
              <span className="shrink-0 tabular">
                {!progressionEnabled
                  ? '—'
                  : weight > 0
                    ? formatWeight(weight)
                    : 'свой вес'}
              </span>
              <span className="w-14 shrink-0 text-right text-[10px] text-faint">
                {item.targetSets ?? item.sets.length}×{item.targetReps ?? '—'}
              </span>
            </div>
          )
        })}
        {workout.exercises.length === 0 ? (
          <p className="text-[11px] text-muted">В этом дне пока нет упражнений.</p>
        ) : null}
        {workout.exercises.length > 4 ? (
          <p className="text-[10px] text-faint">+ ещё {workout.exercises.length - 4}</p>
        ) : null}
      </div>

      <div className="relative mt-4 flex gap-2">
        <Button
          variant="primary"
          size="md"
          className="flex-1"
          leading={<Play size={16} />}
          onClick={onStart}
          disabled={workout.exercises.length === 0}
        >
          Начать
        </Button>
        <Button variant="secondary" size="md" onClick={onEmpty}>
          С нуля
        </Button>
      </div>
    </Card>
  )
}
