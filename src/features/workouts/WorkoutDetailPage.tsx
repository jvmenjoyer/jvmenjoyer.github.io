import { Copy, Pencil, Play, Trash2, Trophy } from 'lucide-react'
import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ExerciseImage } from '@/components/ExerciseImage'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardTitle } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { useExercises, useWorkout, useWorkouts } from '@/db/hooks'
import { deleteWorkout, saveWorkout } from '@/db/repo'
import { newId } from '@/lib/id'
import { fullDate, todayISO } from '@/lib/date'
import { formatDuration, formatVolume, numberToInput } from '@/lib/format'
import { personalBest, workoutStats } from '@/lib/stats'
import type { Workout } from '@/db/types'
import { toast } from '@/store/toast'

export function WorkoutDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const workout = useWorkout(id)
  const allWorkouts = useWorkouts()
  const exercises = useExercises()

  const exerciseById = useMemo(
    () => new Map(exercises.map((exercise) => [exercise.id, exercise])),
    [exercises],
  )

  if (!workout) {
    return (
      <div>
        <PageHeader title="Тренировка" back />
        <Card>
          <p className="py-8 text-center text-sm text-muted">Загрузка…</p>
        </Card>
      </div>
    )
  }

  const stats = workoutStats(workout)

  async function handleRepeat() {
    if (!workout) return
    const stamp = new Date().toISOString()
    const copy: Workout = {
      ...workout,
      id: newId(),
      date: todayISO(),
      startedAt: stamp,
      finishedAt: undefined,
      createdAt: stamp,
      updatedAt: stamp,
      exercises: workout.exercises.map((exercise) => ({
        ...exercise,
        id: newId(),
        sets: exercise.sets.map((set) => ({ ...set, id: newId(), done: false })),
      })),
    }
    await saveWorkout(copy)
    navigate(`/workout/${copy.id}`)
  }

  async function handleDelete() {
    if (!workout) return
    if (!window.confirm('Удалить тренировку?')) return
    try {
      await deleteWorkout(workout.id)
      toast('Тренировка удалена', 'success')
      navigate('/calendar')
    } catch (error) {
      console.error(error)
      toast('Не удалось удалить тренировку', 'error')
    }
  }

  return (
    <div>
      <PageHeader
        title={workout.name}
        subtitle={fullDate(workout.date)}
        back
        actions={
          <>
            <Button variant="secondary" size="icon" onClick={handleRepeat} aria-label="Повторить тренировку">
              <Copy size={16} />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              onClick={() => navigate(`/workout/${workout.id}`)}
              aria-label="Редактировать тренировку"
            >
              <Pencil size={16} />
            </Button>
            <Button variant="danger" size="icon" onClick={handleDelete} aria-label="Удалить тренировку">
              <Trash2 size={16} />
            </Button>
          </>
        }
      />

      {!workout.finishedAt ? (
        <Card className="mb-4 border-accent/30 bg-accent-soft/40">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-accent">Тренировка ещё не завершена</p>
            <Button variant="primary" size="sm" leading={<Play size={13} />} onClick={() => navigate(`/workout/${workout.id}`)}>
              Продолжить
            </Button>
          </div>
        </Card>
      ) : null}

      <div className="mb-4 grid grid-cols-2 gap-2">
        <Card className="p-3.5">
          <p className="text-[10px] uppercase tracking-wide text-muted">Время</p>
          <p className="mt-1 text-lg font-semibold tabular">{formatDuration(stats.durationSec)}</p>
        </Card>
        <Card className="p-3.5">
          <p className="text-[10px] uppercase tracking-wide text-muted">Тоннаж</p>
          <p className="mt-1 text-lg font-semibold tabular">{formatVolume(stats.volume)}</p>
        </Card>
        <Card className="p-3.5">
          <p className="text-[10px] uppercase tracking-wide text-muted">Подходы</p>
          <p className="mt-1 text-lg font-semibold tabular">{stats.sets}</p>
        </Card>
        <Card className="p-3.5">
          <p className="text-[10px] uppercase tracking-wide text-muted">Упражнения</p>
          <p className="mt-1 text-lg font-semibold tabular">{stats.exerciseCount}</p>
        </Card>
      </div>

      <div className="space-y-3">
        {workout.exercises.map((item) => {
          const exercise = exerciseById.get(item.exerciseId)
          const best = personalBest(allWorkouts, item.exerciseId)
          const isRecord = best?.workoutId === workout.id

          return (
            <Card key={item.id}>
              <div className="mb-2 flex items-start gap-2.5">
                <ExerciseImage exercise={exercise} className="h-10 w-10 shrink-0 rounded-lg" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => navigate(`/exercises/${item.exerciseId}`)}
                      className="min-w-0 truncate text-left text-sm font-medium"
                    >
                      {exercise?.nameRu ?? 'Упражнение'}
                    </button>
                    {isRecord ? <Badge tone="accent">рекорд</Badge> : null}
                    {item.supersetGroup ? <Badge>суперсет {item.supersetGroup}</Badge> : null}
                  </div>
                  <p className="mt-0.5 text-[10px] text-muted">
                    {item.sets.length} подходов
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                {item.sets.map((set, index) => (
                  <div
                    key={set.id}
                    className="grid grid-cols-[24px_1fr_auto_auto] items-center gap-2 rounded-lg bg-surface-2/40 px-2 py-1.5 text-xs"
                  >
                    <span className="text-center text-[10px] text-faint">{index + 1}</span>
                    <span className="tabular">
                      {numberToInput(set.weight) || 0} кг × {set.reps}
                      {set.warmup ? (
                        <span className="ml-2 text-[9px] uppercase text-warn">разминка</span>
                      ) : null}
                    </span>
                    {set.rpe ? (
                      <span className="text-[10px] text-faint">RPE {set.rpe}</span>
                    ) : (
                      <span />
                    )}
                    {isRecord && !set.warmup && best && set.weight === best.weight ? (
                      <Trophy size={12} className="text-accent" />
                    ) : (
                      <span />
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )
        })}
      </div>

      {workout.notes ? (
        <Card className="mt-3">
          <CardTitle title="Заметка" />
          <p className="whitespace-pre-wrap text-xs leading-relaxed text-muted">{workout.notes}</p>
        </Card>
      ) : null}

      <p className="mt-4 text-center text-[10px] text-faint">
        Начать такую же можно кнопкой «Копировать» сверху
      </p>
    </div>
  )
}
