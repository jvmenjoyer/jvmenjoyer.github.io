import { Copy, Pencil, Play, Trash2 } from 'lucide-react'
import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardTitle } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { useExercises, useProgram, useSettings, useWorkouts } from '@/db/hooks'
import {
  deleteProgram,
  duplicateProgram,
  saveWorkout,
  updateSettings,
} from '@/db/repo'
import type { ProgramDay } from '@/db/types'
import { GOAL_LABELS, levelLabel } from '@/lib/labels'
import { buildSuggestedWorkout } from '@/lib/progression'
import { toast } from '@/store/toast'

export function ProgramDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const program = useProgram(id)
  const exercises = useExercises()
  const workouts = useWorkouts()
  const settings = useSettings()

  const exerciseById = useMemo(
    () => new Map(exercises.map((exercise) => [exercise.id, exercise])),
    [exercises],
  )

  if (!program) {
    return (
      <div>
        <PageHeader title="Программа" back />
        <Card>
          <p className="py-8 text-center text-sm text-muted">Загрузка…</p>
        </Card>
      </div>
    )
  }

  async function startDay(day: ProgramDay) {
    if (!program) return
    const workout = buildSuggestedWorkout(
      program,
      day,
      workouts,
      exerciseById,
      undefined,
      settings?.progressionEnabled !== false,
    )
    await saveWorkout(workout)
    navigate(`/workout/${workout.id}`)
  }

  async function activateProgram() {
    if (!program) return
    await updateSettings({ activeProgramId: program.id })
    toast('Программа выбрана активной', 'success')
  }

  async function handleCopy() {
    if (!program) return
    try {
      const copyId = await duplicateProgram(program)
      toast('Копия программы создана', 'success')
      navigate(`/programs/${copyId}/edit`)
    } catch (error) {
      console.error(error)
      toast('Не удалось скопировать программу', 'error')
    }
  }

  async function handleDelete() {
    if (!program) return
    if (!window.confirm('Удалить программу?')) return
    try {
      await deleteProgram(program.id)
      toast('Программа удалена', 'success')
      navigate('/programs')
    } catch (error) {
      console.error(error)
      toast(error instanceof Error ? error.message : 'Не удалось удалить программу', 'error')
    }
  }

  const isActive = settings?.activeProgramId === program.id

  return (
    <div>
      <PageHeader
        title={program.name}
        subtitle={
          [
            program.goal ? GOAL_LABELS[program.goal] ?? program.goal : null,
            program.level ? levelLabel(program.level) : null,
            `${program.days.length} дн.`,
          ]
            .filter(Boolean)
            .join(' · ')
        }
        back
        actions={
          <>
            {program.isPreset ? (
              <Button variant="secondary" size="icon" onClick={handleCopy} aria-label="Скопировать программу">
                <Copy size={16} />
              </Button>
            ) : (
              <>
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={() => navigate(`/programs/${program.id}/edit`)}
                  aria-label="Изменить программу"
                >
                  <Pencil size={16} />
                </Button>
                <Button variant="danger" size="icon" onClick={handleDelete} aria-label="Удалить программу">
                  <Trash2 size={16} />
                </Button>
              </>
            )}
          </>
        }
      />

      {program.description ? (
        <Card className="mb-4">
          <p className="text-xs leading-relaxed text-muted">{program.description}</p>
          {program.isPreset ? (
            <p className="mt-2 text-[10px] text-faint">
              Это шаблон. Нажмите «Скопировать», чтобы менять упражнения под себя.
            </p>
          ) : null}
        </Card>
      ) : null}

      <Card className="mb-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium">
              {isActive ? 'Активная программа' : 'Следующая тренировка'}
            </p>
            <p className="mt-0.5 text-[10px] leading-relaxed text-muted">
              {isActive
                ? 'На главной веса подставляются по последним результатам'
                : 'Выбери программу, чтобы на главной появилась кнопка «Начать»'}
            </p>
          </div>
          <Button
            variant={isActive ? 'secondary' : 'primary'}
            size="sm"
            onClick={activateProgram}
            disabled={isActive}
          >
            {isActive ? 'Активна' : 'Сделать активной'}
          </Button>
        </div>
      </Card>

      <div className="space-y-3">
        {program.days.map((day) => (
          <Card key={day.id}>
            <CardTitle
              title={
                <span className="flex items-center gap-2">
                  {day.name}
                  <Badge>{day.exercises.length} упр.</Badge>
                </span>
              }
              action={
                <Button
                  variant="primary"
                  size="sm"
                  leading={<Play size={13} />}
                  onClick={() => startDay(day)}
                >
                  Начать
                </Button>
              }
            />

            <div className="space-y-1.5">
              {day.exercises.map((entry, index) => {
                const exercise = exerciseById.get(entry.exerciseId)
                const inSuperset = Boolean(entry.supersetGroup)

                return (
                  <div
                    key={entry.id}
                    className="flex items-center gap-2.5 rounded-xl bg-surface-2/50 px-2.5 py-2"
                  >
                    <span className="w-5 shrink-0 text-center text-[10px] text-faint">
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-xs">
                          {exercise?.nameRu ?? 'Упражнение'}
                        </span>
                        {inSuperset ? <Badge tone="accent">суперсет</Badge> : null}
                      </span>
                      <span className="mt-0.5 block text-[10px] text-muted">
                        {entry.sets} × {entry.reps}
                        {entry.restSec ? ` · отдых ${entry.restSec} с` : ''}
                        {entry.rpe ? ` · RPE ${entry.rpe}` : ''}
                      </span>
                    </span>
                  </div>
                )
              })}
              {day.exercises.length === 0 ? (
                <p className="py-2 text-center text-[11px] text-faint">
                  В этом дне пока нет упражнений
                </p>
              ) : null}
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
