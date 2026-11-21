export type AiRole = 'system' | 'user' | 'assistant' | 'tool'

export interface AiToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
  }
}

export interface AiMessage {
  role: AiRole
  content: string | null
  tool_calls?: AiToolCall[]
  tool_call_id?: string
}

export interface ToolDefinition {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: Record<string, unknown>
  }
}

export interface AiChatResponse {
  choices: Array<{
    message: AiMessage
    finish_reason?: string
  }>
  usage?: {
    prompt_tokens?: number
    completion_tokens?: number
    total_tokens?: number
  }
}

export interface ToolResult {
  content: unknown
  action?: import('@/db/types').CoachAction
  trace?: string
}
