import { Check, Plus, RotateCcw, Timer, Trash2, X } from 'lucide-react'
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

  function repeatPrevious(
    item: WorkoutExercise,
    previous: { weight: number; reps: number },
  ) {
    mutate((current) => ({
      ...current,
      exercises: current.exercises.map((exercise) =>
        exercise.id === item.id
          ? {
              ...exercise,
              sets: exercise.sets.map((set) =>
                set.warmup ? set : { ...set, weight: previous.weight, reps: previous.reps },
              ),
            }
          : exercise,
      ),
    }))
    toast(`Подставил ${previous.weight} кг × ${previous.reps}`, 'success')
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
      <header className="safe-top sticky top-0 z-40 border-b border-border bg-bg">
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

          <Button variant="primary" size="md" onClick={handleFinish}>
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
            const isBodyweight = exercise?.equipment === 'body only'

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
                      {target?.targetSets ? `План: ${target.targetSets} × ${target.targetReps ?? '—'}` : 'Без плана'}
                      {target?.restSec ? ` · отдых ${target.restSec} с` : ''}
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
                  <div className="flex items-center justify-between gap-2 px-0.5">
                    <span className="text-[11px] font-medium text-muted">
                      {isBodyweight ? 'Подходы · доп. вес' : 'Подходы'}
                    </span>
                    {previous ? (
                      <button
                        type="button"
                        onClick={() => repeatPrevious(item, previous)}
                        className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-2 px-2 py-1 text-[10px] text-muted transition-colors hover:border-accent/50 hover:text-accent"
                        aria-label={`Подставить прошлый результат: ${previous.weight} килограмм на ${previous.reps} повторений`}
                      >
                        <RotateCcw size={11} />
                        прошлый раз {previous.weight} × {previous.reps}
                      </button>
                    ) : (
                      <span className="text-[10px] text-faint">первый раз</span>
                    )}
                  </div>

                  {item.sets.map((set, setIndex) => (
                    <div
                      key={set.id}
                      className={cn(
                        'rounded-lg border px-1 py-1',
                        set.warmup
                          ? 'border-dashed border-border bg-transparent'
                          : 'border-border/60 bg-surface-2/40',
                      )}
                    >
                      <div className="grid grid-cols-[18px_minmax(0,1fr)_10px_minmax(0,1fr)_44px_22px] items-center gap-1">
                        <span className="text-center text-[11px] font-medium text-faint">
                          {setIndex + 1}
                        </span>

                        <div className="relative">
                          <input
                            value={set.weight ? numberToInput(set.weight) : ''}
                            onChange={(event) =>
                              updateSet(item.id, set.id, {
                                weight: parseNumber(event.target.value),
                              })
                            }
                            inputMode="decimal"
                            placeholder="0"
                            className="h-11 w-full rounded-lg border border-border bg-surface pl-1.5 pr-6 text-center text-base font-semibold tabular outline-none focus:border-accent/60"
                            aria-label={`Вес, подход ${setIndex + 1}, килограммы`}
                          />
                          <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] text-faint">
                            кг
                          </span>
                        </div>

                        <span className="text-center text-[10px] text-faint">×</span>

                        <div className="relative">
                          <input
                            value={set.reps ? String(set.reps) : ''}
                            onChange={(event) =>
                              updateSet(item.id, set.id, {
                                reps: Math.max(0, Math.round(parseNumber(event.target.value))),
                              })
                            }
                            inputMode="numeric"
                            placeholder="0"
                            className="h-11 w-full rounded-lg border border-border bg-surface pl-1.5 pr-7 text-center text-base font-semibold tabular outline-none focus:border-accent/60"
                            aria-label={`Повторы, подход ${setIndex + 1}`}
                          />
                          <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] text-faint">
                            повт
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => toggleSetDone(item, set, exercise)}
                          className={cn(
                            'flex h-11 w-11 items-center justify-center rounded-lg border transition-colors',
                            set.done
                              ? 'border-accent bg-accent text-accent-ink'
                              : 'border-border bg-surface text-faint',
                          )}
                          aria-label={
                            set.done
                              ? `Снять отметку с подхода ${setIndex + 1}`
                              : `Отметить подход ${setIndex + 1} выполненным`
                          }
                        >
                          <Check size={17} />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeSet(item.id, set.id)}
                          className="flex h-11 w-5 items-center justify-center text-faint transition-colors hover:text-danger"
                          aria-label={`Удалить подход ${setIndex + 1}`}
                        >
                          <X size={14} />
                        </button>
                      </div>

                      <div className="mt-1 flex items-center gap-2 pl-[22px] text-[10px]">
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
                        <label className="flex items-center gap-1 text-faint">
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
                            aria-label={`RPE, подход ${setIndex + 1}`}
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
