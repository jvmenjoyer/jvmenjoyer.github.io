import { ArrowDown, ArrowUp, Plus, Trash2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ExercisePicker } from '@/components/ExercisePicker'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardTitle } from '@/components/ui/Card'
import { Field, Input, Select, Textarea } from '@/components/ui/Input'
import { PageHeader } from '@/components/ui/PageHeader'
import { useExercises, useProgram } from '@/db/hooks'
import { newId, nowISO } from '@/lib/id'
import { saveProgram } from '@/db/repo'
import type { Exercise, Program, ProgramDay, ProgramExercise } from '@/db/types'
import { GOAL_LABELS, LEVEL_LABELS } from '@/lib/labels'
import { toast } from '@/store/toast'

function createDay(name = 'День 1'): ProgramDay {
  return { id: newId(), name, exercises: [] }
}

function createEntry(exerciseId: string): ProgramExercise {
  return {
    id: newId(),
    exerciseId,
    sets: 3,
    reps: '8-12',
    restSec: 90,
  }
}

export function ProgramEditorPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const program = useProgram(id)
  const exercises = useExercises()
  const isEdit = Boolean(id)

  const [initialized, setInitialized] = useState(!isEdit)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [goal, setGoal] = useState('mass')
  const [level, setLevel] = useState('beginner')
  const [days, setDays] = useState<ProgramDay[]>([createDay()])
  const [pickerDay, setPickerDay] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!program || initialized) return
    setName(program.name)
    setDescription(program.description ?? '')
    setGoal(program.goal ?? 'mass')
    setLevel(program.level ?? 'beginner')
    setDays(program.days.length > 0 ? program.days : [createDay()])
    setInitialized(true)
  }, [program, initialized])

  const exerciseById = new Map(exercises.map((exercise) => [exercise.id, exercise]))

  if (isEdit && !initialized) {
    return (
      <div>
        <PageHeader title="Программа" back />
        <Card>
          <p className="py-8 text-center text-sm text-muted">Загрузка…</p>
        </Card>
      </div>
    )
  }

  function updateDay(dayId: string, patch: Partial<ProgramDay>) {
    setDays((list) =>
      list.map((day) => (day.id === dayId ? { ...day, ...patch } : day)),
    )
  }

  function updateEntry(dayId: string, entryId: string, patch: Partial<ProgramExercise>) {
    setDays((list) =>
      list.map((day) =>
        day.id === dayId
          ? {
              ...day,
              exercises: day.exercises.map((entry) =>
                entry.id === entryId ? { ...entry, ...patch } : entry,
              ),
            }
          : day,
      ),
    )
  }

  function addExerciseToDay(dayId: string, exercise: Exercise) {
    setDays((list) =>
      list.map((day) =>
        day.id === dayId
          ? { ...day, exercises: [...day.exercises, createEntry(exercise.id)] }
          : day,
      ),
    )
    setPickerDay(null)
  }

  function removeEntry(dayId: string, entryId: string) {
    setDays((list) =>
      list.map((day) =>
        day.id === dayId
          ? { ...day, exercises: day.exercises.filter((entry) => entry.id !== entryId) }
          : day,
      ),
    )
  }

  function moveEntry(dayId: string, index: number, delta: number) {
    setDays((list) =>
      list.map((day) => {
        if (day.id !== dayId) return day
        const target = index + delta
        if (target < 0 || target >= day.exercises.length) return day
        const next = [...day.exercises]
        const [item] = next.splice(index, 1)
        next.splice(target, 0, item)
        return { ...day, exercises: next }
      }),
    )
  }

  async function handleSave() {
    const trimmed = name.trim()
    if (!trimmed) {
      toast('Введите название программы', 'error')
      return
    }
    if (days.length === 0) {
      toast('Добавьте хотя бы один день', 'error')
      return
    }

    const stamp = nowISO()
    const payload: Program = {
      id: program?.id ?? newId(),
      name: trimmed,
      description: description.trim() || undefined,
      goal,
      level,
      isPreset: false,
      days: days.map((day) => ({
        ...day,
        exercises: day.exercises.map((entry) => ({
          ...entry,
          sets: Math.max(1, Math.round(entry.sets || 1)),
          reps: entry.reps.trim() || '8-12',
          restSec: entry.restSec ? Math.max(0, Math.round(entry.restSec)) : undefined,
        })),
      })),
      createdAt: program?.createdAt ?? stamp,
      updatedAt: stamp,
    }

    setSaving(true)
    try {
      await saveProgram(payload)
      toast('Программа сохранена', 'success')
      navigate(`/programs/${payload.id}`)
    } catch (error) {
      console.error(error)
      toast('Не удалось сохранить программу', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeader
        title={isEdit ? 'Изменить программу' : 'Новая программа'}
        subtitle="Дни, упражнения, подходы и повторения"
        back
        actions={
          <Button variant="primary" size="sm" onClick={handleSave} disabled={saving}>
            {saving ? 'Сохраняем…' : 'Сохранить'}
          </Button>
        }
      />

      <Card className="mb-4 space-y-3">
        <Field label="Название">
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Например, Мой сплит"
            autoFocus
          />
        </Field>
        <Field label="Описание" hint="Необязательно">
          <Textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={2}
            placeholder="Цель, частота, особенности"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Цель">
            <Select value={goal} onChange={(event) => setGoal(event.target.value)}>
              {Object.entries(GOAL_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Уровень">
            <Select value={level} onChange={(event) => setLevel(event.target.value)}>
              {Object.entries(LEVEL_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Card>

      <div className="space-y-3">
        {days.map((day) => (
          <Card key={day.id}>
            <CardTitle
              title={
                <input
                  value={day.name}
                  onChange={(event) => updateDay(day.id, { name: event.target.value })}
                  className="w-full rounded-lg border border-transparent bg-transparent px-1 py-0.5 text-sm font-semibold outline-none transition-colors focus:border-border focus:bg-surface-2"
                  aria-label="Название дня"
                />
              }
              action={
                days.length > 1 ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setDays((list) => list.filter((item) => item.id !== day.id))}
                    aria-label="Удалить день"
                  >
                    <X size={15} />
                  </Button>
                ) : null
              }
            />

            <div className="space-y-2">
              {day.exercises.map((entry, index) => {
                const exercise = exerciseById.get(entry.exerciseId)
                const previous = day.exercises[index - 1]
                const inSuperset = Boolean(entry.supersetGroup)

                return (
                  <div
                    key={entry.id}
                    className="rounded-xl border border-border bg-surface-2/40 p-2.5"
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-2 text-[10px] text-muted">
                        {index + 1}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-xs font-medium">
                        {exercise?.nameRu ?? 'Упражнение'}
                      </span>
                      {inSuperset ? <Badge tone="accent">суперсет</Badge> : null}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => moveEntry(day.id, index, -1)}
                        disabled={index === 0}
                        aria-label="Выше"
                      >
                        <ArrowUp size={13} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => moveEntry(day.id, index, 1)}
                        disabled={index === day.exercises.length - 1}
                        aria-label="Ниже"
                      >
                        <ArrowDown size={13} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-danger"
                        onClick={() => removeEntry(day.id, entry.id)}
                        aria-label="Удалить упражнение"
                      >
                        <Trash2 size={13} />
                      </Button>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <Field label="Подходы">
                        <Input
                          type="number"
                          min={1}
                          value={String(entry.sets)}
                          onChange={(event) =>
                            updateEntry(day.id, entry.id, {
                              sets: Number.parseInt(event.target.value, 10) || 1,
                            })
                          }
                          className="h-9 text-center"
                        />
                      </Field>
                      <Field label="Повторы">
                        <Input
                          value={entry.reps}
                          onChange={(event) =>
                            updateEntry(day.id, entry.id, { reps: event.target.value })
                          }
                          placeholder="8-12"
                          className="h-9 text-center"
                        />
                      </Field>
                      <Field label="Отдых, с">
                        <Input
                          type="number"
                          min={0}
                          value={entry.restSec ? String(entry.restSec) : ''}
                          onChange={(event) =>
                            updateEntry(day.id, entry.id, {
                              restSec: Number.parseInt(event.target.value, 10) || undefined,
                            })
                          }
                          placeholder="90"
                          className="h-9 text-center"
                        />
                      </Field>
                    </div>

                    <Field
                      label="Метка суперсета"
                      hint={
                        previous?.supersetGroup === entry.supersetGroup && inSuperset
                          ? 'Объединено с предыдущим'
                          : 'Одинаковая метка объединяет упражнения'
                      }
                      className="mt-2"
                    >
                      <Input
                        value={entry.supersetGroup ?? ''}
                        onChange={(event) =>
                          updateEntry(day.id, entry.id, {
                            supersetGroup: event.target.value.trim() || undefined,
                          })
                        }
                        placeholder="A"
                        className="h-9"
                      />
                    </Field>
                  </div>
                )
              })}

              <Button
                variant="secondary"
                size="sm"
                className="w-full"
                leading={<Plus size={14} />}
                onClick={() => setPickerDay(day.id)}
              >
                Добавить упражнение
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-3 flex gap-2">
        <Button
          variant="secondary"
          size="md"
          className="flex-1"
          leading={<Plus size={15} />}
          onClick={() => setDays((list) => [...list, createDay(`День ${list.length + 1}`)])}
        >
          Добавить день
        </Button>
        <Button variant="primary" size="md" className="flex-1" onClick={handleSave} disabled={saving}>
          {saving ? 'Сохраняем…' : 'Сохранить'}
        </Button>
      </div>

      <p className="mt-3 text-center text-[10px] text-faint">
        Дней: {days.length} · упражнений: {days.reduce((sum, day) => sum + day.exercises.length, 0)}
      </p>

      <ExercisePicker
        open={pickerDay !== null}
        onClose={() => setPickerDay(null)}
        onSelect={(exercise) => {
          if (pickerDay) addExerciseToDay(pickerDay, exercise)
        }}
      />
    </div>
  )
}
