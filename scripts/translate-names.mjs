import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const DATA_DIR = path.join(ROOT, 'scripts', 'data')
const CACHE = path.join(DATA_DIR, 'names.ru.json')
const JSON_PATH = path.join(ROOT, 'public', 'data', 'exercises.json')

const exercises = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'))
let cache = {}

if (fs.existsSync(CACHE)) {
  cache = JSON.parse(fs.readFileSync(CACHE, 'utf8'))
  console.log(`Кэш имён: ${Object.keys(cache).length}`)
}

const EMAIL = 'john.sss.16@yandex.ru'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36'

function isBad(value) {
  if (!value || typeof value !== 'string') return true
  const lower = value.toLowerCase()
  return (
    lower.includes('mymemory warning') ||
    lower.includes('quota') ||
    lower.includes('please select two') ||
    lower.includes('invalid') ||
    lower.includes('translation') && lower.includes('not available')
  )
}

let done = 0
let changed = 0
let failures = 0
let quota = false

for (const exercise of exercises) {
  const name = exercise.nameEn
  if (!name) continue

  if (cache[name]) {
    exercise.nameRu = cache[name]
    done += 1
    continue
  }

  if (quota) continue

  try {
    const url =
      'https://api.mymemory.translated.net/get?' +
      new URLSearchParams({
        q: name,
        langpair: 'en|ru',
        de: EMAIL,
      }).toString()

    const response = await fetch(url, { headers: { 'user-agent': USER_AGENT } })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const data = await response.json()

    if (data.quotaFinished) {
      console.log('Квота MyMemory закончилась, остальные имена оставляю как есть')
      quota = true
    } else {
      const translated = data?.responseData?.translatedText
      if (!isBad(translated)) {
        cache[name] = translated.trim()
        exercise.nameRu = cache[name]
        changed += 1
      } else {
        failures += 1
      }
    }
  } catch (error) {
    failures += 1
    console.log(`  ошибка "${name}": ${error.message}`)
  }

  done += 1
  if (done % 25 === 0) {
    console.log(`  ${done}/${exercises.length} · переведено ${changed} · ошибок ${failures}`)
    fs.writeFileSync(CACHE, JSON.stringify(cache), 'utf8')
  }

  await new Promise((resolve) => setTimeout(resolve, 350))
}

fs.writeFileSync(CACHE, JSON.stringify(cache), 'utf8')
fs.writeFileSync(JSON_PATH, JSON.stringify(exercises), 'utf8')

console.log(`Готово. Имён в кэше: ${Object.keys(cache).length}`)
console.log(`Новых переводов: ${changed}, ошибок: ${failures}`)
