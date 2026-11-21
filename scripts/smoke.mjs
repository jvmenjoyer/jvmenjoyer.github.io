import { chromium } from 'playwright'

const BASE = process.env.SMOKE_URL ?? 'http://localhost:4175'
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const SHOT_DIR = 'C:/Users/anatoliy777/AppData/Local/Temp/opencode'

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

async function bodyText() {
  return normalize(await page.textContent('body'))
}

function assertIncludes(text, needle, message) {
  if (!text.includes(needle)) throw new Error(message ?? `Не найдено: ${needle}`)
}

await page.goto(BASE, { waitUntil: 'networkidle', timeout: 120000 })
await page.getByRole('heading', { name: 'Сегодня', exact: true }).waitFor({ timeout: 60000 })
await page.waitForTimeout(1500)

let text = await bodyText()
assertIncludes(text, 'Следующая тренировка', 'Нет блока следующей тренировки')
assertIncludes(text, 'За неделю')

// Упражнения
await page.goto(`${BASE}/#/exercises`, { waitUntil: 'networkidle' })
await page.getByRole('heading', { name: 'Упражнения', exact: true }).waitFor()
await page.waitForTimeout(800)
text = await bodyText()
assertIncludes(text, '876 в базе', 'База упражнений не загрузилась')

await page.getByPlaceholder('Поиск упражнения').fill('Barbell')
await page.waitForTimeout(400)
await page.locator('main button').filter({ has: page.locator('img') }).first().click()
await page.getByText('Начать с этим упражнением').waitFor({ timeout: 20000 })
text = await bodyText()
assertIncludes(text, 'Техника')
assertIncludes(text, 'Мышцы')
await page.screenshot({ path: `${SHOT_DIR}/athly-exercise.png`, fullPage: true })

// Программы
await page.goto(`${BASE}/#/programs`, { waitUntil: 'networkidle' })
await page.getByRole('heading', { name: 'Программы', exact: true }).waitFor()
await page.waitForTimeout(500)
text = await bodyText()
assertIncludes(text, 'Full Body 3×', 'Нет готовых программ')
assertIncludes(text, 'StrongLifts 5×5')

await page.getByText('Full Body 3×', { exact: true }).first().click()
await page.getByRole('button', { name: 'Начать', exact: true }).first().waitFor()
await page.getByRole('button', { name: 'Начать', exact: true }).first().click()
await page.waitForFunction(() => window.location.hash.startsWith('#/workout/'), null, {
  timeout: 20000,
})
await page.getByRole('button', { name: 'Завершить', exact: true }).waitFor()

await page.getByLabel('Вес').first().fill('100')
await page.getByLabel('Повторы').first().fill('5')
await page.getByRole('button', { name: 'Добавить подход' }).first().click()
await page.getByLabel('Подход выполнен').first().click()
await page.getByText('Отдых ·', { exact: false }).first().waitFor({ timeout: 5000 })
await page.waitForTimeout(300)
await page.screenshot({ path: `${SHOT_DIR}/athly-workout.png`, fullPage: true })

await page.getByRole('button', { name: 'Завершить', exact: true }).click()
await page.waitForFunction(() => window.location.hash.startsWith('#/workouts/'), null, {
  timeout: 20000,
})
await page.getByText('Тоннаж').waitFor()
text = await bodyText()
assertIncludes(text, '500', 'Тоннаж не посчитался')
await page.screenshot({ path: `${SHOT_DIR}/athly-workout-detail.png`, fullPage: true })

// Календарь
await page.goto(`${BASE}/#/calendar`, { waitUntil: 'networkidle' })
await page.getByRole('heading', { name: 'Календарь', exact: true }).waitFor()
await page.waitForTimeout(500)
text = await bodyText()
assertIncludes(text, 'Full Body', 'Тренировка не попала в календарь')

// Замеры
await page.goto(`${BASE}/#/measurements`, { waitUntil: 'networkidle' })
await page.getByRole('heading', { name: 'Замеры', exact: true }).waitFor()
await page.getByRole('button', { name: 'Добавить' }).first().click()
await page.getByLabel('Вес, кг').fill('80,5')
await page.getByRole('button', { name: 'Сохранить' }).click()
await page.waitForTimeout(600)
text = await bodyText()
assertIncludes(text, 'Текущий вес', 'Замер не сохранился')
assertIncludes(text, '80,5')
await page.screenshot({ path: `${SHOT_DIR}/athly-measurements.png`, fullPage: true })

// Прогресс и настройки
await page.goto(`${BASE}/#/progress`, { waitUntil: 'networkidle' })
await page.getByRole('heading', { name: 'Прогресс', exact: true }).waitFor()
text = await bodyText()
assertIncludes(text, 'Рекорды')

// Калькуляторы
await page.goto(`${BASE}/#/tools`, { waitUntil: 'networkidle' })
await page.getByRole('heading', { name: 'Калькуляторы', exact: true }).waitFor()
text = await bodyText()
assertIncludes(text, 'Максимум на один повтор', 'Нет калькулятора 1ПМ')
assertIncludes(text, 'Блины на штангу', 'Нет калькулятора блинов')
assertIncludes(text, 'Разминочные подходы', 'Нет калькулятора разминки')

await page.goto(`${BASE}/#/settings`, { waitUntil: 'networkidle' })
await page.getByRole('heading', { name: 'Настройки', exact: true }).waitFor()
text = await bodyText()
assertIncludes(text, '876', 'В настройках нет количества упражнений')
assertIncludes(text, 'Автостарт таймера', 'Нет настройки таймера отдыха')
assertIncludes(text, 'Автопрогрессия', 'Нет настройки автопрогрессии')
assertIncludes(text, 'Создать копию сейчас', 'Нет автобэкапа')
await page.getByRole('button', { name: /Создать копию сейчас/ }).click()
await page.getByText('Копия создана').waitFor({ timeout: 10000 })
await page.waitForTimeout(300)
text = await bodyText()
assertIncludes(text, 'Резервные копии', 'Копия не появилась в списке')

await page.goto(BASE, { waitUntil: 'networkidle' })
await page.getByRole('heading', { name: 'Сегодня', exact: true }).waitFor()
await page.screenshot({ path: `${SHOT_DIR}/athly-home.png`, fullPage: true })

await browser.close()

if (errors.length > 0) {
  console.error('Ошибки в браузере:')
  for (const error of errors) console.error(' -', error)
  process.exit(1)
}

console.log('ATHLY SMOKE OK: база, программы, тренировка, календарь, замеры и прогресс работают')

