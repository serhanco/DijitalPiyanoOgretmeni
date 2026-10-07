import type { NoteStat } from '../games/noteHunter/summary'
import type { Clef } from '../music/notes'
import type { NoteScore } from './curriculum'
import { db, noteStatKey, type NoteStatRow, type SessionRow } from './db'

/** Store a finished session and add its per-note results to the running totals. */
export async function recordSession(row: Omit<SessionRow, 'id'>, clef: Clef, perNote: NoteStat[]): Promise<void> {
  await db.transaction('rw', db.sessions, db.noteStats, async () => {
    await db.sessions.add({ ...row }) // copy: Dexie writes the new id onto the object
    for (const n of perNote) {
      const key = noteStatKey(clef, n.midi)
      const prev = await db.noteStats.get(key)
      const reactions = n.avgReactionMs !== null ? n.firstTry : 0
      const next: NoteStatRow = {
        key,
        clef,
        midi: n.midi,
        shown: (prev?.shown ?? 0) + n.shown,
        firstTry: (prev?.firstTry ?? 0) + n.firstTry,
        reactionMsTotal: (prev?.reactionMsTotal ?? 0) + (n.avgReactionMs ?? 0) * reactions,
        reactionCount: (prev?.reactionCount ?? 0) + reactions,
        lastSeen: row.at,
      }
      await db.noteStats.put(next)
    }
  })
}

export async function noteScores(clef: Clef): Promise<(NoteScore & { avgReactionMs: number | null })[]> {
  const rows = await db.noteStats.where('clef').equals(clef).toArray()
  return rows
    .map((r) => ({
      midi: r.midi,
      shown: r.shown,
      firstTry: r.firstTry,
      avgReactionMs: r.reactionCount ? r.reactionMsTotal / r.reactionCount : null,
    }))
    .sort((a, b) => a.midi - b.midi)
}

export async function recentSessions(limit = 10): Promise<SessionRow[]> {
  return db.sessions.orderBy('at').reverse().limit(limit).toArray()
}

/** Earlier sessions of one lesson, oldest first, for the progress chart. */
export async function lessonHistory(lessonId: string, limit = 10): Promise<SessionRow[]> {
  const rows = await db.sessions.where('lessonId').equals(lessonId).sortBy('at')
  return rows.slice(-limit)
}

/** The latest rhythm sessions (they carry timing), newest first. */
export async function rhythmSessions(limit = 12): Promise<SessionRow[]> {
  return db.sessions
    .orderBy('at')
    .reverse()
    .filter((s) => s.timing !== undefined)
    .limit(limit)
    .toArray()
}
