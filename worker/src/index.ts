interface Env {
  DEEPSEEK_API_KEY: string
  ATHLY_ACCESS_CODE: string
  MODEL: string
  DEEPSEEK_URL: string
  ALLOWED_ORIGINS: string
}

interface ChatMessage {
  role: string
  content: unknown
  tool_call_id?: string
  tool_calls?: unknown
}

interface ChatTool {
  type: string
  function?: { name?: string }
}

interface ChatBody {
  messages?: ChatMessage[]
  tools?: ChatTool[]
  tool_choice?: unknown
  temperature?: number
  max_tokens?: number
  stream?: boolean
}

const MAX_MESSAGES = 40
const MAX_TOKENS = 1600
const ALLOWED_ROLES = new Set(['system', 'user', 'assistant', 'tool'])

function corsHeaders(origin: string): Headers {
  const headers = new Headers()
  headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  headers.set('Access-Control-Allow-Headers', 'content-type, x-athly-code')
  headers.set('Access-Control-Max-Age', '86400')
  headers.set('Vary', 'Origin')
  if (origin) headers.set('Access-Control-Allow-Origin', origin)
  return headers
}

function jsonResponse(
  payload: unknown,
  status: number,
  origin: string,
): Response {
  const headers = corsHeaders(origin)
  headers.set('Content-Type', 'application/json; charset=utf-8')
  headers.set('Cache-Control', 'no-store')
  return new Response(JSON.stringify(payload), { status, headers })
}

async function constantTimeEqual(left: string, right: string): Promise<boolean> {
  const encoder = new TextEncoder()
  const [leftHash, rightHash] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(left)),
    crypto.subtle.digest('SHA-256', encoder.encode(right)),
  ])

  const a = new Uint8Array(leftHash)
  const b = new Uint8Array(rightHash)
  let difference = 0

  for (let index = 0; index < a.length; index += 1) {
    difference |= a[index] ^ b[index]
  }

  return difference === 0
}

function validate(body: ChatBody): string | null {
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return 'messages_required'
  }
  if (body.messages.length > MAX_MESSAGES) {
    return 'too_many_messages'
  }

  for (const message of body.messages) {
    if (!message || typeof message !== 'object') return 'invalid_message'
    if (!ALLOWED_ROLES.has(message.role)) return 'invalid_role'
    if (message.role === 'tool' && typeof message.tool_call_id !== 'string') {
      return 'tool_call_id_required'
    }
  }

  if (body.tools !== undefined) {
    if (!Array.isArray(body.tools)) return 'invalid_tools'
    if (body.tools.length > 12) return 'too_many_tools'
    for (const tool of body.tools) {
      if (!tool || tool.type !== 'function' || !tool.function?.name) {
        return 'invalid_tool'
      }
    }
  }

  return null
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const origin = request.headers.get('Origin') ?? ''
    const allowedOrigins = env.ALLOWED_ORIGINS.split(',')
      .map((value) => value.trim())
      .filter(Boolean)

    if (origin && !allowedOrigins.includes(origin)) {
      return jsonResponse({ error: 'origin_not_allowed' }, 403, '')
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) })
    }

    if (url.pathname === '/health' && request.method === 'GET') {
      return jsonResponse({ ok: true, model: env.MODEL }, 200, origin)
    }

    if (url.pathname === '/' && request.method === 'GET') {
      return Response.redirect('https://jvmenjoyer.github.io/', 302)
    }

    if (url.pathname !== '/chat') {
      return jsonResponse({ error: 'not_found' }, 404, origin)
    }

    if (request.method !== 'POST') {
      return jsonResponse({ error: 'method_not_allowed' }, 405, origin)
    }

    const accessCode = request.headers.get('x-athly-code') ?? ''
    if (!(await constantTimeEqual(accessCode, env.ATHLY_ACCESS_CODE))) {
      return jsonResponse({ error: 'forbidden' }, 403, origin)
    }

    let body: ChatBody
    try {
      body = (await request.json()) as ChatBody
    } catch {
      return jsonResponse({ error: 'invalid_json' }, 400, origin)
    }

    const validationError = validate(body)
    if (validationError) {
      return jsonResponse({ error: validationError }, 400, origin)
    }

    const upstreamPayload: Record<string, unknown> = {
      model: env.MODEL,
      messages: body.messages,
      thinking: { type: 'disabled' },
      temperature:
        typeof body.temperature === 'number'
          ? Math.min(Math.max(body.temperature, 0), 1)
          : 0.3,
      max_tokens: Math.min(Math.max(body.max_tokens ?? 900, 1), MAX_TOKENS),
      stream: body.stream === true,
    }

    if (Array.isArray(body.tools) && body.tools.length > 0) {
      upstreamPayload.tools = body.tools.slice(0, 12)
      upstreamPayload.tool_choice =
        body.tool_choice === 'none' ? 'none' : 'auto'
    }

    let upstream: Response
    try {
      upstream = await fetch(env.DEEPSEEK_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(upstreamPayload),
      })
    } catch {
      return jsonResponse({ error: 'upstream_unreachable' }, 502, origin)
    }

    if (!upstream.ok) {
      const detail = (await upstream.text()).slice(0, 500)
      return jsonResponse(
        { error: 'upstream_error', status: upstream.status, detail },
        502,
        origin,
      )
    }

    const headers = corsHeaders(origin)
    headers.set(
      'Content-Type',
      upstream.headers.get('content-type') ?? 'application/json; charset=utf-8',
    )
    headers.set('Cache-Control', 'no-store')
    headers.delete('content-length')
    headers.delete('content-encoding')

    return new Response(upstream.body, {
      status: upstream.status,
      headers,
    })
  },
}
