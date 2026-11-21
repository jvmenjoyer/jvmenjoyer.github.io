// Импорт нарисованных иллюстраций упражнений.
//
// Ожидает файлы вида:  <Exercise_ID>__0.png, <Exercise_ID>__1.png
// Например:           Barbell_Squat__0.png
//
// Что делает:
//   1. конвертирует в WebP шириной 720 (прозрачность не нужна);
//   2. кладёт в public/exercises/<id>/<frame>-art<N>.webp,
//      чтобы Service Worker не отдавал старые фото из кеша;
//   3. обновляет public/data/exercises.json;
//   4. поднимает CATALOG_VERSION в src/db/catalog.ts,
//      иначе у пользователей останется старая база в IndexedDB.
//
// Использование:
//   npm run art:import -- --src "C:\Users\me\Downloads\athly-art"
//   npm run art:import -- --src ./incoming --version 2 --quality 82
//   npm run art:import -- --src ./incoming --dry

import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const ROOT = path.resolve(import.meta.dirname, '..', '..')
const BATCH_FILE = path.join(ROOT, 'scripts', 'art', 'batch-1.json')
const JSON_FILE = path.join(ROOT, 'public', 'data', 'exercises.json')
const IMAGES_DIR = path.join(ROOT, 'public', 'exercises')
const CATALOG_FILE = path.join(ROOT, 'src', 'db', 'catalog.ts')

function arg(name, fallback) {
  const index = process.argv.indexOf(`--${name}`)
  if (index === -1) return fallback
  const value = process.argv[index + 1]
  if (!value || value.startsWith('--')) return fallback
  return value
}

function flag(name) {
  return process.argv.includes(`--${name}`)
}

const srcDir = path.resolve(arg('src', path.join(ROOT, 'scripts', 'art', 'incoming')))
const dry = flag('dry')
const quality = Number(arg('quality', 78))
const width = Number(arg('width', 720))

if (!fs.existsSync(srcDir)) {
  console.error(`Нет папки с исходниками: ${srcDir}`)
  console.error('Укажи её: npm run art:import -- --src "<папка>"')
  process.exit(1)
}

const batch = JSON.parse(fs.readFileSync(BATCH_FILE, 'utf8'))
const catalog = JSON.parse(fs.readFileSync(JSON_FILE, 'utf8'))
const catalogCode = fs.readFileSync(CATALOG_FILE, 'utf8')
const versionMatch = catalogCode.match(/const CATALOG_VERSION = '([^']+)'/)
const currentVersion = versionMatch?.[1] ?? ''

let artVersion = Number(arg('version', 0))
if (!artVersion) {
  const previous = currentVersion.match(/^art-(\d+)$/)
  artVersion = previous ? Number(previous[1]) + 1 : 1
}

const EXT = /\.(png|jpe?g|webp)$/i
const ID_PATTERN = /^(?<id>.+)__(?<frame>\d+)$/

function walk(dir) {
  const out = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(full))
    else if (EXT.test(entry.name)) out.push(full)
  }
  return out
}

const byLowerId = new Map(batch.items.map((item) => [item.id.toLowerCase(), item]))
const files = walk(srcDir)
const found = new Map()
const unknown = []
const badName = []

for (const file of files) {
  const base = path.basename(file, path.extname(file))
  const match = base.match(ID_PATTERN)
  if (!match?.groups) {
    badName.push(path.basename(file))
    continue
  }

  const item = byLowerId.get(match.groups.id.toLowerCase())
  if (!item) {
    unknown.push(path.basename(file))
    continue
  }

  if (!found.has(item.id)) found.set(item.id, new Map())
  found.get(item.id).set(Number(match.groups.frame), file)
}

const ready = []
const incomplete = []

for (const item of batch.items) {
  const frames = found.get(item.id)
  if (!frames) continue

  const needed = item.frames === 1 ? [0] : [0, 1]
  const missing = needed.filter((frame) => !frames.has(frame))
  if (missing.length) {
    incomplete.push({ item, missing, have: [...frames.keys()] })
    continue
  }
  ready.push({ item, frames })
}

console.log(`Исходники: ${srcDir}`)
console.log(`Найдено файлов: ${files.length}, узнано упражнений: ${found.size}`)
console.log(`Готово к импорту: ${ready.length} из ${batch.items.length}`)
console.log(`Версия иллюстраций: art-${artVersion}${dry ? ' (пробный запуск)' : ''}`)

if (badName.length) {
  console.log(`\nНе понял имена файлов (нужно <ID>__0.png): ${badName.length}`)
  for (const name of badName.slice(0, 10)) console.log(`  ${name}`)
}

if (unknown.length) {
  console.log(`\nНе из этого батча (пропущены): ${unknown.length}`)
  for (const name of unknown.slice(0, 10)) console.log(`  ${name}`)
}

if (incomplete.length) {
  console.log(`\nНе хватает кадров: ${incomplete.length}`)
  for (const { item, missing, have } of incomplete) {
    console.log(`  ${item.id}: нет ${missing.join(', ')} (есть: ${have.join(', ') || '—'})`)
  }
}

const notStarted = batch.items.filter((item) => !found.has(item.id))
if (notStarted.length) {
  console.log(`\nЕщё не нарисовано: ${notStarted.length}`)
  for (const item of notStarted) console.log(`  ${item.id} — ${item.nameRu}`)
}

if (!ready.length) {
  console.log('\nНечего импортировать.')
  process.exit(0)
}

if (!dry) {
  for (const { item, frames } of ready) {
    const dir = path.join(IMAGES_DIR, item.id)
    fs.mkdirSync(dir, { recursive: true })

    const needed = item.frames === 1 ? [0] : [0, 1]
    const paths = []

    for (const frame of needed) {
      const source = frames.get(frame) ?? frames.get(0)
      const target = path.join(dir, `${frame}-art${artVersion}.webp`)
      const buffer = await sharp(source)
        .resize({ width, withoutEnlargement: false })
        .webp({ quality, effort: 6 })
        .toBuffer()
      fs.writeFileSync(target, buffer)
      paths.push(`/exercises/${item.id}/${frame}-art${artVersion}.webp`)
    }

    const entry = catalog.find((exercise) => exercise.id === item.id)
    if (!entry) {
      console.warn(`  ! нет в exercises.json: ${item.id}`)
      continue
    }
    entry.images = item.frames === 1 ? [paths[0], paths[0]] : paths
    console.log(`  ✓ ${item.id} — ${paths.length} кадр(а)`)
  }

  fs.writeFileSync(JSON_FILE, JSON.stringify(catalog), 'utf8')

  const nextVersion = `art-${artVersion}`
  if (currentVersion !== nextVersion) {
    fs.writeFileSync(
      CATALOG_FILE,
      catalogCode.replace(
        /const CATALOG_VERSION = '[^']*'/,
        `const CATALOG_VERSION = '${nextVersion}'`,
      ),
      'utf8',
    )
  }

  const total = fs
    .readdirSync(IMAGES_DIR, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.includes(`-art${artVersion}`))
    .reduce(
      (sum, entry) =>
        sum + fs.statSync(path.join(entry.parentPath ?? entry.path, entry.name)).size,
      0,
    )

  console.log(`\nИмпортировано: ${ready.length} упражнений, ${(total / 1024).toFixed(0)} КБ`)
  console.log(`CATALOG_VERSION: ${currentVersion} → ${nextVersion}`)
  console.log('\nДальше: npm run build && npm run deploy')
}
