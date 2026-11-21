import { Plus, Search, SlidersHorizontal } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ExerciseImage } from '@/components/ExerciseImage'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input, Select } from '@/components/ui/Input'
import { PageHeader } from '@/components/ui/PageHeader'
import { useExercises } from '@/db/hooks'
import { CreateExerciseModal } from '@/features/exercises/CreateExerciseModal'
import {
  exerciseGroup,
  equipmentLabel,
  GROUP_ORDER,
  levelLabel,
  MUSCLE_GROUPS,
  type MuscleGroup,
} from '@/lib/labels'
import { cn } from '@/lib/cn'

type GroupFilter = 'all' | MuscleGroup

export function ExercisesPage() {
  const navigate = useNavigate()
  const allExercises = useExercises()
  const exercises = useMemo(
    () => allExercises.filter((exercise) => !exercise.hidden),
    [allExercises],
  )
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
                <span className="line-clamp-2 block text-sm font-medium">
                  {exercise.nameRu}
                </span>
                <span className="mt-0.5 block truncate text-[11px] text-muted">
                  {MUSCLE_GROUPS[exerciseGroup(exercise)]} ·{' '}
                  {equipmentLabel(exercise.equipment)} · {levelLabel(exercise.level)}
                </span>
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
        onCreated={(exercise) => {
          setCreating(false)
          navigate(`/exercises/${exercise.id}`)
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
