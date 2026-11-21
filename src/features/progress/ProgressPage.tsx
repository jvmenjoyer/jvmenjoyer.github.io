import { addDays, format, startOfWeek, subWeeks } from 'date-fns'
import { ru } from 'date-fns/locale'
import { Trophy } from 'lucide-react'
import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card, CardTitle } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { Progress } from '@/components/ui/Progress'
import { StatTile } from '@/components/StatTile'
import { useExercises, useMeasurements, useWorkouts } from '@/db/hooks'
import { toISODate } from '@/lib/date'
import { formatVolume, formatWeight } from '@/lib/format'
import {
  exerciseGroup,
  GROUP_ORDER,
  MUSCLE_GROUPS,
  type MuscleGroup,
} from '@/lib/labels'
import {
  personalBest,
  totalVolume,
  volumeByGroup,
} from '@/lib/stats'

export function ProgressPage() {
  const workouts = useWorkouts()
  const exercises = useExercises()
  const measurements = useMeasurements()

  const finished = workouts.filter((workout) => workout.finishedAt)
  const exerciseById = useMemo(
    () => new Map(exercises.map((exercise) => [exercise.id, exercise])),
    [exercises],
  )

  const weekly = useMemo(() => {
    const today = new Date()
    return Array.from({ length: 8 }, (_, index) => {
      const start = startOfWeek(subWeeks(today, 7 - index), { weekStartsOn: 1 })
      const end = addDays(start, 6)
      const startIso = toISODate(start)
      const endIso = toISODate(end)
      const list = finished.filter(
        (workout) => workout.date >= startIso && workout.date <= endIso,
      )
      return {
        label: format(start, 'd MMM', { locale: ru }).replace('.', ''),
        volume: Math.round(totalVolume(list)),
        count: list.length,
      }
    })
  }, [finished])

  const monthStart = toISODate(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const monthWorkouts = finished.filter((workout) => workout.date >= monthStart)

  const pbs = useMemo(() => {
    const ids = new Set<string>()
    for (const workout of finished) {
      for (const item of workout.exercises) ids.add(item.exerciseId)
    }

    return [...ids]
      .map((id) => ({ id, best: personalBest(finished, id) }))
      .filter((item) => item.best)
      .sort((a, b) => (b.best?.date ?? '').localeCompare(a.best?.date ?? ''))
      .slice(0, 8)
  }, [finished])

  const groupStart = toISODate(addDays(new Date(), -30))
  const recent = finished.filter((workout) => workout.date >= groupStart)
  const groups = volumeByGroup(recent, exercises)
  const maxGroup = Math.max(1, ...GROUP_ORDER.map((key) => groups[key]))
  const groupEntries = GROUP_ORDER.filter((key) => groups[key] > 0)

  const latestWeight = measurements[0]

  return (
    <div>
      <PageHeader title="Прогресс" subtitle="Объём, частота и рекорды" />

      <div className="mb-4 grid grid-cols-3 gap-2">
        <StatTile label="Всего" value={finished.length} hint="тренировок" />
        <StatTile label="За месяц" value={monthWorkouts.length} hint="тренировок" />
        <StatTile label="Тоннаж" value={formatVolume(totalVolume(finished))} hint="всего" />
      </div>

      <Card className="mb-4">
        <CardTitle title="Тоннаж по неделям" />
        {finished.length === 0 ? (
          <EmptyState title="Нет данных" description="Завершите тренировку, чтобы увидеть график." />
        ) : (
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekly} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#263026" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: '#8b968a', fontSize: 9 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis hide />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                  contentStyle={{
                    background: '#171d18',
                    border: '1px solid #263026',
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                  itemStyle={{ color: '#ecf2e9' }}
                  formatter={(value) => formatVolume(Number(value))}
                />
                <Bar dataKey="volume" fill="#c8f169" radius={[4, 4, 0, 0]} maxBarSize={26} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <Card className="mb-4">
        <CardTitle title="Объём по группам · 30 дней" />
        {groupEntries.length === 0 ? (
          <EmptyState title="Нет данных" description="Нужны завершённые тренировки за последний месяц." />
        ) : (
          <div className="space-y-2.5">
            {groupEntries.map((key) => (
              <div key={key}>
                <div className="mb-1 flex items-center justify-between text-[11px]">
                  <span className="text-muted">{MUSCLE_GROUPS[key as MuscleGroup]}</span>
                  <span className="tabular">{formatVolume(groups[key])}</span>
                </div>
                <Progress value={(groups[key] / maxGroup) * 100} />
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="mb-4">
        <CardTitle title="Рекорды" />
        {pbs.length === 0 ? (
          <EmptyState
            icon={<Trophy size={18} />}
            title="Рекордов пока нет"
            description="Как только запишете подходы с весом, здесь появятся лучшие результаты."
          />
        ) : (
          <div className="divide-y divide-border/60">
            {pbs.map(({ id, best }) => {
              const exercise = exerciseById.get(id)
              if (!best || !exercise) return null
              return (
                <div key={id} className="flex items-center gap-2.5 py-2">
                  <Trophy size={13} className="shrink-0 text-accent" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs">{exercise.nameRu}</span>
                    <span className="block text-[10px] text-faint">
                      {MUSCLE_GROUPS[exerciseGroup(exercise)]} · {best.date}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs font-semibold tabular">
                    {formatWeight(best.weight)} × {best.reps}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      <Card>
        <CardTitle title="Вес тела" />
        {latestWeight ? (
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted">
              Последний замер: {latestWeight.date}
            </span>
            <span className="font-semibold tabular">{formatWeight(latestWeight.weight)}</span>
          </div>
        ) : (
          <p className="text-xs text-muted">
            Замеров пока нет — добавьте на экране «Замеры».
          </p>
        )}
      </Card>
    </div>
  )
}
