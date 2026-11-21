import type { CoachAction } from '@/db/types'
import { getCoachConfig } from './config'
import { buildSystemPrompt } from './prompt'
import { COACH_TOOLS, executeTool } from './tools'
import type { AiChatResponse, AiMessage } from './types'

export interface CoachRunResult {
  content: string
  actions: CoachAction[]
  traces: string[]
  tokens?: number
}

export interface CoachHistoryItem {
  role: 'user' | 'assistant'
  content: string
}

const MAX_STEPS = 5

export async function runCoach(
  history: CoachHistoryItem[],
  signal?: AbortSignal,
): Promise<CoachRunResult> {
  const config = getCoachConfig()
  if (!config.accessCode) {
    throw new Error('Не указан код доступа к тренеру')
  }

  const messages: AiMessage[] = [
    { role: 'system', content: buildSystemPrompt() },
    ...history.slice(-16).map((item) => ({
      role: item.role,
      content: item.content,
    })),
  ]

  const actions: CoachAction[] = []
  const traces: string[] = []
  let tokens = 0

  for (let step = 0; step < MAX_STEPS; step += 1) {
    let response: Response
    try {
      response = await fetch(`${config.endpoint}/chat`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-athly-code': config.accessCode,
        },
        body: JSON.stringify({
          messages,
          tools: COACH_TOOLS,
          temperature: 0.3,
          max_tokens: 1200,
        }),
        signal,
      })
    } catch (error) {
      if (signal?.aborted) throw new Error('Запрос отменён')
      throw new Error('Не удалось связаться с тренером. Проверьте интернет и настройки.')
    }

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      if (response.status === 403) {
        throw new Error('Неверный код доступа к тренеру')
      }
      throw new Error(`Тренер ответил ошибкой ${response.status}: ${body.slice(0, 200)}`)
    }

    const data = (await response.json()) as AiChatResponse
    if (data.usage?.total_tokens) tokens += data.usage.total_tokens

    const message = data.choices?.[0]?.message
    if (!message) throw new Error('Пустой ответ тренера')

    messages.push({
      role: 'assistant',
      content: message.content ?? null,
      tool_calls: message.tool_calls,
    })

    if (!message.tool_calls || message.tool_calls.length === 0) {
      return {
        content: message.content?.trim() || (actions.length > 0 ? 'Готово. Проверьте действие ниже.' : ''),
        actions,
        traces,
        tokens,
      }
    }

    for (const call of message.tool_calls) {
      let args: Record<string, unknown> = {}
      try {
        args = JSON.parse(call.function.arguments || '{}') as Record<string, unknown>
      } catch {
        args = {}
      }

      const result = await executeTool(call.function.name, args)
      if (result.trace) traces.push(result.trace)
      if (result.action) actions.push(result.action)

      messages.push({
        role: 'tool',
        tool_call_id: call.id,
        content: JSON.stringify(result.content),
      })
    }
  }

  throw new Error('Тренер не смог завершить ответ. Попробуйте переформулировать.')
}
