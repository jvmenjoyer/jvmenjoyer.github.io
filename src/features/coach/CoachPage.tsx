import {
  ArrowRight,
  Check,
  ClipboardList,
  Loader2,
  MessageCircle,
  Ruler,
  Send,
  Settings2,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Field, Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/ui/PageHeader'
import { useCoachMessages } from '@/db/hooks'
import {
  clearCoachMessages,
  saveCoachMessage,
  saveMeasurement,
  saveProgram,
  saveWorkout,
  updateCoachAction,
} from '@/db/repo'
import type { CoachAction, CoachMessage } from '@/db/types'
import {
  getCoachConfig,
  isCoachConfigured,
  saveCoachConfig,
  testCoachConnection,
  type CoachConfig,
} from '@/ai/config'
import { runCoach } from '@/ai/client'
import { newId, nowISO } from '@/lib/id'
import { cn } from '@/lib/cn'
import { toast } from '@/store/toast'

const SUGGESTIONS = [
  'Разбери мою неделю и скажи, что улучшить',
  'Составь программу на 3 дня в неделю',
  'Что делать сегодня?',
  'Почему не растёт присед?',
]

export function CoachPage() {
  const navigate = useNavigate()
  const messages = useCoachMessages()
  const [config, setConfig] = useState<CoachConfig>(() => getCoachConfig())
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [traces, setTraces] = useState<string[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)

  const configured = isCoachConfigured(config)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages.length, sending, traces.length])

  function refreshConfig() {
    setConfig(getCoachConfig())
  }

  async function send(text: string) {
    const trimmed = text.trim()
    if (!trimmed || sending) return

    const userMessage: CoachMessage = {
      id: newId(),
      role: 'user',
      content: trimmed,
      createdAt: nowISO(),
    }
    await saveCoachMessage(userMessage)
    setInput('')
    setSending(true)
    setTraces([])

    try {
      const history = [...messages, userMessage]
        .filter((message) => !message.error && message.content.trim())
        .map((message) => ({ role: message.role, content: message.content }))

      const result = await runCoach(history)
      setTraces(result.traces)

      const assistantMessage: CoachMessage = {
        id: newId(),
        role: 'assistant',
        content:
          result.content ||
          (result.actions.length > 0
            ? 'Готово. Проверьте действие ниже.'
            : 'Не удалось сформулировать ответ.'),
        createdAt: nowISO(),
        actions: result.actions.length > 0 ? result.actions : undefined,
      }
      await saveCoachMessage(assistantMessage)
    } catch (error) {
      console.error(error)
      await saveCoachMessage({
        id: newId(),
        role: 'assistant',
        content:
          error instanceof Error
            ? error.message
            : 'Ошибка. Проверьте настройки тренера.',
        createdAt: nowISO(),
        error: true,
      })
    } finally {
      setSending(false)
      setTraces([])
    }
  }

  async function clearHistory() {
    if (!window.confirm('Очистить историю чата с тренером?')) return
    await clearCoachMessages()
    toast('История очищена', 'success')
  }

  const visibleMessages = useMemo(
    () => messages.filter((message) => message.content.trim() || message.actions?.length),
    [messages],
  )

  return (
    <div className="flex min-h-[calc(100dvh-7rem)] flex-col">
      <PageHeader
        title="Тренер"
        subtitle="AI-коуч по твоим данным"
        actions={
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={clearHistory}
              aria-label="Очистить историю"
            >
              <Trash2 size={17} />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              onClick={() => setSettingsOpen(true)}
              aria-label="Настройки тренера"
            >
              <Settings2 size={17} />
            </Button>
          </>
        }
      />

      {!configured ? (
        <SetupCard
          onOpenSettings={() => setSettingsOpen(true)}
        />
      ) : null}

      <div className="flex-1 space-y-3 pb-2">
        {visibleMessages.length === 0 && configured ? (
          <Card className="border-accent/20 bg-gradient-to-br from-accent-soft/60 to-surface">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <Sparkles size={19} />
              </span>
              <div>
                <p className="text-sm font-medium">Привет, я Athly Coach</p>
                <p className="mt-1 text-[11px] leading-relaxed text-muted">
                  Вижу твои тренировки, программы, рекорды и замеры. Могу разобрать
                  неделю, подобрать веса, составить программу или записать замер —
                  с твоим подтверждением.
                </p>
              </div>
            </div>
          </Card>
        ) : null}

        {visibleMessages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            onAction={async (action, status) => {
              await updateCoachAction(message.id, action.id, status)
            }}
            onNavigate={navigate}
          />
        ))}

        {sending ? (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-2xl rounded-bl-md border border-border bg-surface px-4 py-3">
              <div className="flex items-center gap-2 text-xs text-muted">
                <Loader2 size={14} className="animate-spin" />
                Думаю…
              </div>
              {traces.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {traces.map((trace, index) => (
                    <Badge key={`${trace}-${index}`}>{trace}</Badge>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        <div ref={bottomRef} />
      </div>

      {configured ? (
        <div className="mt-4 rounded-2xl border border-border bg-surface/95 p-2 shadow-xl backdrop-blur">
          {visibleMessages.length === 0 ? (
            <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => void send(suggestion)}
                  className="shrink-0 rounded-lg border border-border px-2.5 py-1.5 text-[10px] text-muted transition-colors hover:border-accent/40 hover:text-text"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          ) : null}

          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  void send(input)
                }
              }}
              rows={1}
              placeholder="Спроси тренера…"
              className="max-h-32 min-h-10 flex-1 resize-none rounded-xl border border-border bg-surface-2 px-3.5 py-2.5 text-sm text-text placeholder:text-faint focus:border-accent/60 focus:outline-none"
              disabled={sending}
            />
            <Button
              variant="primary"
              size="icon"
              onClick={() => void send(input)}
              disabled={sending || !input.trim()}
              aria-label="Отправить"
            >
              {sending ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}
            </Button>
          </div>
        </div>
      ) : null}

      <p className="mt-3 text-center text-[9px] leading-relaxed text-faint">
        AI-тренер может ошибаться. Это не медицинская рекомендация. Данные
        тренировок отправляются в DeepSeek только для ответа.
      </p>

      <CoachSettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onSaved={() => {
          refreshConfig()
          setSettingsOpen(false)
        }}
      />
    </div>
  )
}

