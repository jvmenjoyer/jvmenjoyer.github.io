import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Athly: ошибка приложения', error, info)
  }

  private reload = () => window.location.reload()

  private reset = () => {
    const request = indexedDB.deleteDatabase('athly')
    const done = () => window.location.reload()
    request.onsuccess = done
    request.onerror = done
    request.onblocked = done
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg px-6 text-center text-text">
        <div className="w-full max-w-sm">
          <p className="text-base font-semibold">Что-то сломалось</p>
          <p className="mt-2 break-words text-xs text-muted">
            {this.state.error.message || 'Неизвестная ошибка'}
          </p>
          <div className="mt-5 space-y-2">
            <button
              type="button"
              onClick={this.reload}
              className="h-11 w-full rounded-xl bg-accent text-sm font-semibold text-accent-ink"
            >
              Перезагрузить
            </button>
            <button
              type="button"
              onClick={this.reset}
              className="h-11 w-full rounded-xl border border-border bg-surface-2 text-sm text-muted"
            >
              Сбросить локальные данные
            </button>
          </div>
          <p className="mt-3 text-[10px] leading-relaxed text-faint">
            Сброс удалит все тренировки, программы и замеры на этом устройстве.
          </p>
        </div>
      </div>
    )
  }
}
