import { Plus, Ruler, Trash2 } from 'lucide-react'
import { useState } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Button } from '@/components/ui/Button'
import { Card, CardTitle } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Field, Input, Textarea } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/ui/PageHeader'
import { useMeasurements } from '@/db/hooks'
import { deleteMeasurement, saveMeasurement } from '@/db/repo'
import type { Measurement } from '@/db/types'
import { newId } from '@/lib/id'
import { humanDate, shortDate, todayISO } from '@/lib/date'
import { formatNumber, parseNumber } from '@/lib/format'
import { toast } from '@/store/toast'

interface Draft {
  id?: string
  date: string
  weight: string
  bodyFat: string
  chest: string
  waist: string
  hips: string
  arm: string
  thigh: string
  calf: string
  note: string
}

const EMPTY: Draft = {
  date: todayISO(),
  weight: '',
  bodyFat: '',
  chest: '',
  waist: '',
  hips: '',
  arm: '',
  thigh: '',
  calf: '',
  note: '',
}

function optionalNumber(value: string): number | undefined {
  const parsed = parseNumber(value)
  return parsed > 0 ? parsed : undefined
}

export function MeasurementsPage() {
  const measurements = useMeasurements()
  const [draft, setDraft] = useState<Draft | null>(null)
  const [saving, setSaving] = useState(false)

  const latest = measurements[0]
  const chartData = [...measurements]
    .reverse()
    .map((item) => ({ label: shortDate(item.date), weight: item.weight }))

  function openNew() {
    setDraft({ ...EMPTY, date: todayISO() })
  }

  function openEdit(item: Measurement) {
    setDraft({
      id: item.id,
      date: item.date,
      weight: String(item.weight),
      bodyFat: item.bodyFat ? String(item.bodyFat) : '',
      chest: item.chest ? String(item.chest) : '',
      waist: item.waist ? String(item.waist) : '',
      hips: item.hips ? String(item.hips) : '',
      arm: item.arm ? String(item.arm) : '',
      thigh: item.thigh ? String(item.thigh) : '',
      calf: item.calf ? String(item.calf) : '',
      note: item.note ?? '',
    })
  }

  async function handleSave() {
    if (!draft || saving) return
    const weight = parseNumber(draft.weight)
    if (weight <= 0) {
      toast('Введите вес тела', 'error')
      return
    }

    const existing = draft.id
      ? measurements.find((item) => item.id === draft.id)
      : undefined

    setSaving(true)
    try {
      await saveMeasurement({
        id: draft.id ?? newId(),
        date: draft.date,
        weight,
        bodyFat: optionalNumber(draft.bodyFat),
        chest: optionalNumber(draft.chest),
        waist: optionalNumber(draft.waist),
        hips: optionalNumber(draft.hips),
        arm: optionalNumber(draft.arm),
        thigh: optionalNumber(draft.thigh),
        calf: optionalNumber(draft.calf),
        note: draft.note.trim() || undefined,
        createdAt: existing?.createdAt ?? new Date().toISOString(),
      })
      toast('Замер сохранён', 'success')
      setDraft(null)
    } catch (error) {
      console.error(error)
      toast('Не удалось сохранить замер', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!draft?.id) return
    if (!window.confirm('Удалить этот замер?')) return
    try {
      await deleteMeasurement(draft.id)
      toast('Замер удалён', 'success')
      setDraft(null)
    } catch (error) {
      console.error(error)
      toast('Не удалось удалить замер', 'error')
    }
  }

  return (
    <div>
      <PageHeader
        title="Замеры"
        subtitle="Вес тела и обхваты"
        actions={
          <Button variant="primary" size="sm" leading={<Plus size={14} />} onClick={openNew}>
            Добавить
          </Button>
        }
      />

      {latest ? (
        <Card className="mb-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted">Текущий вес</p>
              <p className="mt-1 text-3xl font-semibold tracking-tight tabular">
                {formatNumber(latest.weight)} кг
              </p>
              <p className="mt-0.5 text-[11px] text-muted">{humanDate(latest.date)}</p>
            </div>
            {latest.bodyFat ? (
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-wide text-muted">Жир</p>
                <p className="mt-1 text-sm font-semibold tabular">{formatNumber(latest.bodyFat)}%</p>
              </div>
            ) : null}
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {latest.chest ? <Metric label="Грудь" value={latest.chest} /> : null}
            {latest.waist ? <Metric label="Талия" value={latest.waist} /> : null}
            {latest.hips ? <Metric label="Бёдра" value={latest.hips} /> : null}
            {latest.arm ? <Metric label="Рука" value={latest.arm} /> : null}
            {latest.thigh ? <Metric label="Нога" value={latest.thigh} /> : null}
            {latest.calf ? <Metric label="Икра" value={latest.calf} /> : null}
          </div>
        </Card>
      ) : null}

      {chartData.length > 1 ? (
        <Card className="mb-4">
          <CardTitle title="Динамика веса" />
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 4, right: 6, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#263026" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: '#8b968a', fontSize: 9 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis hide domain={['dataMin - 2', 'dataMax + 2']} />
                <Tooltip
                  contentStyle={{
                    background: '#171d18',
                    border: '1px solid #263026',
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                  itemStyle={{ color: '#ecf2e9' }}
                  formatter={(value) => `${formatNumber(Number(value))} кг`}
                />
                <Line
                  type="monotone"
                  dataKey="weight"
                  stroke="#c8f169"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      ) : null}

      <Card>
        <CardTitle title="История" />
        {measurements.length === 0 ? (
          <EmptyState
            icon={<Ruler size={20} />}
            title="Пока нет замеров"
            description="Добавьте вес и обхваты, чтобы видеть динамику."
            action={
              <Button variant="secondary" size="sm" leading={<Plus size={14} />} onClick={openNew}>
                Добавить замер
              </Button>
            }
          />
        ) : (
          <div className="divide-y divide-border/60">
            {measurements.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => openEdit(item)}
                className="flex w-full items-center justify-between gap-3 py-2.5 text-left"
              >
                <span className="min-w-0">
                  <span className="block text-xs">{humanDate(item.date)}</span>
                  <span className="mt-0.5 block text-[10px] text-muted">
                    {item.waist ? `талия ${formatNumber(item.waist)} · ` : ''}
                    {item.bodyFat ? `жир ${formatNumber(item.bodyFat)}%` : ''}
                  </span>
                </span>
                <span className="shrink-0 text-sm font-semibold tabular">
                  {formatNumber(item.weight)} кг
                </span>
              </button>
            ))}
          </div>
        )}
      </Card>

      <Modal
        open={draft !== null}
        onClose={() => setDraft(null)}
        title={draft?.id ? 'Изменить замер' : 'Новый замер'}
        description="Вес и обхваты в сантиметрах"
        footer={
          <>
            {draft?.id ? (
              <Button variant="danger" size="md" leading={<Trash2 size={15} />} onClick={handleDelete}>
                Удалить
              </Button>
            ) : null}
            <Button variant="primary" size="md" className="flex-1" onClick={handleSave} disabled={saving}>
              {saving ? 'Сохраняем…' : 'Сохранить'}
            </Button>
          </>
        }
      >
        {draft ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Дата">
                <Input
                  type="date"
                  value={draft.date}
                  onChange={(event) => setDraft({ ...draft, date: event.target.value })}
                />
              </Field>
              <Field label="Вес, кг">
                <Input
                  value={draft.weight}
                  onChange={(event) => setDraft({ ...draft, weight: event.target.value })}
                  inputMode="decimal"
                  placeholder="75,5"
                  autoFocus
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Жир, %" hint="Необязательно">
                <Input
                  value={draft.bodyFat}
                  onChange={(event) => setDraft({ ...draft, bodyFat: event.target.value })}
                  inputMode="decimal"
                  placeholder="18"
                />
              </Field>
              <Field label="Грудь, см">
                <Input
                  value={draft.chest}
                  onChange={(event) => setDraft({ ...draft, chest: event.target.value })}
                  inputMode="decimal"
                  placeholder="100"
                />
              </Field>
              <Field label="Талия, см">
                <Input
                  value={draft.waist}
                  onChange={(event) => setDraft({ ...draft, waist: event.target.value })}
                  inputMode="decimal"
                  placeholder="80"
                />
              </Field>
              <Field label="Бёдра, см">
                <Input
                  value={draft.hips}
                  onChange={(event) => setDraft({ ...draft, hips: event.target.value })}
                  inputMode="decimal"
                  placeholder="95"
                />
              </Field>
              <Field label="Рука, см">
                <Input
                  value={draft.arm}
                  onChange={(event) => setDraft({ ...draft, arm: event.target.value })}
                  inputMode="decimal"
                  placeholder="38"
                />
              </Field>
              <Field label="Нога, см">
                <Input
                  value={draft.thigh}
                  onChange={(event) => setDraft({ ...draft, thigh: event.target.value })}
                  inputMode="decimal"
                  placeholder="58"
                />
              </Field>
              <Field label="Икра, см">
                <Input
                  value={draft.calf}
                  onChange={(event) => setDraft({ ...draft, calf: event.target.value })}
                  inputMode="decimal"
                  placeholder="38"
                />
              </Field>
            </div>

            <Field label="Заметка" hint="Необязательно">
              <Textarea
                value={draft.note}
                onChange={(event) => setDraft({ ...draft, note: event.target.value })}
                rows={2}
                placeholder="Условия, самочувствие"
              />
            </Field>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <span className="rounded-lg bg-surface-2 px-2 py-1 text-[10px] text-muted">
      {label} <span className="text-text tabular">{formatNumber(value)}</span>
    </span>
  )
}
