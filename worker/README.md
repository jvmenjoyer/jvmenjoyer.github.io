# Athly Coach Worker

Маленький прокси между приложением Athly и DeepSeek. Ключ DeepSeek хранится
только в секретах Cloudflare и никогда не попадает в клиент.

## Что делает

- `POST /chat` — проксирует запрос в `https://api.deepseek.com/chat/completions`.
- `GET /health` — проверка.
- Проверяет заголовок `x-athly-code`.
- Ограничивает CORS, размер истории, `max_tokens` и набор инструментов.
- Прокидывает streaming-ответ как есть.

## Переменные

Секреты (через `wrangler secret put`):

- `DEEPSEEK_API_KEY` — ключ DeepSeek.
- `ATHLY_ACCESS_CODE` — код доступа из `.env.local`.

Публичные `vars` в `wrangler.jsonc`: модель, URL провайдера, разрешённые origin.

## Запуск

```bash
npx wrangler login
npx wrangler secret put DEEPSEEK_API_KEY --config worker/wrangler.jsonc
npx wrangler secret put ATHLY_ACCESS_CODE --config worker/wrangler.jsonc
npx wrangler deploy --config worker/wrangler.jsonc
```

Локально:

```bash
# worker/.dev.vars (не коммитить)
DEEPSEEK_API_KEY=sk-...
ATHLY_ACCESS_CODE=athly-...

npx wrangler dev --config worker/wrangler.jsonc
```
