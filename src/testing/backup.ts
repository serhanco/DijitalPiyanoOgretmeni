import type { NoteStatRow, SessionRow } from '../progress/db'

/** Everything that makes up the learner's progress, to move it to another device. */
export interface Backup {
  v: 1
  at: number
  build: string
  /** The persisted profile store (XP, streak, stars, badges) as zustand wrote it. */
  profile: string | null
  /** The persisted settings (latency, tempos, toggles). */
  settings: string | null
  sessions: Omit<SessionRow, 'id'>[]
  noteStats: NoteStatRow[]
}

/** Codes start with this, so a pasted code is recognised (1 = gzip, 0 = plain JSON). */
const PREFIX = 'DPO'

function toBase64Url(bytes: Uint8Array): string {
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(text: string): Uint8Array {
  const b64 = text.replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4))
  return Uint8Array.from(bin, (c) => c.charCodeAt(0))
}

async function pipe(bytes: Uint8Array, stream: TransformStream<Uint8Array, Uint8Array>): Promise<Uint8Array> {
  const writer = stream.writable.getWriter()
  void writer
    .write(bytes)
    .then(() => writer.close())
    .catch(() => undefined)
  const chunks: Uint8Array[] = []
  const reader = stream.readable.getReader()
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
  }
  const out = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0))
  let at = 0
  for (const c of chunks) {
    out.set(c, at)
    at += c.length
  }
  return out
}

const canZip = () => typeof CompressionStream !== 'undefined'

/** A single-line code (gzip + base64url) that can be pasted into a message. */
export async function encodeBackup(backup: Backup): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(backup))
  if (!canZip()) return `${PREFIX}0.${toBase64Url(json)}`
  return `${PREFIX}1.${toBase64Url(await pipe(json, new CompressionStream('gzip') as TransformStream<Uint8Array, Uint8Array>))}`
}

export class BackupError extends Error {}

/** Accepts a code from `encodeBackup` or the JSON of a backup file. */
export async function decodeBackup(input: string): Promise<Backup> {
  const text = input.replace(/\s+/g, '')
  let parsed: unknown
  try {
    if (text.startsWith('{')) parsed = JSON.parse(input)
    else {
      const m = /^DPO([01])\.([A-Za-z0-9_-]+)$/.exec(text)
      if (!m) throw new BackupError('Bu bir ilerleme kodu değil.')
      let bytes = fromBase64Url(m[2])
      if (m[1] === '1') {
        if (typeof DecompressionStream === 'undefined') throw new BackupError('Bu tarayıcı kodu açamıyor.')
        bytes = await pipe(bytes, new DecompressionStream('gzip') as TransformStream<Uint8Array, Uint8Array>)
      }
      parsed = JSON.parse(new TextDecoder().decode(bytes))
    }
  } catch (err) {
    if (err instanceof BackupError) throw err
    throw new BackupError('Kod bozuk ya da eksik kopyalanmış.')
  }
  const b = parsed as Partial<Backup>
  if (!b || b.v !== 1 || !Array.isArray(b.sessions) || !Array.isArray(b.noteStats)) {
    throw new BackupError('Kod bozuk ya da eksik kopyalanmış.')
  }
  return b as Backup
}

/** "12 ders, 340 XP" from the profile inside a backup, to confirm before replacing. */
export function backupSummary(b: Backup): string {
  let xp = 0
  let lessons = 0
  try {
    const state = b.profile ? (JSON.parse(b.profile) as { state?: { totalXp?: number; lessons?: object } }).state : null
    xp = state?.totalXp ?? 0
    lessons = Object.keys(state?.lessons ?? {}).length
  } catch {
    // An unreadable profile still restores the sessions.
  }
  return `${lessons} ders, ${xp} XP, ${b.sessions.length} oturum`
}