function MessageBubble({
  message,
  onAction,
  onNavigate,
}: {
  message: CoachMessage
  onAction: (action: CoachAction, status: CoachAction['status']) => Promise<void>
  onNavigate: (path: string) => void
}) {
  const isUser = message.role === 'user'

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
          isUser
            ? 'rounded-br-md bg-accent text-accent-ink'
            : message.error
              ? 'rounded-bl-md border border-danger/30 bg-danger/10 text-danger'
              : 'rounded-bl-md border border-border bg-surface text-text',
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <FormattedText text={message.content} />
        )}

        {message.actions?.map((action) => (
          <ActionCard
            key={action.id}
            action={action}
            onStatus={(status) => onAction(action, status)}
            onNavigate={onNavigate}
          />
        ))}
      </div>
    </div>
  )
}

function FormattedText({ text }: { text: string }) {
  const lines = text.split('\n')

  return (
    <div className="space-y-1.5">
      {lines.map((line, index) => {
        const trimmed = line.trim()
        if (!trimmed) return <div key={index} className="h-1" />

        if (/^[-•]\s+/.test(trimmed)) {
          return (
            <div key={index} className="flex gap-2">
              <span className="shrink-0 text-accent">•</span>
              <span className="min-w-0">
                {renderInline(trimmed.replace(/^[-•]\s+/, ''))}
              </span>
            </div>
          )
        }

        if (/^#{1,3}\s+/.test(trimmed)) {
          return (
            <p key={index} className="font-semibold">
              {renderInline(trimmed.replace(/^#{1,3}\s+/, ''))}
            </p>
          )
        }

        return <p key={index}>{renderInline(trimmed)}</p>
      })}
    </div>
  )
}

function renderInline(text: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)

  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={index} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      )
    }
    return <span key={index}>{part}</span>
  })
}

