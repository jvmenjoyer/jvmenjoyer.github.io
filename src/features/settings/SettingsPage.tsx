import {
  ChevronRight,
  Download,
  RotateCcw,
  Trash2,
  Upload,
} from 'lucide-react'
import { useRef, useState, type ChangeEvent } from 'react'
import { Card, CardTitle } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { useExercises, useMeasurements, usePrograms, useWorkouts } from '@/db/hooks'
import { db } from '@/db/db'
import { exportBackupJson, importBackup } from '@/db/backup'
import { reseedPresets } from '@/db/catalog'
import { pluralRu } from '@/lib/format'
import { toast } from '@/store/toast'

const APP_VERSION = '0.1.0'

export function SettingsPage() {
  const exercises = useExercises()
  const programs = usePrograms()
  const workouts = useWorkouts()
  const measurements = useMeasurements()
  const fileInput = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  async function handleExport() {
    setBusy(true)
    try {
      await exportBackupJson()
      toast('Резервная копия сохранена', 'success')
    } catch (error) {
      console.error(error)
      toast('Не удалось создать копию', 'error')
    } finally {
      setBusy(false)
    }
  }

  async function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!window.confirm('Импорт заменит программы, тренировки и замеры. Продолжить?')) {
      return
    }

    setBusy(true)
    try {
      await importBackup(file)
      toast('Данные импортированы', 'success')
      setTimeout(() => window.location.reload(), 500)
    } catch (error) {
      console.error(error)
      toast(error instanceof Error ? error.message : 'Ошибка импорта', 'error')
    } finally {
      setBusy(false)
    }
  }

  async function handleReseed() {
    setBusy(true)
    try {
      await reseedPresets()
      toast('Готовые программы восстановлены', 'success')
    } catch (error) {
      console.error(error)
      toast('Не удалось восстановить программы', 'error')
    } finally {
      setBusy(false)
    }
  }

  async function handleResetAll() {
    if (
      !window.confirm(
        'Удалить все тренировки, программы, замеры и свои упражнения? База упражнений скачается заново.',
      )
    ) {
      return
    }

    setBusy(true)
    try {
      await db.delete()
      window.location.reload()
    } catch (error) {
      console.error(error)
      toast('Не удалось сбросить данные', 'error')
      setBusy(false)
    }
  }

  return (
    <div>
      <PageHeader title="Настройки" subtitle="Данные и приложение" />

      <Card className="mb-4 py-1">
        <div className="px-0 pb-1 pt-3">
          <h2 className="text-sm font-semibold">Данные</h2>
          <p className="mt-0.5 text-[11px] text-muted">
            Всё хранится на этом телефоне. Делайте резервные копии перед сменой устройства.
          </p>
        </div>

        <div className="mt-2 divide-y divide-border/60">
          <ActionRow
            icon={Download}
            title="Экспорт JSON"
            description="Программы, тренировки, замеры и свои упражнения"
            onClick={handleExport}
            disabled={busy}
          />
          <ActionRow
            icon={Upload}
            title="Импорт JSON"
            description="Заменить данные из резервной копии"
            onClick={() => fileInput.current?.click()}
            disabled={busy}
          />
          <ActionRow
            icon={RotateCcw}
            title="Вернуть готовые программы"
            description="Full Body, Upper/Lower, PPL, Bro Split, 5×5"
            onClick={handleReseed}
            disabled={busy}
          />
          <ActionRow
            icon={Trash2}
            title="Удалить все данные"
            description="Полный сброс на этом устройстве"
            onClick={handleResetAll}
            danger
            disabled={busy}
          />
        </div>

        <input
          ref={fileInput}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={handleImport}
        />
      </Card>

      <Card className="mb-4">
        <CardTitle title="Что внутри" />
        <div className="space-y-2 text-xs">
          <InfoRow label="Упражнений в базе" value={`${exercises.length}`} />
          <InfoRow
            label="Программ"
            value={`${programs.length} (${programs.filter((program) => program.isPreset).length} готовых)`}
          />
          <InfoRow
            label="Тренировок"
            value={`${workouts.length} ${pluralRu(workouts.length, 'шт.', 'шт.', 'шт.')}`}
          />
          <InfoRow label="Замеров" value={`${measurements.length}`} />
          <InfoRow label="Единицы" value="килограммы" />
        </div>
      </Card>

      <Card className="mb-4">
        <CardTitle title="Установка на iPhone" />
        <ol className="list-decimal space-y-1.5 pl-4 text-[11px] leading-relaxed text-muted">
          <li>Откройте адрес приложения в Safari.</li>
          <li>Нажмите «Поделиться» → «На экран Домой».</li>
          <li>Откройте с иконки и один раз дайте загрузиться онлайн — дальше работает офлайн.</li>
        </ol>
      </Card>

      <Card>
        <CardTitle title="О приложении" />
        <p className="text-xs text-muted">Athly {APP_VERSION} — дневник тренировок.</p>
        <p className="mt-1 text-[11px] leading-relaxed text-faint">
          База упражнений: free-exercise-db (public domain), перевод автоматический.
          Приложение не отправляет данные на серверы.
        </p>
      </Card>
    </div>
  )
}

function ActionRow({
  icon: Icon,
  title,
  description,
  onClick,
  danger,
  disabled,
}: {
  icon: typeof Download
  title: string
  description: string
  onClick: () => void
  danger?: boolean
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center gap-3 py-3 text-left transition-colors disabled:opacity-50 ${
        danger ? 'hover:text-danger' : 'hover:text-accent'
      }`}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
          danger ? 'bg-danger/10 text-danger' : 'bg-surface-2 text-muted'
        }`}
      >
        <Icon size={16} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm">{title}</span>
        <span className="mt-0.5 block text-[11px] text-muted">{description}</span>
      </span>
      <ChevronRight size={15} className="shrink-0 text-faint" />
    </button>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted">{label}</span>
      <span className="tabular">{value}</span>
    </div>
  )
}
