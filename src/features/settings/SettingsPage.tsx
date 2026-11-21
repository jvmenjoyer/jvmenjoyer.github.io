import {
  Bell,
  BellRing,
  ChevronRight,
  Download,
  Gauge,
  RotateCcw,
  Save,
  Timer,
  Trash2,
  Upload,
} from 'lucide-react'
import { useRef, useState, type ChangeEvent } from 'react'
import { Card, CardTitle } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { Select } from '@/components/ui/Input'
import {
  useBackupSnapshots,
  useExercises,
  useMeasurements,
  usePrograms,
  useSettings,
  useWorkouts,
} from '@/db/hooks'
import { db } from '@/db/db'
import { exportBackupJson, importBackup } from '@/db/backup'
import {
  createBackupSnapshot,
  deleteBackupSnapshot,
  formatBackupSize,
  restoreBackupSnapshot,
} from '@/db/autoBackup'
import { reseedPresets } from '@/db/catalog'
import { updateSettings } from '@/db/repo'
import { fullDate } from '@/lib/date'
import { pluralRu } from '@/lib/format'
import {
  notificationState,
  requestNotificationPermission,
  showLocalNotification,
  type NotificationState,
} from '@/lib/notifications'
import { toast } from '@/store/toast'

const APP_VERSION = '0.3.0'

const REST_OPTIONS = [60, 90, 120, 150, 180, 240]

