import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const ROOT = path.resolve(import.meta.dirname, '..')
const DATA_DIR = path.join(ROOT, 'scripts', 'data')
const OUT_IMAGES = path.join(ROOT, 'public', 'exercises')
const OUT_JSON = path.join(ROOT, 'public', 'data', 'exercises.json')
const RAW_JSON = path.join(DATA_DIR, 'exercises.raw.json')
const BASE_IMAGES =
  'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises'

fs.mkdirSync(DATA_DIR, { recursive: true })
fs.mkdirSync(OUT_IMAGES, { recursive: true })
fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true })

async function loadRaw() {
  if (fs.existsSync(RAW_JSON)) {
    return JSON.parse(fs.readFileSync(RAW_JSON, 'utf8'))
  }

  console.log('Скачиваю базу упражнений…')
  const response = await fetch(
    'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json',
  )
  if (!response.ok) throw new Error(`Не удалось скачать JSON: ${response.status}`)
  const data = await response.json()
  fs.writeFileSync(RAW_JSON, JSON.stringify(data), 'utf8')
  console.log(`Получено упражнений: ${data.length}`)
  return data
}

async function downloadImage(url, destination) {
  if (fs.existsSync(destination)) return true

  try {
    const response = await fetch(url)
    if (!response.ok) return false
    const buffer = Buffer.from(await response.arrayBuffer())
    const webp = await sharp(buffer)
      .resize({ width: 480, withoutEnlargement: true })
      .webp({ quality: 68 })
      .toBuffer()

    fs.writeFileSync(destination.replace(/\.jpg$/, '.webp'), webp)
    return true
  } catch (error) {
    console.error('Ошибка картинки', url, error.message)
    return false
  }
}

async function pool(items, limit, worker) {
  let index = 0
  const runners = Array.from({ length: limit }, async () => {
    while (index < items.length) {
      const current = index++
      await worker(items[current], current)
    }
  })
  await Promise.all(runners)
}

const raw = await loadRaw()

const normalized = raw.map((item) => ({
  id: item.id,
  nameEn: item.name,
  nameRu: item.name,
  instructionsEn: item.instructions ?? [],
  instructionsRu: item.instructions ?? [],
  primaryMuscles: item.primaryMuscles ?? [],
  secondaryMuscles: item.secondaryMuscles ?? [],
  equipment: item.equipment ?? 'body only',
  level: item.level ?? 'beginner',
  mechanic: item.mechanic ?? null,
  force: item.force ?? null,
  category: item.category ?? 'strength',
  images: (item.images ?? []).map((image, frameIndex) => {
    const dir = image.split('/')[0]
    return `/exercises/${dir}/${frameIndex}.webp`
  }),
}))

fs.writeFileSync(OUT_JSON, JSON.stringify(normalized), 'utf8')
console.log(`JSON сохранён: ${normalized.length} упражнений`)

const jobs = []
for (const item of raw) {
  for (let frame = 0; frame < (item.images ?? []).length; frame += 1) {
    const relative = item.images[frame]
    const dir = relative.split('/')[0]
    jobs.push({
      url: `${BASE_IMAGES}/${relative}`,
      destination: path.join(OUT_IMAGES, dir, `${frame}.webp`),
      dir,
      frame,
    })
  }
}

console.log(`Картинок к обработке: ${jobs.length}`)
let done = 0
let failed = 0

for (const job of jobs) {
  const folder = path.join(OUT_IMAGES, job.dir)
  if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true })
}

await pool(jobs, 8, async (job) => {
  const ok = await downloadImage(job.url, job.destination.replace(/\.webp$/, '.jpg'))
  done += 1
  if (!ok) failed += 1
  if (done % 50 === 0) console.log(`  ${done}/${jobs.length} (ошибок: ${failed})`)
})

console.log(`Готово: ${done - failed} картинок, ошибок: ${failed}`)
