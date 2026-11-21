import fs from 'node:fs'
import { chromium } from 'playwright'

const BASE = process.env.SMOKE_URL ?? 'http://localhost:4176'
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const SHOT_DIR = 'C:/Users/anatoliy777/AppData/Local/Temp/opencode'

const env = fs.readFileSync('.env.local', 'utf8')
const accessCode = (env.match(/^ATHLY_ACCESS_CODE=(.+)$/m) ?? [])[1]?.trim()
if (!accessCode) throw new Error('Нет ATHLY_ACCESS_CODE в .env.local')

const errors = []
const browser = await chromium.launch({ executablePath: EDGE, headless: true })
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  serviceWorkers: 'block',
  locale: 'ru-RU',
})
const page = await context.newPage()
page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`))
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(`console: ${message.text()}`)
})
page.on('dialog', (dialog) => dialog.accept())

const normalize = (value) => (value ?? '').replace(/[\u00a0\u202f]/g, ' ')

await page.goto(`${BASE}/#/coach`, { waitUntil: 'networkidle', timeout: 120000 })
await page.getByRole('heading', { name: 'Тренер', exact: true }).waitFor({ timeout: 60000 })
await page.waitForTimeout(1000)

await page.getByRole('button', { name: 'Настроить' }).click()
await page.getByLabel('Код доступа').fill(accessCode)
await page.getByRole('button', { name: 'Сохранить' }).click()
await page.getByPlaceholder('Спроси тренера…').waitFor({ timeout: 15000 })
await page.waitForTimeout(500)

async function send(text) {
  await page.getByPlaceholder('Спроси тренера…').fill(text)
  await page.getByRole('button', { name: 'Отправить' }).click()
  await page.getByText('Думаю…').waitFor({ timeout: 15000 }).catch(() => {})
}

// 1. Программа через чат
await send(
  'Составь программу на 2 дня. День A: приседания со штангой, жим лёжа. День B: становая тяга, подтягивания. По 3 подхода 8-10 повторений. Назови программу «Тест тренера».',
)

try {
  await page.getByRole('button', { name: 'Применить' }).waitFor({ timeout: 180000 })
} catch {
  const body = normalize(await page.textContent('body'))
  console.log('NO ACTION. BODY:', body.slice(-2000))
  throw new Error('Тренер не предложил программу')
}

await page.screenshot({ path: `${SHOT_DIR}/athly-coach-program.png`, fullPage: true })
await page.getByRole('button', { name: 'Применить' }).click()
await page.waitForFunction(() => window.location.hash.startsWith('#/programs/'), null, {
  timeout: 20000,
})
await page.getByText('Тест тренера').first().waitFor()
console.log('PROGRAM CREATED')

// 2. Замер через чат
await page.goto(`${BASE}/#/coach`, { waitUntil: 'networkidle' })
await page.getByPlaceholder('Спроси тренера…').waitFor()
await send('Запиши мой вес 80 кг на сегодня.')

try {
  await page.getByRole('button', { name: 'Применить' }).waitFor({ timeout: 180000 })
} catch {
  const body = normalize(await page.textContent('body'))
  console.log('NO MEASURE ACTION. BODY:', body.slice(-2000))
  throw new Error('Тренер не предложил замер')
}

await page.getByRole('button', { name: 'Применить' }).click()
await page.waitForFunction(() => window.location.hash.startsWith('#/measurements'), null, {
  timeout: 20000,
})
await page.getByText('Текущий вес').waitFor()
const measureBody = normalize(await page.textContent('body'))
if (!measureBody.includes('80')) throw new Error('Замер не сохранился')
console.log('MEASUREMENT SAVED')

// 3. История чата
await page.goto(`${BASE}/#/coach`, { waitUntil: 'networkidle' })
await page.getByPlaceholder('Спроси тренера…').waitFor()
const chatBody = normalize(await page.textContent('body'))
if (!chatBody.includes('Составь программу')) throw new Error('История чата не сохранилась')
console.log('CHAT HISTORY OK')
await page.screenshot({ path: `${SHOT_DIR}/athly-coach.png`, fullPage: true })

await browser.close()

if (errors.length > 0) {
  console.error('Ошибки в браузере:')
  for (const error of errors) console.error(' -', error)
  process.exit(1)
}

console.log('COACH SMOKE OK')