export function SettingsPage() {
  const exercises = useExercises()
  const programs = usePrograms()
  const workouts = useWorkouts()
  const measurements = useMeasurements()
  const settings = useSettings()
  const snapshots = useBackupSnapshots()
  const fileInput = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [permission, setPermission] = useState<NotificationState>(() =>
    notificationState(),
  )

  const autoRest = settings?.autoRestTimer !== false
  const progression = settings?.progressionEnabled !== false
  const restSec = settings?.defaultRestSec ?? 90

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

  async function handleSnapshot() {
    setBusy(true)
    try {
      await createBackupSnapshot('Вручную')
      toast('Копия создана', 'success')
    } catch (error) {
      console.error(error)
      toast('Не удалось создать копию', 'error')
    } finally {
      setBusy(false)
    }
  }

  async function handleRestore(id: string) {
    if (!window.confirm('Восстановить данные из этой копии? Текущие данные заменятся.')) {
      return
    }
    setBusy(true)
    try {
      await restoreBackupSnapshot(id)
      toast('Данные восстановлены', 'success')
      setTimeout(() => window.location.reload(), 500)
    } catch (error) {
      console.error(error)
      toast(error instanceof Error ? error.message : 'Ошибка восстановления', 'error')
    } finally {
      setBusy(false)
    }
  }

  async function handleDeleteSnapshot(id: string) {
    if (!window.confirm('Удалить эту резервную копию?')) return
    try {
      await deleteBackupSnapshot(id)
      toast('Копия удалена', 'success')
    } catch (error) {
      console.error(error)
      toast('Не удалось удалить копию', 'error')
    }
  }

  async function handlePermission() {
    const next = await requestNotificationPermission()
    setPermission(next)
    if (next === 'granted') {
      toast('Уведомления включены', 'success')
      void showLocalNotification(
        'Athly',
        'Уведомления работают. Таймер отдыха сообщит об окончании.',
        'athly-test',
      )
    } else if (next === 'denied') {
      toast('Уведомления заблокированы в настройках браузера', 'error')
    }
  }

  return (
    <div>
      <PageHeader title="Настройки" subtitle="Тренировки, данные и приложение" />

      <Card className="mb-4">
        <CardTitle title="Тренировка" />
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm">Отдых по умолчанию</p>
              <p className="mt-0.5 text-[11px] text-muted">
                Используется, если в программе не задано другое
              </p>
            </div>
            <Select
              value={String(restSec)}
              onChange={(event) =>
                void updateSettings({ defaultRestSec: Number(event.target.value) })
              }
              className="h-9 w-24 shrink-0 px-2 text-xs"
              aria-label="Отдых по умолчанию"
            >
              {REST_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {value} с
                </option>
              ))}
            </Select>
          </div>

          <ToggleRow
            icon={Timer}
            title="Автостарт таймера"
            description="Запускать отдых после отметки подхода"
            checked={autoRest}
            onChange={(value) => void updateSettings({ autoRestTimer: value })}
          />

          <ToggleRow
            icon={Gauge}
            title="Автопрогрессия"
            description="Подставлять рабочий вес по последней тренировке"
            checked={progression}
            onChange={(value) => void updateSettings({ progressionEnabled: value })}
          />
        </div>
      </Card>

      <Card className="mb-4">
        <CardTitle title="Уведомления" />
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-muted">
            {permission === 'granted' ? <BellRing size={16} /> : <Bell size={16} />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm">
              {permission === 'granted'
                ? 'Разрешены'
                : permission === 'denied'
                  ? 'Заблокированы'
                  : permission === 'unsupported'
                    ? 'Не поддерживаются'
                    : 'Не включены'}
            </p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
              Таймер отдыха пришлёт уведомление, если приложение свёрнуто.
              На iPhone уведомления работают только у PWA, установленной на экран
              «Домой».
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handlePermission}
                disabled={permission === 'unsupported'}
                className="rounded-lg bg-accent px-3 py-1.5 text-[11px] font-medium text-accent-ink disabled:opacity-50"
              >
                {permission === 'granted' ? 'Проверить' : 'Разрешить'}
              </button>
              {permission === 'granted' ? (
                <button
                  type="button"
                  onClick={() =>
                    void showLocalNotification(
                      'Athly',
                      'Тестовое уведомление — всё работает.',
                      'athly-test',
                    )
                  }
                  className="rounded-lg border border-border px-3 py-1.5 text-[11px] text-muted"
                >
                  Тест
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </Card>

      <Card className="mb-4 py-1">
        <div className="px-0 pb-1 pt-3">
          <h2 className="text-sm font-semibold">Данные</h2>
          <p className="mt-0.5 text-[11px] text-muted">
            Всё хранится на этом телефоне. Автокопия создаётся раз в сутки и после
            тренировки.
          </p>
        </div>

        <div className="mt-2 divide-y divide-border/60">
          <ActionRow
            icon={Save}
            title="Создать копию сейчас"
            description={
              snapshots[0]
                ? `Последняя: ${fullDate(snapshots[0].createdAt)}`
                : 'Внутренняя копия в браузере'
            }
            onClick={handleSnapshot}
            disabled={busy}
          />
          <ActionRow
            icon={Download}
            title="Экспорт JSON"
            description="Файл для переноса на другое устройство"
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

      {snapshots.length > 0 ? (
        <Card className="mb-4">
          <CardTitle
            title={`Резервные копии · ${snapshots.length} ${pluralRu(
              snapshots.length,
              'копия',
              'копии',
              'копий',
            )}`}
          />
          <div className="divide-y divide-border/60">
            {snapshots.map((snapshot) => (
              <div key={snapshot.id} className="flex items-center gap-2 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs">
                    {fullDate(snapshot.createdAt)} ·{' '}
                    {new Date(snapshot.createdAt).toLocaleTimeString('ru-RU', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                  <p className="mt-0.5 text-[10px] text-muted">
                    {snapshot.reason} · {formatBackupSize(snapshot.json)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRestore(snapshot.id)}
                  disabled={busy}
                  className="rounded-lg border border-border px-2.5 py-1.5 text-[10px] text-muted transition-colors hover:text-accent disabled:opacity-50"
                >
                  Восстановить
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteSnapshot(snapshot.id)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-faint transition-colors hover:text-danger"
                  aria-label="Удалить копию"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

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

function ToggleRow({
  icon: Icon,
  title,
  description,
  checked,
  onChange,
}: {
  icon: typeof Timer
  title: string
  description: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-muted">
        <Icon size={15} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium">{title}</p>
        <p className="mt-0.5 text-[10px] text-muted">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={title}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? 'bg-accent' : 'bg-surface-3'
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-bg transition-transform ${
            checked ? 'translate-x-5.5' : 'translate-x-0.5'
          }`}
        />
      </button>
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
