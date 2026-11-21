import { db } from './db'
import { buildBackup, importBackupJson } from './backup'
import type { BackupSnapshot } from './types'
import { newId, nowISO } from '@/lib/id'

export const AUTO_BACKUP_INTERVAL_MS = 24 * 60 * 60 * 1000
export const MAX_BACKUP_SNAPSHOTS = 8

export async function listBackupSnapshots(): Promise<BackupSnapshot[]> {
  const list = await db.backups.toArray()
  return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function createBackupSnapshot(reason: string): Promise<BackupSnapshot> {
  const payload = await buildBackup()
  const snapshot: BackupSnapshot = {
    id: newId(),
    createdAt: nowISO(),
    reason,
    json: JSON.stringify(payload),
  }

  await db.backups.put(snapshot)

  const all = await listBackupSnapshots()
  const stale = all.slice(MAX_BACKUP_SNAPSHOTS)
  if (stale.length > 0) {
    await db.backups.bulkDelete(stale.map((item) => item.id))
  }

  return snapshot
}

export async function maybeAutoBackup(reason: string): Promise<BackupSnapshot | null> {
  const [latest] = await listBackupSnapshots()
  if (latest) {
    const age = Date.now() - new Date(latest.createdAt).getTime()
    if (age >= 0 && age < AUTO_BACKUP_INTERVAL_MS) return null
  }

  return createBackupSnapshot(reason)
}

export async function restoreBackupSnapshot(id: string): Promise<void> {
  const snapshot = await db.backups.get(id)
  if (!snapshot) throw new Error('Копия не найдена')
  await importBackupJson(snapshot.json)
}

export async function deleteBackupSnapshot(id: string): Promise<void> {
  await db.backups.delete(id)
}

export function formatBackupSize(json: string): string {
  const bytes = new Blob([json]).size
  if (bytes < 1024) return `${bytes} Б`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} КБ`
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`
}
