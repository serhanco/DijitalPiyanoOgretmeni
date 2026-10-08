import { db } from '../progress/db'
import type { Backup } from './backup'

const PROFILE_KEY = 'profile'
const SETTINGS_KEY = 'dpo-settings'

/** Read the whole progress from IndexedDB and localStorage. */
export async function collectBackup(): Promise<Backup> {
  const [profile, sessions, noteStats] = await Promise.all([
    db.kv.get(PROFILE_KEY),
    db.sessions.orderBy('at').toArray(),
    db.noteStats.toArray(),
  ])
  return {
    v: 1,
    at: Date.now(),
    build: __APP_BUILD__,
    profile: profile?.value ?? null,
    settings: localStorage.getItem(SETTINGS_KEY),
    sessions: sessions.map(({ id: _id, ...row }) => row),
    noteStats,
  }
}

/** Replace the progress on this device with a backup. The page must reload afterwards. */
export async function restoreBackup(b: Backup): Promise<void> {
  await db.transaction('rw', db.kv, db.sessions, db.noteStats, async () => {
    await db.sessions.clear()
    await db.noteStats.clear()
    await db.sessions.bulkAdd(b.sessions.map((s) => ({ ...s })))
    await db.noteStats.bulkPut(b.noteStats)
    if (b.profile) await db.kv.put({ key: PROFILE_KEY, value: b.profile })
    else await db.kv.delete(PROFILE_KEY)
  })
  if (b.settings) localStorage.setItem(SETTINGS_KEY, b.settings)
}