function ActionCard({
  action,
  onStatus,
  onNavigate,
}: {
  action: CoachAction
  onStatus: (status: CoachAction['status']) => Promise<void>
  onNavigate: (path: string) => void
}) {
  const [busy, setBusy] = useState(false)
  const done = action.status !== 'pending'

  async function apply() {
    if (busy || done) return
    setBusy(true)

    try {
      if (action.type === 'create_program') {
        await saveProgram(action.program)
        await onStatus('applied')
        toast('Программа создана', 'success')
        onNavigate(`/programs/${action.program.id}`)
      } else if (action.type === 'save_measurement') {
        await saveMeasurement(action.measurement)
        await onStatus('applied')
        toast('Замер сохранён', 'success')
        onNavigate('/measurements')
      } else if (action.type === 'start_workout') {
        await saveWorkout(action.workout)
        await onStatus('applied')
        onNavigate(`/workout/${action.workout.id}`)
      }
    } catch (error) {
      console.error(error)
      toast('Не удалось выполнить действие', 'error')
    } finally {
      setBusy(false)
    }
  }

  async function cancel() {
    if (busy || done) return
    setBusy(true)
    try {
      await onStatus('cancelled')
    } finally {
      setBusy(false)
    }
  }

  const icon =
    action.type === 'create_program'
      ? ClipboardList
      : action.type === 'save_measurement'
        ? Ruler
        : MessageCircle
  const Icon = icon

  const title =
    action.type === 'create_program'
      ? action.program.name
      : action.type === 'save_measurement'
        ? `Замер: ${action.measurement.weight} кг`
        : action.workout.name

  const subtitle =
    action.type === 'create_program'
      ? `${action.program.days.length} дн. · ${action.program.days.reduce((sum, day) => sum + day.exercises.length, 0)} упр.`
      : action.type === 'save_measurement'
        ? action.measurement.date
        : `${action.workout.exercises.length} упр. · ${action.workout.date}`

  return (
    <div className="mt-3 rounded-xl border border-border bg-bg/40 p-3">
      <div className="flex items-start gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-accent">
          <Icon size={15} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium">{title}</p>
          <p className="mt-0.5 text-[10px] text-muted">{subtitle}</p>
        </div>
        {done ? (
          action.status === 'applied' ? (
            <Check size={15} className="text-accent" />
          ) : (
            <X size={15} className="text-faint" />
          )
        ) : null}
      </div>

      {!done ? (
        <div className="mt-2.5 flex gap-2">
          <Button
            variant="primary"
            size="sm"
            className="flex-1"
            onClick={apply}
            disabled={busy}
          >
            {busy ? 'Выполняю…' : action.type === 'start_workout' ? 'Начать' : 'Применить'}
          </Button>
          <Button variant="ghost" size="sm" onClick={cancel} disabled={busy}>
            Отмена
          </Button>
        </div>
      ) : (
        <p className="mt-2 text-[10px] text-faint">
          {action.status === 'applied' ? 'Применено' : 'Отменено'}
        </p>
      )}
    </div>
  )
}

function SetupCard({
  onOpenSettings,
}: {
  onOpenSettings: () => void
}) {
  return (
    <Card className="mb-4 border-accent/30 bg-accent-soft/30">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
          <Sparkles size={19} />
        </span>
        <div className="flex-1">
          <p className="text-sm font-semibold">Тренер ждёт настройки</p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted">
            Вставьте код доступа к прокси — он лежит в файле{' '}
            <code className="rounded bg-surface-2 px-1 py-0.5 text-[10px]">.env.local</code>{' '}
            рядом с проектом.
          </p>
          <Button variant="primary" size="sm" className="mt-3" onClick={onOpenSettings}>
            Настроить
          </Button>
        </div>
      </div>
    </Card>
  )
}

function CoachSettingsModal({
  open,
  onClose,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  onSaved: () => void
}) {
  const [endpoint, setEndpoint] = useState('')
  const [accessCode, setAccessCode] = useState('')
  const [testing, setTesting] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    const config = getCoachConfig()
    setEndpoint(config.endpoint)
    setAccessCode(config.accessCode)
  }, [open])

  async function test() {
    setTesting(true)
    try {
      const result = await testCoachConnection({
        endpoint,
        accessCode,
        model: 'deepseek-flash',
      })
      toast(`Связь есть · модель ${result.model ?? 'deepseek'}`, 'success')
    } catch (error) {
      console.error(error)
      toast(error instanceof Error ? error.message : 'Нет связи', 'error')
    } finally {
      setTesting(false)
    }
  }

  async function save() {
    setSaving(true)
    try {
      saveCoachConfig({ endpoint, accessCode: accessCode.trim() })
      toast('Настройки тренера сохранены', 'success')
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Настройки тренера"
      description="Прокси Cloudflare и код доступа"
      footer={
        <>
          <Button variant="secondary" size="md" onClick={test} disabled={testing}>
            {testing ? 'Проверяю…' : 'Проверить'}
          </Button>
          <Button variant="primary" size="md" className="flex-1" onClick={save} disabled={saving}>
            Сохранить
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Адрес прокси">
          <Input
            value={endpoint}
            onChange={(event) => setEndpoint(event.target.value)}
            placeholder="https://athly-coach.….workers.dev"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
          />
        </Field>
        <Field
          label="Код доступа"
          hint="Строка ATHLY_ACCESS_CODE из .env.local"
        >
          <Input
            type="password"
            value={accessCode}
            onChange={(event) => setAccessCode(event.target.value)}
            placeholder="athly-…"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
          />
        </Field>
        <p className="text-[10px] leading-relaxed text-faint">
          Ключ DeepSeek хранится только в Cloudflare. В приложении — только код
          доступа, в этом браузере.
        </p>
        <div className="flex items-start gap-2 rounded-xl border border-border bg-surface-2/40 p-2.5 text-[10px] text-muted">
          <ArrowRight size={13} className="mt-0.5 shrink-0" />
          <span>
            Для перевода названий и тренера используется DeepSeek Flash. Если
            меняете провайдера — обновите Worker и адрес.
          </span>
        </div>
      </div>
    </Modal>
  )
}
