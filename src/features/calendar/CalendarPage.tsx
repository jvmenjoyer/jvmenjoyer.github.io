import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  getDay,
  isSameMonth,
  isToday,
  startOfMonth,
} from 'date-fns'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Card, CardTitle } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { useMonthWorkouts } from '@/db/hooks'
import { buildEmptyWorkout, saveWorkout } from '@/db/repo'
import {
  humanDate,
  monthLabel,
  shortDate,
  toISODate,
  todayISO,
} from '@/lib/date'
import { formatVolume, pluralRu } from '@/lib/format'
import { totalVolume, workoutStats } from '@/lib/stats'
import { cn } from '@/lib/cn'

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

export function CalendarPage() {
  const navigate = useNavigate()
  const [month, setMonth] = useState(() => new Date())
  const [selected, setSelected] = useState(todayISO())
  const workouts = useMonthWorkouts(month)

  const monthStart = startOfMonth(month)
  const monthEnd = endOfMonth(month)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const leading = (getDay(monthStart) + 6) % 7

  const byDate = useMemo(() => {
    const map = new Map<string, typeof workouts>()
    for (const workout of workouts) {
      const list = map.get(workout.date) ?? []
      list.push(workout)
      map.set(workout.date, list)
    }
    return map
  }, [workouts])

  const selectedWorkouts = byDate.get(selected) ?? []
  const monthVolume = totalVolume(workouts)
  const selectedDate = new Date(`${selected}T12:00:00`)

  async function addWorkout() {
    const workout = buildEmptyWorkout(selected)
    await saveWorkout(workout)
    navigate(`/workout/${workout.id}`)
  }

  return (
    <div>
      <PageHeader title="Календарь" subtitle="История тренировок" />

      <Card className="mb-4">
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setMonth((current) => addMonths(current, -1))}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-text"
            aria-label="Предыдущий месяц"
          >
            <ChevronLeft size={18} />
          </button>
          <p className="text-sm font-semibold">{monthLabel(month)}</p>
          <button
            type="button"
            onClick={() => setMonth((current) => addMonths(current, 1))}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-text"
            aria-label="Следующий месяц"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center">
          {WEEKDAYS.map((day) => (
            <span key={day} className="py-1 text-[9px] uppercase text-faint">
              {day}
            </span>
          ))}

          {Array.from({ length: leading }, (_, index) => (
            <span key={`lead-${index}`} />
          ))}

          {days.map((day) => {
            const iso = toISODate(day)
            const dayWorkouts = byDate.get(iso) ?? []
            const isSelected = iso === selected
            const currentMonth = isSameMonth(day, month)

            return (
              <button
                key={iso}
                type="button"
                onClick={() => setSelected(iso)}
                className={cn(
                  'relative flex h-9 flex-col items-center justify-center rounded-lg text-[11px] transition-colors',
                  isSelected
                    ? 'bg-accent font-semibold text-accent-ink'
                    : 'hover:bg-surface-2',
                  !currentMonth && 'opacity-40',
                  isToday(day) && !isSelected && 'text-accent',
                )}
              >
                {day.getDate()}
                {dayWorkouts.length > 0 ? (
                  <span className="absolute bottom-0.5 flex gap-0.5">
                    {dayWorkouts.slice(0, 3).map((workout) => (
                      <span
                        key={workout.id}
                        className={cn(
                          'h-1 w-1 rounded-full',
                          isSelected ? 'bg-accent-ink' : 'bg-accent',
                        )}
                      />
                    ))}
                  </span>
                ) : null}
              </button>
            )
          })}
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-2.5 text-[11px] text-muted">
          <span>
            {workouts.length}{' '}
            {pluralRu(workouts.length, 'тренировка', 'тренировки', 'тренировок')} за месяц
          </span>
          <span className="tabular">{formatVolume(monthVolume)}</span>
        </div>
      </Card>

      <Card>
        <CardTitle
          title={<span>{humanDate(selected)} · {shortDate(selected)}</span>}
          action={
            <Button variant="primary" size="sm" leading={<Plus size={13} />} onClick={addWorkout}>
              Тренировка
            </Button>
          }
        />

        {selectedWorkouts.length === 0 ? (
          <EmptyState
            title="В этот день тренировок нет"
            description="Можно начать новую — она появится в календаре."
            action={
              <Button variant="secondary" size="sm" leading={<Plus size={14} />} onClick={addWorkout}>
                Добавить
              </Button>
            }
          />
        ) : (
          <div className="space-y-2">
            {selectedWorkouts.map((workout) => {
              const stats = workoutStats(workout)
              return (
                <button
                  key={workout.id}
                  type="button"
                  onClick={() => navigate(`/workouts/${workout.id}`)}
                  className="flex w-full items-center gap-3 rounded-xl border border-border bg-surface-2/40 p-3 text-left transition-colors hover:bg-surface-2"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{workout.name}</span>
                    <span className="mt-0.5 block text-[10px] text-muted">
                      {workout.finishedAt ? 'завершена' : 'не завершена'} ·{' '}
                      {stats.exerciseCount}{' '}
                      {pluralRu(stats.exerciseCount, 'упражнение', 'упражнения', 'упражнений')} ·{' '}
                      {formatVolume(stats.volume)}
                    </span>
                  </span>
                  <ChevronRight size={15} className="shrink-0 text-faint" />
                </button>
              )
            })}
          </div>
        )}
      </Card>

      <p className="mt-3 text-center text-[10px] text-faint">
        Выбранная дата: {selectedDate.toLocaleDateString('ru-RU')}
      </p>
    </div>
  )
}
