import { ClipboardList, Copy, Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { usePrograms } from '@/db/hooks'
import { GOAL_LABELS, levelLabel } from '@/lib/labels'
import { pluralRu } from '@/lib/format'

export function ProgramsPage() {
  const navigate = useNavigate()
  const programs = usePrograms()
  const presets = programs.filter((program) => program.isPreset)
  const custom = programs.filter((program) => !program.isPreset)

  return (
    <div>
      <PageHeader
        title="Программы"
        subtitle="Готовые шаблоны и свои"
        actions={
          <Button
            variant="primary"
            size="sm"
            leading={<Plus size={14} />}
            onClick={() => navigate('/programs/new')}
          >
            Создать
          </Button>
        }
      />

      <section className="mb-5">
        <h2 className="mb-2 px-1 text-xs font-medium uppercase tracking-wide text-muted">
          Готовые
        </h2>
        {presets.length === 0 ? (
          <Card>
            <EmptyState title="Нет готовых программ" description="Сбросьте данные в настройках, чтобы вернуть шаблоны." />
          </Card>
        ) : (
          <div className="space-y-2">
            {presets.map((program) => (
              <ProgramCard key={program.id} program={program} onClick={() => navigate(`/programs/${program.id}`)} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-2 px-1 text-xs font-medium uppercase tracking-wide text-muted">
          Мои программы
        </h2>
        {custom.length === 0 ? (
          <Card>
            <EmptyState
              icon={<ClipboardList size={20} />}
              title="Пока нет своих программ"
              description="Создайте программу с днями и упражнениями или скопируйте готовую."
              action={
                <Button variant="secondary" size="sm" leading={<Plus size={14} />} onClick={() => navigate('/programs/new')}>
                  Создать программу
                </Button>
              }
            />
          </Card>
        ) : (
          <div className="space-y-2">
            {custom.map((program) => (
              <ProgramCard key={program.id} program={program} onClick={() => navigate(`/programs/${program.id}`)} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function ProgramCard({
  program,
  onClick,
}: {
  program: ReturnType<typeof usePrograms>[number]
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-2xl border border-border bg-surface p-4 text-left transition-colors hover:bg-surface-2/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold">{program.name}</p>
            {program.isPreset ? (
              <Badge tone="accent">шаблон</Badge>
            ) : (
              <Badge>своя</Badge>
            )}
          </div>
          {program.description ? (
            <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-muted">
              {program.description}
            </p>
          ) : null}
          <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] text-faint">
            <span>
              {program.days.length} {pluralRu(program.days.length, 'день', 'дня', 'дней')}
            </span>
            {program.goal ? <span>· {GOAL_LABELS[program.goal] ?? program.goal}</span> : null}
            {program.level ? <span>· {levelLabel(program.level)}</span> : null}
          </div>
        </div>
        {program.isPreset ? (
          <Copy size={15} className="mt-0.5 shrink-0 text-faint" />
        ) : null}
      </div>
    </button>
  )
}
