import { Dumbbell, Play, Trash2, Trophy } from 'lucide-react'
import { useMemo } from 'react'
import type { ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ExerciseImage } from '@/components/ExerciseImage'
import { Button } from '@/components/ui/Button'
import { Card, CardTitle } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { useExercise, useWorkouts } from '@/db/hooks'
import { buildEmptyWorkout, deleteExercise, saveWorkout } from '@/db/repo'
import { newId } from '@/lib/id'
import { humanDate, shortDate } from '@/lib/date'
import { formatVolume, formatWeight } from '@/lib/format'
import {
  categoryLabel,
  equipmentLabel,
  exerciseGroup,
  levelLabel,
  muscleLabel,
  MUSCLE_GROUPS,
} from '@/lib/labels'
import { exerciseHistory, lastPerformance, personalBest } from '@/lib/stats'
import { toast } from '@/store/toast'

export function ExerciseDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const exercise = useExercise(id)
  const workouts = useWorkouts()

  const history = useMemo(
    () => (exercise ? exerciseHistory(workouts, exercise.id) : []),
    [workouts, exercise],
  )
  const best = useMemo(
    () => (exercise ? personalBest(workouts, exercise.id) : null),
    [workouts, exercise],
  )
  const last = useMemo(
    () => (exercise ? lastPerformance(workouts, exercise.id) : null),
    [workouts, exercise],
  )

  if (!exercise) {
    return (
      <div>
        <PageHeader title="Упражнение" back />
        <Card>
          <p className="py-8 text-center text-sm text-muted">Загрузка…</p>
        </Card>
      </div>
    )
  }

  async function startWithExercise() {
    if (!exercise) return
    const workout = buildEmptyWorkout()
    workout.name = exercise.nameRu
    workout.exercises = [
      {
        id: newId(),
        exerciseId: exercise.id,
        targetSets: 3,
        targetReps: '8-12',
        sets: Array.from({ length: 3 }, () => ({
          id: newId(),
          weight: 0,
          reps: 0,
          done: false,
        })),
      },
    ]
    await saveWorkout(workout)
    navigate(`/workout/${workout.id}`)
  }

  async function handleDelete() {
    if (!exercise?.isCustom) return
    if (!window.confirm('Удалить это упражнение из своей базы?')) return
    try {
      await deleteExercise(exercise.id)
      toast('Упражнение удалено', 'success')
      navigate('/exercises')
    } catch (error) {
      console.error(error)
      toast(error instanceof Error ? error.message : 'Не удалось удалить', 'error')
    }
  }

  const chartData = history.map((point) => ({
    label: shortDate(point.date),
    weight: point.weight,
  }))

  return (
    <div>
      <PageHeader
        title={exercise.nameRu}
        subtitle={`${MUSCLE_GROUPS[exerciseGroup(exercise)]} · ${equipmentLabel(exercise.equipment)}`}
        back
        actions={
          exercise.isCustom ? (
            <Button variant="danger" size="icon" onClick={handleDelete} aria-label="Удалить упражнение">
              <Trash2 size={16} />
            </Button>
          ) : null
        }
      />

      <div className="relative mb-4 overflow-hidden rounded-2xl border border-border bg-surface-2">
        <ExerciseImage
          exercise={exercise}
          autoPlay
          className="h-56 w-full"
          alt={exercise.nameRu}
        />
        <span className="pointer-events-none absolute bottom-2 right-2 rounded-md bg-black/60 px-1.5 py-0.5 text-[9px] text-white/70">
          2 кадра · движение
        </span>
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        <Badge>{MUSCLE_GROUPS[exerciseGroup(exercise)]}</Badge>
        <Badge>{equipmentLabel(exercise.equipment)}</Badge>
        <Badge>{levelLabel(exercise.level)}</Badge>
        <Badge>{categoryLabel(exercise.category)}</Badge>
        {exercise.isCustom ? <Badge>своё</Badge> : null}
      </div>

      <Button
        variant="primary"
        size="lg"
        className="mb-4 w-full"
        leading={<Play size={17} />}
        onClick={startWithExercise}
      >
        Начать с этим упражнением
      </Button>

      <div className="mb-4 grid grid-cols-2 gap-2">
        <Card className="p-3.5">
          <p className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted">
            <Trophy size={11} /> Личный рекорд
          </p>
          <p className="mt-1 text-lg font-semibold tabular">
            {best ? formatWeight(best.weight) : '—'}
          </p>
          <p className="text-[10px] text-faint">
            {best ? `${best.reps} повт. · ${humanDate(best.date)}` : 'ещё нет данных'}
          </p>
        </Card>
        <Card className="p-3.5">
          <p className="text-[10px] uppercase tracking-wide text-muted">В прошлый раз</p>
          <p className="mt-1 text-lg font-semibold tabular">
            {last ? formatWeight(last.weight) : '—'}
          </p>
          <p className="text-[10px] text-faint">
            {last ? `${last.reps} повт. · ${humanDate(last.date)}` : 'ещё нет данных'}
          </p>
        </Card>
      </div>

      {exercise.primaryMuscles.length > 0 ? (
        <Card className="mb-4">
          <CardTitle title="Мышцы" />
          <div className="flex flex-wrap gap-1.5">
            {exercise.primaryMuscles.map((muscle) => (
              <span
                key={muscle}
                className="rounded-lg bg-accent-soft px-2 py-1 text-[11px] text-accent"
              >
                {muscleLabel(muscle)}
              </span>
            ))}
            {exercise.secondaryMuscles.map((muscle) => (
              <span
                key={`secondary-${muscle}`}
                className="rounded-lg bg-surface-2 px-2 py-1 text-[11px] text-muted"
              >
                {muscleLabel(muscle)}
              </span>
            ))}
          </div>
        </Card>
      ) : null}

      <Card className="mb-4">
        <CardTitle title="Техника" />
        {exercise.instructionsRu.length > 0 ? (
          <ol className="space-y-2">
            {exercise.instructionsRu.map((step, index) => (
              <li key={index} className="flex gap-2.5 text-xs leading-relaxed text-muted">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-2 text-[10px] text-text">
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-xs text-muted">Описание пока не добавлено.</p>
        )}
      </Card>

      <Card>
        <CardTitle title="История" />
        {history.length === 0 ? (
          <EmptyState
            icon={<Dumbbell size={18} />}
            title="Пока нет истории"
            description="Выполни упражнение в тренировке — здесь появятся результаты."
          />
        ) : (
          <>
            {chartData.length > 1 ? (
              <div className="mb-3 h-40 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#263026" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: '#8b968a', fontSize: 9 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis hide />
                    <Tooltip
                      contentStyle={{
                        background: '#171d18',
                        border: '1px solid #263026',
                        borderRadius: 12,
                        fontSize: 12,
                      }}
                      itemStyle={{ color: '#ecf2e9' }}
                      formatter={(value) => formatWeight(Number(value))}
                    />
                    <Line
                      type="monotone"
                      dataKey="weight"
                      stroke="#c8f169"
                      strokeWidth={2}
                      dot={{ r: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : null}

            <div className="divide-y divide-border/60">
              {[...history].reverse().map((point) => (
                <div key={point.date} className="flex items-center justify-between py-2 text-xs">
                  <span className="text-muted">{humanDate(point.date)}</span>
                  <span className="tabular">
                    {formatWeight(point.weight)} × {point.reps}
                    <span className="ml-2 text-[10px] text-faint">
                      {formatVolume(point.volume)}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>

      {exercise.instructionsEn && exercise.instructionsEn.length > 0 ? (
        <details className="mt-4 rounded-2xl border border-border bg-surface p-4">
          <summary className="cursor-pointer text-xs text-muted">Оригинальное описание (EN)</summary>
          <ol className="mt-2 list-decimal space-y-1 pl-4 text-[11px] leading-relaxed text-faint">
            {exercise.instructionsEn.map((step, index) => (
              <li key={index}>{step}</li>
            ))}
          </ol>
        </details>
      ) : null}

      <p className="mt-4 text-center text-[10px] text-faint">
        База: free-exercise-db (public domain) · названия на английском, техника переведена
      </p>
    </div>
  )
}

function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-lg border border-border bg-surface px-2 py-1 text-[10px] text-muted">
      {children}
    </span>
  )
}
