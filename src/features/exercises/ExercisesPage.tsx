import { Plus, Search, SlidersHorizontal } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ExerciseImage } from '@/components/ExerciseImage'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Field, Input, Select, Textarea } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/ui/PageHeader'
import { useExercises } from '@/db/hooks'
import { addCustomExercise } from '@/db/repo'
import {
  EQUIPMENT_LABELS,
  exerciseGroup,
  equipmentLabel,
  GROUP_ORDER,
  levelLabel,
  LEVEL_LABELS,
  MUSCLE_GROUPS,
  type MuscleGroup,
} from '@/lib/labels'
import { cn } from '@/lib/cn'
import { toast } from '@/store/toast'

type GroupFilter = 'all' | MuscleGroup

export function ExercisesPage() {
  const navigate = useNavigate()
  const exercises = useExercises()
  const [search, setSearch] = useState('')
  const [group, setGroup] = useState<GroupFilter>('all')
  const [equipment, setEquipment] = useState('all')
  const [visible, setVisible] = useState(50)
  const [creating, setCreating] = useState(false)

  const equipmentOptions = useMemo(() => {
    const set = new Set(exercises.map((exercise) => exercise.equipment))
    return [...set].sort((a, b) => equipmentLabel(a).localeCompare(equipmentLabel(b), 'ru'))
  }, [exercises])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return exercises.filter((exercise) => {
      if (group !== 'all' && exerciseGroup(exercise) !== group) return false
      if (equipment !== 'all' && exercise.equipment !== equipment) return false
      if (!query) return true
      return [exercise.nameRu, exercise.nameEn, equipmentLabel(exercise.equipment)]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(query)
    })
  }, [exercises, group, equipment, search])

  const shown = filtered.slice(0, visible)

  return (
    <div>
      <PageHeader
        title="Упражнения"
        subtitle={`${exercises.length} в базе`}
        actions={
          <Button
            variant="secondary"
            size="sm"
            leading={<Plus size={14} />}
            onClick={() => setCreating(true)}
          >
            Своё
          </Button>
        }
      />

      <div className="mb-3 space-y-2">
        <div className="relative">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint"
          />
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setVisible(50)
            }}
            placeholder="Поиск упражнения"
            className="pl-9"
          />
        </div>

        <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
          <FilterChip
            active={group === 'all'}
            label="Все"
            onClick={() => {
              setGroup('all')
              setVisible(50)
            }}
          />
          {GROUP_ORDER.map((key) => (
            <FilterChip
              key={key}
              active={group === key}
              label={MUSCLE_GROUPS[key]}
              onClick={() => {
                setGroup(key)
                setVisible(50)
              }}
            />
          ))}
        </div>

        <div className="flex items-center gap-2">
          <SlidersHorizontal size={14} className="shrink-0 text-faint" />
          <Select
            value={equipment}
            onChange={(event) => {
              setEquipment(event.target.value)
              setVisible(50)
            }}
            aria-label="Инвентарь"
          >
            <option value="all">Любой инвентарь</option>
            {equipmentOptions.map((value) => (
              <option key={value} value={value}>
                {equipmentLabel(value)}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            title="Ничего не найдено"
            description="Попробуйте изменить фильтры или добавьте своё упражнение."
          />
        </Card>
      ) : (
        <div className="space-y-1.5">
          {shown.map((exercise) => (
            <button
              key={exercise.id}
              type="button"
              onClick={() => navigate(`/exercises/${exercise.id}`)}
              className="flex w-full items-center gap-3 rounded-2xl border border-border bg-surface p-2.5 text-left transition-colors hover:bg-surface-2/50"
            >
              <ExerciseImage exercise={exercise} className="h-14 w-14 shrink-0 rounded-xl" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{exercise.nameRu}</span>
                <span className="mt-0.5 block truncate text-[11px] text-muted">
                  {MUSCLE_GROUPS[exerciseGroup(exercise)]} ·{' '}
                  {equipmentLabel(exercise.equipment)}
                </span>
              </span>
              <span className="shrink-0 rounded-md bg-surface-2 px-1.5 py-0.5 text-[9px] uppercase text-faint">
                {levelLabel(exercise.level)}
              </span>
            </button>
          ))}

          {visible < filtered.length ? (
            <button
              type="button"
              onClick={() => setVisible((count) => count + 50)}
              className="w-full rounded-xl border border-border py-3 text-xs text-muted transition-colors hover:text-text"
            >
              Показать ещё ({filtered.length - visible})
            </button>
          ) : null}
        </div>
      )}

      <CreateExerciseModal
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(id) => {
          setCreating(false)
          navigate(`/exercises/${id}`)
        }}
      />
    </div>
  )
}

function FilterChip({
  active,
  label,
  onClick,
}: {
  active: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'shrink-0 rounded-lg border px-2.5 py-1 text-[11px] transition-colors',
        active
          ? 'border-accent/60 bg-accent-soft text-accent'
          : 'border-border text-muted hover:text-text',
      )}
    >
      {label}
    </button>
  )
}

function CreateExerciseModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: (id: string) => void
}) {
  const [name, setName] = useState('')
  const [group, setGroup] = useState<MuscleGroup>('chest')
  const [equipment, setEquipment] = useState('body only')
  const [level, setLevel] = useState('beginner')
  const [instructions, setInstructions] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    const trimmed = name.trim()
    if (!trimmed) {
      toast('Введите название упражнения', 'error')
      return
    }

    setSaving(true)
    try {
      const id = await addCustomExercise({
        nameRu: trimmed,
        group,
        equipment,
        level,
        category: 'strength',
        instructionsRu: instructions
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean),
      })
      toast('Упражнение добавлено', 'success')
      setName('')
      setInstructions('')
      onCreated(id)
    } catch (error) {
      console.error(error)
      toast('Не удалось добавить упражнение', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Своё упражнение"
      description="Появится в базе с пометкой «своё»"
      footer={
        <Button variant="primary" size="md" className="flex-1" onClick={handleSave} disabled={saving}>
          {saving ? 'Сохраняем…' : 'Добавить'}
        </Button>
      }
    >
      <div className="space-y-3">
        <Field label="Название">
          <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Например, Тяга к поясу" autoFocus />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Группа мышц">
            <Select value={group} onChange={(event) => setGroup(event.target.value as MuscleGroup)}>
              {GROUP_ORDER.map((key) => (
                <option key={key} value={key}>
                  {MUSCLE_GROUPS[key]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Инвентарь">
            <Select value={equipment} onChange={(event) => setEquipment(event.target.value)}>
              {Object.entries(EQUIPMENT_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Уровень">
          <Select value={level} onChange={(event) => setLevel(event.target.value)}>
            {Object.entries(LEVEL_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Техника" hint="Каждый шаг с новой строки, необязательно">
          <Textarea
            value={instructions}
            onChange={(event) => setInstructions(event.target.value)}
            placeholder="Исходное положение…\nВыполните…"
            rows={4}
          />
        </Field>
      </div>
    </Modal>
  )
}
