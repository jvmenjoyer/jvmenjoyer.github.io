import { Plus, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ExerciseImage } from '@/components/ExerciseImage'
import { Input, Select } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { useExercises } from '@/db/hooks'
import type { Exercise } from '@/db/types'
import { CreateExerciseModal } from '@/features/exercises/CreateExerciseModal'
import { exerciseGroup, equipmentLabel, GROUP_ORDER, MUSCLE_GROUPS, type MuscleGroup } from '@/lib/labels'
import { cn } from '@/lib/cn'

interface ExercisePickerProps {
  open: boolean
  onClose: () => void
  onSelect: (exercise: Exercise) => void
  title?: string
  description?: string
}

type GroupFilter = 'all' | MuscleGroup

export function ExercisePicker({
  open,
  onClose,
  onSelect,
  title = 'Выбрать упражнение',
  description = 'Поиск по названию, мышцам и инвентарю',
}: ExercisePickerProps) {
  const exercises = useExercises()
  const visibleExercises = useMemo(
    () => exercises.filter((exercise) => !exercise.hidden),
    [exercises],
  )
  const [search, setSearch] = useState('')
  const [group, setGroup] = useState<GroupFilter>('all')
  const [equipment, setEquipment] = useState('all')
  const [visible, setVisible] = useState(40)
  const [creating, setCreating] = useState(false)

  const equipmentOptions = useMemo(() => {
    const set = new Set(visibleExercises.map((exercise) => exercise.equipment))
    return [...set].sort((a, b) => equipmentLabel(a).localeCompare(equipmentLabel(b), 'ru'))
  }, [visibleExercises])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return visibleExercises.filter((exercise) => {
      if (group !== 'all' && exerciseGroup(exercise) !== group) return false
      if (equipment !== 'all' && exercise.equipment !== equipment) return false
      if (!query) return true
      return [
        exercise.nameRu,
        exercise.nameEn,
        equipmentLabel(exercise.equipment),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(query)
    })
  }, [visibleExercises, group, equipment, search])

  const shown = filtered.slice(0, visible)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      className="md:max-w-xl"
    >
      <div className="space-y-2">
        <div className="relative">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint"
          />
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setVisible(40)
            }}
            placeholder="Жим, присед, тяга…"
            className="pl-9"
            autoFocus
          />
        </div>

        <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
          <GroupChip
            active={group === 'all'}
            label="Все"
            onClick={() => {
              setGroup('all')
              setVisible(40)
            }}
          />
          {GROUP_ORDER.map((key) => (
            <GroupChip
              key={key}
              active={group === key}
              label={MUSCLE_GROUPS[key]}
              onClick={() => {
                setGroup(key)
                setVisible(40)
              }}
            />
          ))}
        </div>

        <Select
          value={equipment}
          onChange={(event) => {
            setEquipment(event.target.value)
            setVisible(40)
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

      <div className="mt-3 max-h-[55dvh] space-y-1 overflow-y-auto">
        {shown.map((exercise) => (
          <button
            key={exercise.id}
            type="button"
            onClick={() => onSelect(exercise)}
            className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-surface-2"
          >
            <ExerciseImage
              exercise={exercise}
              className="h-12 w-12 shrink-0 rounded-lg"
            />
              <span className="min-w-0 flex-1">
                <span className="line-clamp-2 block text-sm">{exercise.nameRu}</span>
                <span className="mt-0.5 block truncate text-[10px] text-muted">
                  {MUSCLE_GROUPS[exerciseGroup(exercise)]} · {equipmentLabel(exercise.equipment)}
                </span>
              </span>
          </button>
        ))}

        {filtered.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-xs text-muted">Ничего не найдено</p>
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-accent/50 bg-accent-soft px-3 py-2 text-xs font-medium text-accent transition-colors hover:border-accent"
            >
              <Plus size={14} /> Добавить «{search.trim() || 'своё'}»
            </button>
          </div>
        ) : null}

        {visible < filtered.length ? (
          <button
            type="button"
            onClick={() => setVisible((count) => count + 40)}
            className="w-full rounded-xl border border-border py-2.5 text-xs text-muted transition-colors hover:text-text"
          >
            Показать ещё ({filtered.length - visible})
          </button>
        ) : null}

        <button
          type="button"
          onClick={() => setCreating(true)}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border py-2.5 text-xs text-muted transition-colors hover:border-accent/50 hover:text-accent"
        >
          <Plus size={14} /> Своё упражнение
        </button>
      </div>

      <CreateExerciseModal
        open={creating}
        onClose={() => setCreating(false)}
        initialName={search.trim()}
        onCreated={(exercise) => {
          setCreating(false)
          onSelect(exercise)
        }}
      />
    </Modal>
  )
}

function GroupChip({
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
