import { Calculator, Dumbbell, Flame, TrendingUp } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Card, CardTitle } from '@/components/ui/Card'
import { Input, Field, Select } from '@/components/ui/Input'
import { PageHeader } from '@/components/ui/PageHeader'
import { numberToInput, parseNumber, round1 } from '@/lib/format'

const PLATES = [25, 20, 15, 10, 5, 2.5, 1.25]
const BAR_OPTIONS = [
  { value: 20, label: '20 кг — олимпийский' },
  { value: 15, label: '15 кг — женский' },
  { value: 10, label: '10 кг — тренировочный' },
  { value: 0, label: '0 кг — без грифа' },
]

export function CalculatorsPage() {
  return (
    <div>
      <PageHeader title="Калькуляторы" subtitle="1ПМ, блины и разминка" />

      <div className="space-y-4">
        <OneRepMax />
        <PlateCalculator />
        <WarmupCalculator />
      </div>
    </div>
  )
}

function OneRepMax() {
  const [weight, setWeight] = useState('80')
  const [reps, setReps] = useState('5')

  const w = parseNumber(weight)
  const r = Math.max(1, Math.min(20, Math.round(parseNumber(reps))))
  const valid = w > 0 && r > 0

  const epley = valid ? round1(w * (1 + r / 30)) : 0
  const brzycki = valid && r < 37 ? round1((w * 36) / (37 - r)) : 0
  const estimate = valid
    ? round1(r === 1 ? w : (epley + brzycki) / 2)
    : 0

  return (
    <Card>
      <CardTitle title="Максимум на один повтор" />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Вес, кг">
          <Input
            value={weight}
            onChange={(event) => setWeight(event.target.value)}
            inputMode="decimal"
          />
        </Field>
        <Field label="Повторы">
          <Input
            value={reps}
            onChange={(event) => setReps(event.target.value)}
            inputMode="numeric"
          />
        </Field>
      </div>

      <div className="mt-4 rounded-xl border border-accent/30 bg-accent-soft p-3">
        <p className="text-[10px] uppercase tracking-wide text-accent">Оценка 1ПМ</p>
        <p className="mt-1 text-2xl font-semibold tabular">
          {valid ? `${estimate} кг` : '—'}
        </p>
        <p className="mt-1 text-[10px] text-muted">
          Эпли {valid ? `${epley} кг` : '—'} · Бржицки {valid ? `${brzycki} кг` : '—'}
        </p>
      </div>

      {valid ? (
        <div className="mt-3 grid grid-cols-4 gap-2 text-center">
          {[95, 90, 85, 80, 75, 70, 65, 60].map((percent) => (
            <div key={percent} className="rounded-lg bg-surface-2/50 px-1 py-1.5">
              <p className="text-[9px] text-faint">{percent}%</p>
              <p className="text-[11px] font-medium tabular">
                {round1((estimate * percent) / 100)}
              </p>
            </div>
          ))}
        </div>
      ) : null}
    </Card>
  )
}

function PlateCalculator() {
  const [target, setTarget] = useState('100')
  const [bar, setBar] = useState(20)

  const total = parseNumber(target)
  const perSide = Math.max(0, (total - bar) / 2)

  const { plates, remainder } = useMemo(() => {
    let left = perSide
    const result: { plate: number; count: number }[] = []
    for (const plate of PLATES) {
      const count = Math.floor((left + 1e-9) / plate)
      if (count > 0) {
        result.push({ plate, count })
        left = round1(left - count * plate)
      }
    }
    return { plates: result, remainder: left }
  }, [perSide])

  const achievable = round1(bar + (perSide - remainder) * 2)

  return (
    <Card>
      <CardTitle title="Блины на штангу" />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Целевой вес, кг">
          <Input
            value={target}
            onChange={(event) => setTarget(event.target.value)}
            inputMode="decimal"
          />
        </Field>
        <Field label="Гриф">
          <Select value={String(bar)} onChange={(event) => setBar(Number(event.target.value))}>
            {BAR_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="mt-4 rounded-xl border border-border bg-surface-2/40 p-3">
        <p className="text-[10px] uppercase tracking-wide text-muted">
          На каждую сторону
        </p>
        {perSide <= 0 ? (
          <p className="mt-1 text-sm text-muted">Вес меньше грифа</p>
        ) : plates.length === 0 ? (
          <p className="mt-1 text-sm text-muted">Только гриф</p>
        ) : (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {plates.map(({ plate, count }) => (
              <span
                key={plate}
                className="rounded-lg border border-border bg-surface px-2 py-1 text-[11px] font-medium tabular"
              >
                {plate} кг × {count}
              </span>
            ))}
          </div>
        )}
        {remainder > 0.01 ? (
          <p className="mt-2 text-[10px] text-warn">
            Не хватает {remainder} кг на сторону. Ближайший вес: {achievable} кг.
          </p>
        ) : perSide > 0 ? (
          <p className="mt-2 text-[10px] text-muted">
            Итого со штангой: {round1(bar + perSide * 2)} кг
          </p>
        ) : null}
      </div>
    </Card>
  )
}

function WarmupCalculator() {
  const [working, setWorking] = useState('100')

  const weight = parseNumber(working)
  const steps = [
    { percent: 40, reps: 8 },
    { percent: 55, reps: 5 },
    { percent: 70, reps: 3 },
    { percent: 85, reps: 1 },
  ]

  return (
    <Card>
      <CardTitle title="Разминочные подходы" />
      <Field label="Рабочий вес, кг">
        <Input
          value={working}
          onChange={(event) => setWorking(event.target.value)}
          inputMode="decimal"
        />
      </Field>

      {weight > 0 ? (
        <div className="mt-3 space-y-1.5">
          {steps.map((step) => (
            <div
              key={step.percent}
              className="flex items-center justify-between rounded-lg bg-surface-2/40 px-3 py-2"
            >
              <span className="flex items-center gap-2 text-[11px] text-muted">
                <Flame size={12} className="text-warn" />
                {step.percent}%
              </span>
              <span className="text-xs font-medium tabular">
                {round1((weight * step.percent) / 100)} кг × {step.reps}
              </span>
            </div>
          ))}
          <div className="flex items-center justify-between rounded-lg border border-accent/30 bg-accent-soft px-3 py-2">
            <span className="flex items-center gap-2 text-[11px] text-accent">
              <TrendingUp size={12} />
              Рабочий
            </span>
            <span className="text-xs font-semibold tabular text-accent">
              {numberToInput(weight)} кг
            </span>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-surface-2/40 px-3 py-4 text-[11px] text-muted">
          <Calculator size={16} />
          Введите рабочий вес, чтобы увидеть разминку.
        </div>
      )}

      <p className="mt-3 flex items-start gap-1.5 text-[10px] leading-relaxed text-faint">
        <Dumbbell size={12} className="mt-0.5 shrink-0" />
        Между разминочными подходами отдыхайте 60–90 секунд. Последний подход —
        близко к рабочему весу.
      </p>
    </Card>
  )
}
