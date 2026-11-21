import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const DATA_DIR = path.join(ROOT, 'scripts', 'data')
const RAW = path.join(DATA_DIR, 'exercises.raw.json')
const OUT = path.join(ROOT, 'public', 'data', 'exercises.json')
const CACHE = path.join(DATA_DIR, 'translations.google.json')
const ARGOS_CACHE = path.join(DATA_DIR, 'translations.en-ru.json')

const raw = JSON.parse(fs.readFileSync(RAW, 'utf8'))
let cache = {}

if (fs.existsSync(ARGOS_CACHE)) {
  try {
    cache = JSON.parse(fs.readFileSync(ARGOS_CACHE, 'utf8'))
    console.log(`Базовый кэш Argos: ${Object.keys(cache).length}`)
  } catch {
    cache = {}
  }
}

if (fs.existsSync(CACHE)) {
  try {
    const googleCache = JSON.parse(fs.readFileSync(CACHE, 'utf8'))
    cache = { ...cache, ...googleCache }
    console.log(`Кэш Google: ${Object.keys(googleCache).length}`)
  } catch {
    // ignore
  }
}

const allStrings = new Set()
for (const item of raw) {
  if (item.name) allStrings.add(item.name)
  for (const line of item.instructions ?? []) {
    if (line) allStrings.add(line)
  }
}

const missing = [...allStrings].filter((text) => !(text in cache))
console.log(`Строк всего: ${allStrings.size}, осталось перевести: ${missing.length}`)

const batches = []
let current = []
let currentLength = 0

for (const text of missing) {
  const length = encodeURIComponent(text).length
  if (current.length >= 10 || currentLength + length > 3500) {
    if (current.length > 0) batches.push(current)
    current = []
    currentLength = 0
  }
  current.push(text)
  currentLength += length
}
if (current.length > 0) batches.push(current)

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36'

async function translateBatch(batch) {
  const params = new URLSearchParams({
    client: 'dict-chrome-ex',
    sl: 'en',
    tl: 'ru',
  })
  for (const text of batch) params.append('q', text)

  const response = await fetch(
    `https://clients5.google.com/translate_a/t?${params.toString()}`,
    { headers: { 'user-agent': USER_AGENT } },
  )

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }

  const data = await response.json()
  const list = Array.isArray(data) ? data : []

  if (list.length !== batch.length) {
    throw new Error(`Несовпадение количества переводов: ${list.length} vs ${batch.length}`)
  }

  batch.forEach((text, index) => {
    const value = list[index]
    if (typeof value === 'string' && value.trim()) {
      cache[text] = value.trim()
    }
  })
}

let done = 0
let failures = 0

for (const batch of batches) {
  let attempt = 0

  while (attempt < 4) {
    try {
      await translateBatch(batch)
      break
    } catch (error) {
      attempt += 1
      failures += 1
      console.log(`  ошибка (${attempt}/4): ${error.message}`)
      await new Promise((resolve) => setTimeout(resolve, 800 * attempt))
    }
  }

  done += 1
  if (done % 10 === 0 || done === batches.length) {
    console.log(`  ${done}/${batches.length} · строк в кэше: ${Object.keys(cache).length}`)
    fs.writeFileSync(CACHE, JSON.stringify(cache), 'utf8')
  }

  await new Promise((resolve) => setTimeout(resolve, 120))
}

fs.writeFileSync(CACHE, JSON.stringify(cache), 'utf8')

const result = raw.map((item) => ({
  id: item.id,
  nameEn: item.name,
  nameRu: cache[item.name] ?? item.name,
  instructionsEn: item.instructions ?? [],
  instructionsRu: (item.instructions ?? []).map((line) => cache[line] ?? line),
  primaryMuscles: item.primaryMuscles ?? [],
  secondaryMuscles: item.secondaryMuscles ?? [],
  equipment: item.equipment ?? 'body only',
  level: item.level ?? 'beginner',
  mechanic: item.mechanic ?? null,
  force: item.force ?? null,
  category: item.category ?? 'strength',
  images: (item.images ?? []).map((image, frame) => {
    const dir = image.split('/')[0]
    return `/exercises/${dir}/${frame}.webp`
  }),
}))

fs.writeFileSync(OUT, JSON.stringify(result), 'utf8')

console.log(`Готово: ${OUT}`)
console.log(`Переведено строк: ${Object.keys(cache).length}`)
console.log(`Ошибок: ${failures}`)
