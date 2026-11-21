import { execSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const REPO = 'https://github.com/jvmenjoyer/jvmenjoyer.github.io.git'
const REMOTE = REPO.replace(
  'https://github.com/',
  'https://x-access-token:__TOKEN__@github.com/',
)
const TEMP = path.join(os.tmpdir(), 'athly-pages-deploy')

function run(command, cwd = ROOT) {
  console.log(`$ ${command.replace(/x-access-token:[^@]+@/, 'x-access-token:***@')}`)
  execSync(command, { cwd, stdio: 'inherit' })
}

function resolveGh() {
  if (process.platform === 'win32' && process.env.LOCALAPPDATA) {
    const candidate = path.join(process.env.LOCALAPPDATA, 'gh', 'bin', 'gh.exe')
    if (fs.existsSync(candidate)) return `"${candidate}"`
  }
  return 'gh'
}

run('npm run build')

fs.rmSync(TEMP, { recursive: true, force: true })
fs.mkdirSync(TEMP, { recursive: true })
fs.cpSync(path.join(ROOT, 'dist'), TEMP, { recursive: true })
fs.writeFileSync(path.join(TEMP, '.nojekyll'), '')

const token = execSync(`${resolveGh()} auth token`, { encoding: 'utf8' }).trim()
if (!token) throw new Error('Не удалось получить GitHub-токен. Выполните: gh auth login')

run('git init -q', TEMP)
run('git branch -M gh-pages', TEMP)
run('git add -A', TEMP)
run('git -c core.autocrlf=false commit -q -m "Deploy Athly"', TEMP)
run(`git remote add origin ${REMOTE.replace('__TOKEN__', token)}`, TEMP)
run('git push --force origin gh-pages', TEMP)

console.log('')
console.log('Готово: https://jvmenjoyer.github.io/')
