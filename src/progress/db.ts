import Dexie, { type EntityTable } from 'dexie'
import type { Clef } from '../music/notes'

export interface SessionRow {
  id?: number
  lessonId: string
  at: number // epoch ms
  total: number
  firstTry: number
  accuracy: number
  avgReactionMs: number | null
  stars: number
  xp: number
  failed: boolean
  /** Rhythm lessons: the timing distribution. */
  timing?: { counts: Record<string, number>; meanOffsetMs: number | null; bpm: number }
}

/** Running totals per note, across all sessions. */
export interface NoteStatRow {
  key: string // `${clef}:${midi}`
  clef: Clef
  midi: number
  shown: number
  firstTry: number
  reactionMsTotal: number
  reactionCount: number
  lastSeen: number
}

export interface KvRow {
  key: string
  value: string
}

export const db = new Dexie('dijital-piyano') as Dexie & {
  sessions: EntityTable<SessionRow, 'id'>
  noteStats: EntityTable<NoteStatRow, 'key'>
  kv: EntityTable<KvRow, 'key'>
}

db.version(1).stores({
  sessions: '++id, lessonId, at',
  noteStats: 'key, clef',
  kv: 'key',
})

export const noteStatKey = (clef: Clef, midi: number) => `${clef}:${midi}`
