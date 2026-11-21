import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const DATA_PATH = path.join(ROOT, 'public', 'data', 'exercises.json')
const CACHE_PATH = path.join(ROOT, 'scripts', 'data', 'translations.deepseek.json')
const CATALOG_PATH = path.join(ROOT, 'src', 'db', 'catalog.ts')
const ENV_PATH = path.join(ROOT, '.env.local')
const API_URL = 'https://api.deepseek.com/chat/completions'

function readEnv(name) {
  if (process.env[name]) return process.env[name]
  if (!fs.existsSync(ENV_PATH)) return ''
  const raw = fs.readFileSync(ENV_PATH, 'utf8').replace(/^\uFEFF/, '')
  const match = raw.match(new RegExp(`^${name}=(.+)$`, 'm'))
  return match ? match[1].trim() : ''
}

const key = readEnv('DEEPSEEK_API_KEY')
if (!key || key === 'PASTE_KEY_HERE') {
  console.error(
    'Нет ключа DeepSeek. Откройте .env.local и замените PASTE_KEY_HERE на ключ из platform.deepseek.com.',
  )
  process.exit(1)
}

const exercises = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'))
let cache = {}

if (fs.existsSync(CACHE_PATH)) {
  cache = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'))
  console.log(`Кэш переводов: ${Object.keys(cache).length}`)
}

const allNames = [...new Set(exercises.map((exercise) => exercise.nameEn))]
const missing = allNames.filter((name) => !cache[name])
console.log(`Названий: ${allNames.length}, осталось: ${missing.length}`)

const GLOSSARY = `
Barbell → штанга; dumbbell → гантели; cable → блок; machine → тренажёр;
bodyweight → с собственным весом; kettlebell → гиря; band → резинка.
Squat → приседания; front squat → фронтальные приседания; hack squat → гакк-приседания;
deadlift → становая тяга; Romanian deadlift → румынская становая тяга; sumo deadlift → становая тяга сумо.
Bench press → жим лёжа; incline bench press → жим лёжа на наклонной; close-grip bench press → жим лёжа узким хватом.
Overhead press / military press / shoulder press → жим над головой / жим стоя / жим на плечи.
Row → тяга; bent-over row → тяга в наклоне; seated cable row → тяга нижнего блока; T-bar row → тяга Т-грифа.
Pulldown → тяга верхнего блока; pull-up → подтягивания; chin-up → подтягивания обратным хватом.
Pushdown → разгибание на блоке; extension → разгибание; curl → сгибание; fly / flyes → разведения;
raise → подъём / махи; lateral raise → махи в стороны; front raise → подъём перед собой; shrug → шраги.
Leg press → жим ногами; leg extension → разгибание ног; leg curl → сгибание ног; calf raise → подъёмы на носки.
Lunge → выпады; split squat → болгарские выпады; step-up → зашагивания; hip thrust → ягодичный мост.
Crunch → скручивания; plank → планка; leg raise → подъём ног; dip → отжимания на брусьях; push-up → отжимания от пола.
Good morning → наклоны со штангой; clean → взятие на грудь; snatch → рывок; jerk → толчок.
Grip → хват; wide-grip → широким хватом; close-grip → узким хватом; medium-grip → средним хватом.
`

const SYSTEM_PROMPT = `Ты — профессиональный русскоязычный тренер и переводчик фитнес-терминов.
Переведи названия упражнений на естественный русский язык, который используют в тренажёрном зале.
Правила:
- Используй общепринятую русскую терминологию, а не транслитерацию.
- Сохраняй важные уточнения: хват, наклон, вариант, инвентарь.
- Не добавляй пояснений и не меняй смысл.
- Верни СТРОГО валидный JSON без markdown: {"translations":{"English name":"Русское название"}}.
Глоссарий:
${GLOSSARY}`

async function translateBatch(names) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'deepseek-flash',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: JSON.stringify({ names }),
        },
      ],
      thinking: { type: 'disabled' },
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: 4000,
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`DeepSeek ${response.status}: ${body.slice(0, 300)}`)
  }

  const data = await response.json()
  const content = data?.choices?.[0]?.message?.content
  if (!content) throw new Error('Пустой ответ DeepSeek')

  let parsed
  try {
    parsed = JSON.parse(content)
  } catch {
    throw new Error(`Ответ не JSON: ${content.slice(0, 200)}`)
  }

  const translations = parsed.translations ?? parsed
  if (!translations || typeof translations !== 'object') {
    throw new Error('В ответе нет объекта translations')
  }

  const accepted = 0
  for (const name of names) {
    const value = translations[name]
    if (typeof value === 'string' && value.trim() && !/[A-Za-z]{4,}/.test(value)) {
      cache[name] = value.trim()
    }
  }

  return data?.usage?.total_tokens ?? 0
}

const BATCH_SIZE = 80
let totalTokens = 0

for (let index = 0; index < missing.length; index += BATCH_SIZE) {
  const batch = missing.slice(index, index + BATCH_SIZE)
  let attempt = 0

  while (attempt < 3) {
    attempt += 1
    try {
      totalTokens += await translateBatch(batch)
      break
    } catch (error) {
      console.error(`  попытка ${attempt} не удалась: ${error.message}`)
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt))
    }
  }

  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache), 'utf8')
  console.log(
    `  ${Math.min(index + BATCH_SIZE, missing.length)}/${missing.length} · кэш ${Object.keys(cache).length} · токенов ${totalTokens}`,
  )
  await new Promise((resolve) => setTimeout(resolve, 250))
}

const unresolved = allNames.filter((name) => !cache[name])
if (unresolved.length > 0) {
  console.warn(`Не переведено: ${unresolved.length}`)
  console.warn(unresolved.slice(0, 20).join('\n'))
}

let updated = 0
for (const exercise of exercises) {
  const translated = cache[exercise.nameEn]
  if (translated) {
    exercise.nameRu = translated
    updated += 1
  }
}

fs.writeFileSync(DATA_PATH, JSON.stringify(exercises), 'utf8')

const catalog = fs.readFileSync(CATALOG_PATH, 'utf8')
const nextCatalog = catalog.replace(
  /const CATALOG_VERSION = '[^']*'/,
  "const CATALOG_VERSION = 'ru-llm-1'",
)
if (nextCatalog !== catalog) fs.writeFileSync(CATALOG_PATH, nextCatalog, 'utf8')

console.log('')
console.log(`Готово: ${updated} названий обновлено`)
console.log(`Токенов потрачено: ${totalTokens}`)
console.log('Следующий шаг: npm run build && npm run deploy')
