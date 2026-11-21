// Собирает public/data/exercises.json из ядра (~200 упражнений).
//
// Полная база (876) сохраняется в scripts/data/exercises.full.json —
// оттуда можно вернуть всё обратно: npm run art:catalog -- --all
//
// Запуск:
//   npm run art:catalog
//   npm run art:catalog -- --all

import fs from 'node:fs'
import path from 'node:path'
import { CORE_EXERCISES } from './core-exercises.mjs'

const ROOT = path.resolve(import.meta.dirname, '..', '..')
const FULL_FILE = path.join(ROOT, 'scripts', 'data', 'exercises.full.json')
const OUT_FILE = path.join(ROOT, 'public', 'data', 'exercises.json')
const CATALOG_FILE = path.join(ROOT, 'src', 'db', 'catalog.ts')

const restoreAll = process.argv.includes('--all')
const dry = process.argv.includes('--dry')

fs.mkdirSync(path.dirname(FULL_FILE), { recursive: true })

// Источник правды — полная база. Если её ещё нет, забираем текущий каталог
// (он на этом шаге ещё полный) и сохраняем копию.
if (!fs.existsSync(FULL_FILE)) {
  const current = JSON.parse(fs.readFileSync(OUT_FILE, 'utf8'))
  fs.writeFileSync(FULL_FILE, JSON.stringify(current), 'utf8')
  console.log(`Сохранил полную базу: ${current.length} упражнений → ${FULL_FILE}`)
}

const full = JSON.parse(fs.readFileSync(FULL_FILE, 'utf8'))
const byId = new Map(full.map((exercise) => [exercise.id, exercise]))

const missing = CORE_EXERCISES.filter((id) => !byId.has(id))
if (missing.length) {
  console.error(`В полной базе нет ${missing.length} id из ядра:`)
  for (const id of missing) console.error(`  ${id}`)
  process.exit(1)
}

const core = CORE_EXERCISES.map((id) => {
  const exercise = byId.get(id)
  // В переводе часть названий пришла со строчной буквы — приводим к нормальному виду.
  const nameRu = exercise.nameRu
    ? exercise.nameRu.charAt(0).toUpperCase() + exercise.nameRu.slice(1)
    : exercise.nameRu
  return { ...exercise, nameRu }
})
const next = restoreAll ? full : core
const payload = JSON.stringify(next)
const previous = fs.readFileSync(OUT_FILE, 'utf8')

console.log(
  restoreAll
    ? `Возвращаю полную базу: ${next.length} упражнений`
    : `Ядро: ${next.length} упражнений (из ${full.length})`,
)

if (payload === previous) {
  console.log('Каталог не изменился, версию не трогаю.')
  process.exit(0)
}

if (dry) {
  console.log('Пробный запуск: файл не перезаписан.')
  process.exit(0)
}

fs.writeFileSync(OUT_FILE, payload, 'utf8')

const code = fs.readFileSync(CATALOG_FILE, 'utf8')
const currentVersion = code.match(/const CATALOG_VERSION = '([^']+)'/)?.[1] ?? ''
// Номер берём из любого префикса (core-N / art-N), чтобы версии не совпали
// после переключения между сборкой каталога и импортом иллюстраций.
const previousNumber = Number(currentVersion.match(/(\d+)$/)?.[1] ?? 0)
const nextVersion = `core-${previousNumber + 1}`

fs.writeFileSync(
  CATALOG_FILE,
  code.replace(/const CATALOG_VERSION = '[^']*'/, `const CATALOG_VERSION = '${nextVersion}'`),
  'utf8',
)

console.log(`CATALOG_VERSION: ${currentVersion} → ${nextVersion}`)
console.log('Дальше: npm run build && npm run deploy')
