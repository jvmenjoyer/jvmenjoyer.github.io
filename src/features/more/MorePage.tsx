import {
  BarChart3,
  ChevronRight,
  ClipboardList,
  Dumbbell,
  Ruler,
  Settings,
  Trophy,
} from 'lucide-react'
import type { ComponentType } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { useMeasurements, useWorkouts } from '@/db/hooks'
import { formatVolume } from '@/lib/format'
import { totalVolume } from '@/lib/stats'

interface MoreItem {
  to: string
  title: string
  description: string
  icon: ComponentType<{ size?: number; className?: string }>
}

const ITEMS: MoreItem[] = [
  {
    to: '/measurements',
    title: 'Замеры',
    description: 'Вес тела, жир и обхваты',
    icon: Ruler,
  },
  {
    to: '/progress',
    title: 'Прогресс',
    description: 'Объём, частота и личные рекорды',
    icon: BarChart3,
  },
  {
    to: '/exercises',
    title: 'Упражнения',
    description: 'База с фото и техникой',
    icon: Dumbbell,
  },
  {
    to: '/programs',
    title: 'Программы',
    description: 'Готовые шаблоны и свои',
    icon: ClipboardList,
  },
  {
    to: '/settings',
    title: 'Настройки',
    description: 'Экспорт, импорт и сброс',
    icon: Settings,
  },
]

export function MorePage() {
  const workouts = useWorkouts()
  const measurements = useMeasurements()
  const finished = workouts.filter((workout) => workout.finishedAt)

  return (
    <div>
      <PageHeader title="Ещё" subtitle="Разделы и статистика" />

      <Card className="mb-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
            <Trophy size={18} />
          </span>
          <div className="flex-1">
            <p className="text-[10px] uppercase tracking-wide text-muted">Всего</p>
            <p className="text-lg font-semibold">
              {finished.length} тренировок · {formatVolume(totalVolume(finished))}
            </p>
          </div>
        </div>
        <p className="mt-2 text-[11px] text-muted">
          Замеров: {measurements.length}. Все данные хранятся только на этом устройстве.
        </p>
      </Card>

      <div className="space-y-2.5">
        {ITEMS.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 transition-colors hover:border-border/80 hover:bg-surface-2/40"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-muted">
              <item.icon size={19} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">{item.title}</span>
              <span className="mt-0.5 block truncate text-[11px] text-muted">
                {item.description}
              </span>
            </span>
            <ChevronRight size={16} className="shrink-0 text-faint" />
          </Link>
        ))}
      </div>

      <p className="mt-5 text-center text-[10px] text-faint">
        Athly · дневник тренировок · данные на устройстве
      </p>
    </div>
  )
}
