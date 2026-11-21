import { Check, Plus, Timer, Trash2, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ExerciseImage } from '@/components/ExerciseImage'
import { ExercisePicker } from '@/components/ExercisePicker'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Textarea } from '@/components/ui/Input'
import { useExercises, useSettings, useWorkout, useWorkouts } from '@/db/hooks'
import { finishWorkout, saveWorkout } from '@/db/repo'
import type { Exercise, Workout, WorkoutExercise, WorkoutSet } from '@/db/types'
import { fullDate, humanDate } from '@/lib/date'
import { formatDuration, numberToInput, parseNumber } from '@/lib/format'
import { lastPerformance } from '@/lib/stats'
import { newId } from '@/lib/id'
import { unlockAudio } from '@/lib/beep'
import { useRestTimer } from '@/store/restTimer'
import { cn } from '@/lib/cn'
import { toast } from '@/store/toast'

function emptySet(): WorkoutSet {
  return { id: newId(), weight: 0, reps: 0, done: false }
}

export function WorkoutPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const workout = useWorkout(id)
  const exercises = useExercises()
  const allWorkouts = useWorkouts()
  const settings = useSettings()
  const startRest = useRestTimer((state) => state.start)
  const stopRest = useRestTimer((state) => state.stop)

  const [draft, setDraft] = useState<Workout | null>(null)
  const draftRef = useRef<Workout | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (workout && !draftRef.current) {
      draftRef.current = workout
      setDraft(workout)
    }
  }, [workout])

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const exerciseById = useMemo(
    () => new Map(exercises.map((exercise) => [exercise.id, exercise])),
    [exercises],
  )

  if (!draft) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg">
        <p className="text-sm text-muted">Загрузка тренировки…</p>
      </div>
    )
  }

  const started = new Date(draft.startedAt).getTime()
  const finished = draft.finishedAt ? new Date(draft.finishedAt).getTime() : now
  const elapsed = Math.max(0, Math.floor((finished - started) / 1000))
  const targetById = new Map(
    draft.exercises.map((exercise) => [exercise.id, exercise]),
  )

  function mutate(updater: (current: Workout) => Workout) {
    const current = draftRef.current
    if (!current) return
    const next = updater(current)
    draftRef.current = next
    setDraft(next)
    void saveWorkout(next).catch((error) => {
      console.error(error)
      toast('Не удалось сохранить тренировку', 'error')
    })
  }

  function updateSet(exerciseId: string, setId: string, patch: Partial<WorkoutSet>) {
    mutate((current) => ({
      ...current,
      exercises: current.exercises.map((exercise) =>
        exercise.id === exerciseId
          ? {
              ...exercise,
              sets: exercise.sets.map((set) =>
                set.id === setId ? { ...set, ...patch } : set,
              ),
            }
          : exercise,
      ),
    }))
  }

  function addSet(exerciseId: string) {
    mutate((current) => ({
      ...current,
      exercises: current.exercises.map((exercise) => {
        if (exercise.id !== exerciseId) return exercise
        const last = exercise.sets[exercise.sets.length - 1]
        return {
          ...exercise,
          sets: [
            ...exercise.sets,
            {
              ...emptySet(),
              weight: last?.weight ?? 0,
              reps: last?.reps ?? 0,
            },
          ],
        }
      }),
    }))
  }

  function removeSet(exerciseId: string, setId: string) {
    mutate((current) => ({
      ...current,
      exercises: current.exercises.map((exercise) =>
        exercise.id === exerciseId
          ? { ...exercise, sets: exercise.sets.filter((set) => set.id !== setId) }
          : exercise,
      ),
    }))
  }

  function removeExercise(exerciseId: string) {
    mutate((current) => ({
      ...current,
      exercises: current.exercises.filter((exercise) => exercise.id !== exerciseId),
    }))
  }

  function restSeconds(item: WorkoutExercise): number {
    return item.restSec ?? settings?.defaultRestSec ?? 90
  }

  function startRestFor(item: WorkoutExercise, exercise?: Exercise) {
    unlockAudio()
    startRest(
      restSeconds(item),
      exercise?.nameRu ? `Отдых · ${exercise.nameRu}` : 'Отдых',
    )
  }

  function toggleSetDone(item: WorkoutExercise, set: WorkoutSet, exercise?: Exercise) {
    const next = !set.done
    updateSet(item.id, set.id, { done: next })
    if (next && !set.warmup && settings?.autoRestTimer !== false) {
      startRestFor(item, exercise)
    }
  }

  function addExercise(exercise: Exercise) {
    mutate((current) => ({
      ...current,
      exercises: [
        ...current.exercises,
        {
          id: newId(),
          exerciseId: exercise.id,
          targetSets: 3,
          targetReps: '8-12',
          sets: [emptySet(), emptySet(), emptySet()],
        },
      ],
    }))
    setPickerOpen(false)
  }

  async function handleFinish() {
    const current = draftRef.current
    if (!current) return
    if (!window.confirm('Завершить тренировку?')) return

    const cleaned: Workout = {
      ...current,
      finishedAt: new Date().toISOString(),
      exercises: current.exercises
        .map((exercise) => ({
          ...exercise,
          sets: exercise.sets.filter((set) => set.reps > 0 || set.weight > 0),
        }))
        .filter((exercise) => exercise.sets.length > 0),
    }

    if (cleaned.exercises.length === 0) {
      toast('Добавьте хотя бы одно упражнение с подходами', 'error')
      return
    }

    try {
      await finishWorkout(cleaned)
      stopRest()
      navigate(`/workouts/${cleaned.id}`, { replace: true })
    } catch (error) {
      console.error(error)
      toast('Не удалось завершить тренировку', 'error')
    }
  }

  return (
    <div className="min-h-dvh bg-bg pb-28 text-text">
      <header className="sticky top-0 z-30 border-b border-border bg-bg/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-muted transition-colors hover:bg-surface-2 hover:text-text"
            aria-label="Закрыть тренировку"
          >
            <X size={20} />
          </button>

          <div className="min-w-0 flex-1">
            <input
              value={draft.name}
              onChange={(event) =>
                mutate((current) => ({ ...current, name: event.target.value }))
              }
              className="w-full truncate rounded-lg border border-transparent bg-transparent px-1 py-0.5 text-sm font-semibold outline-none focus:border-border focus:bg-surface-2"
              aria-label="Название тренировки"
            />
            <p className="mt-0.5 flex items-center gap-1 px-1 text-[10px] text-muted">
              <Timer size={10} /> {formatDuration(elapsed)}
              {draft.finishedAt ? ' · завершена' : ' · идёт'}
            </p>
          </div>

          <Button variant="primary" size="sm" onClick={handleFinish}>
            {draft.finishedAt ? 'Сохранить' : 'Завершить'}
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 py-4">
        <div className="mb-3 flex items-center justify-between px-1 text-[11px] text-muted">
          <span>{fullDate(draft.date)}</span>
          <span>
            {draft.exercises.length} упр. ·{' '}
            {draft.exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0)} подходов
          </span>
        </div>

        <div className="space-y-3">
          {draft.exercises.map((item, exerciseIndex) => {
            const exercise = exerciseById.get(item.exerciseId)
            const previous = lastPerformance(allWorkouts, item.exerciseId, draft.id)
            const target = targetById.get(item.id)
            const groupLabel = item.supersetGroup

            return (
              <Card key={item.id} className="p-3.5">
                <div className="flex items-start gap-2.5">
                  <button
                    type="button"
                    onClick={() => navigate(`/exercises/${item.exerciseId}`)}
                    className="shrink-0"
                  >
                    <ExerciseImage exercise={exercise} className="h-11 w-11 rounded-xl" />
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-faint">{exerciseIndex + 1}</span>
                      <button
                        type="button"
                        onClick={() => navigate(`/exercises/${item.exerciseId}`)}
                        className="min-w-0 truncate text-left text-sm font-medium"
                      >
                        {exercise?.nameRu ?? 'Упражнение'}
                      </button>
                      {groupLabel ? <Badge tone="accent">суперсет {groupLabel}</Badge> : null}
                    </div>
                    <p className="mt-0.5 text-[10px] text-muted">
                      {target?.targetSets ? `${target.targetSets}×${target.targetReps ?? ''}` : ''}
                      {target?.restSec ? ` · отдых ${target.restSec} с` : ''}
                      {previous ? ` · прошлый раз ${previous.weight} кг × ${previous.reps}` : ''}
                    </p>
                    {item.autoNote ? (
                      <p className="mt-0.5 text-[10px] text-accent">Авто: {item.autoNote}</p>
                    ) : null}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-faint hover:text-danger"
                    onClick={() => removeExercise(item.id)}
                    aria-label="Удалить упражнение"
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>

                <div className="mt-3 space-y-2">
                  <div className="grid grid-cols-[24px_1fr_1fr_38px_24px] items-center gap-1.5 px-0.5 text-[9px] uppercase tracking-wide text-faint">
                    <span>#</span>
                    <span>Вес, кг</span>
                    <span>Повторы</span>
                    <span />
                    <span />
                  </div>

                  {item.sets.map((set, setIndex) => (
                    <div
                      key={set.id}
                      className={cn(
                        'rounded-lg border px-1.5 py-1.5',
                        set.warmup
                          ? 'border-dashed border-border bg-transparent'
                          : 'border-border/60 bg-surface-2/40',
                      )}
                    >
                      <div className="grid grid-cols-[24px_1fr_1fr_38px_24px] items-center gap-1.5">
                        <span className="text-center text-[11px] text-faint">
                          {setIndex + 1}
                        </span>
                        <input
                          value={set.weight ? numberToInput(set.weight) : ''}
                          onChange={(event) =>
                            updateSet(item.id, set.id, {
                              weight: parseNumber(event.target.value),
                            })
                          }
                          inputMode="decimal"
                          placeholder="0"
                          className="h-9 w-full rounded-lg border border-border bg-surface px-2 text-center text-sm tabular outline-none focus:border-accent/60"
                          aria-label="Вес"
                        />
                        <input
                          value={set.reps ? String(set.reps) : ''}
                          onChange={(event) =>
                            updateSet(item.id, set.id, {
                              reps: Math.max(0, Math.round(parseNumber(event.target.value))),
                            })
                          }
                          inputMode="numeric"
                          placeholder="0"
                          className="h-9 w-full rounded-lg border border-border bg-surface px-2 text-center text-sm tabular outline-none focus:border-accent/60"
                          aria-label="Повторы"
                        />
                        <button
                          type="button"
                          onClick={() => toggleSetDone(item, set, exercise)}
                          className={cn(
                            'flex h-9 w-9 items-center justify-center rounded-lg border transition-colors',
                            set.done
                              ? 'border-accent bg-accent text-accent-ink'
                              : 'border-border bg-surface text-faint',
                          )}
                          aria-label="Подход выполнен"
                        >
                          <Check size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeSet(item.id, set.id)}
                          className="flex h-9 w-6 items-center justify-center text-faint transition-colors hover:text-danger"
                          aria-label="Удалить подход"
                        >
                          <X size={14} />
                        </button>
                      </div>

                      <div className="ml-7 mt-1 flex items-center gap-3 text-[10px] text-faint">
                        <button
                          type="button"
                          onClick={() =>
                            updateSet(item.id, set.id, { warmup: !set.warmup })
                          }
                          className={cn(
                            'rounded px-1.5 py-0.5 transition-colors',
                            set.warmup
                              ? 'bg-warn/10 text-warn'
                              : 'text-faint hover:text-text',
                          )}
                        >
                          разминка
                        </button>
                        <label className="flex items-center gap-1">
                          RPE
                          <input
                            value={set.rpe ? String(set.rpe) : ''}
                            onChange={(event) => {
                              const value = Math.round(parseNumber(event.target.value))
                              updateSet(item.id, set.id, {
                                rpe: value >= 1 && value <= 10 ? value : undefined,
                              })
                            }}
                            inputMode="numeric"
                            placeholder="—"
                            className="h-6 w-8 rounded border border-border bg-surface text-center text-[10px] outline-none focus:border-accent/60"
                          />
                        </label>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => addSet(item.id)}
                    className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-border py-2 text-[11px] text-muted transition-colors hover:border-accent/50 hover:text-accent"
                  >
                    <Plus size={13} /> Добавить подход
                  </button>
                  <button
                    type="button"
                    onClick={() => startRestFor(item, exercise)}
                    className="flex w-full items-center justify-center gap-1 rounded-lg border border-border/60 py-1.5 text-[10px] text-faint transition-colors hover:border-accent/40 hover:text-accent"
                  >
                    <Timer size={12} /> Отдых {restSeconds(item)} с
                  </button>
                </div>
              </Card>
            )
          })}
        </div>

        <Button
          variant="secondary"
          size="md"
          className="mt-3 w-full"
          leading={<Plus size={15} />}
          onClick={() => setPickerOpen(true)}
        >
          Добавить упражнение
        </Button>

        <Card className="mt-3">
          <p className="mb-1.5 text-xs font-medium text-muted">Заметка о тренировке</p>
          <Textarea
            value={draft.notes ?? ''}
            onChange={(event) =>
              mutate((current) => ({ ...current, notes: event.target.value }))
            }
            rows={2}
            placeholder="Самочувствие, техника, что улучшить"
          />
        </Card>

        <Button
          variant="primary"
          size="lg"
          className="mt-3 w-full"
          onClick={handleFinish}
        >
          {draft.finishedAt ? 'Сохранить изменения' : 'Завершить тренировку'}
        </Button>

        <p className="mt-2 text-center text-[10px] text-faint">
          {humanDate(draft.date)} · сохраняется автоматически
        </p>
      </main>

      <ExercisePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={addExercise}
      />
    </div>
  )
}
