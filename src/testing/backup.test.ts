import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../progress/db'
import { type Backup, backupSummary, decodeBackup, encodeBackup } from './backup'
import { collectBackup, restoreBackup } from './backupStore'

const sample = (): Backup => ({
  v: 1,
  at: 1,
  build: 'test',
  profile: JSON.stringify({ state: { totalXp: 340, lessons: { a: {}, b: {} } }, version: 0 }),
  settings: JSON.stringify({ state: { relaxedMode: true }, version: 0 }),
  sessions: Array.from({ length: 50 }, (_, i) => ({
    lessonId: `treble-${i % 7}`,
    at: 1_700_000_000_000 + i * 60_000,
    total: 15,
    firstTry: 12,
    accuracy: 0.8,
    avgReactionMs: 1200,
    stars: 2,
    xp: 15,
    failed: false,
  })),
  noteStats: [
    {
      key: 'treble:60',
      clef: 'treble',
      midi: 60,
      shown: 20,
      firstTry: 18,
      reactionMsTotal: 9000,
      reactionCount: 18,
      lastSeen: 5,
    },
  ],
})

describe('backup codes', () => {
  it('round-trips through a compressed code', async () => {
    const code = await encodeBackup(sample())
    expect(code).toMatch(/^DPO1\.[A-Za-z0-9_-]+$/)
    expect(code.length).toBeLessThan(JSON.stringify(sample()).length / 3)
    expect(await decodeBackup(code)).toEqual(sample())
  })

  it('accepts a code split over lines and a backup file', async () => {
    const code = await encodeBackup(sample())
    expect(await decodeBackup(`  ${code.slice(0, 40)}\n${code.slice(40)} `)).toEqual(sample())
    expect(await decodeBackup(JSON.stringify(sample()))).toEqual(sample())
  })

  it('rejects text that is not a code', async () => {
    await expect(decodeBackup('merhaba')).rejects.toThrow('ilerleme kodu değil')
    const code = await encodeBackup(sample())
    await expect(decodeBackup(code.slice(0, -20))).rejects.toThrow('bozuk')
    await expect(decodeBackup('{"v":2}')).rejects.toThrow('bozuk')
  })

  it('summarises a backup for the confirmation', () => {
    expect(backupSummary(sample())).toBe('2 ders, 340 XP, 50 oturum')
    expect(backupSummary({ ...sample(), profile: null, sessions: [] })).toBe('0 ders, 0 XP, 0 oturum')
  })
})

describe('backup store', () => {
  beforeEach(async () => {
    await Promise.all([db.sessions.clear(), db.noteStats.clear(), db.kv.clear()])
    localStorage.clear()
  })

  it('replaces the progress on this device and reads it back', async () => {
    await db.sessions.add({ ...sample().sessions[0], lessonId: 'old' })
    await db.noteStats.put({ ...sample().noteStats[0], key: 'bass:48', clef: 'bass', midi: 48 })
    await restoreBackup(sample())

    const back = await collectBackup()
    expect(back.sessions).toEqual(sample().sessions)
    expect(back.noteStats).toEqual(sample().noteStats)
    expect(back.profile).toBe(sample().profile)
    expect(back.settings).toBe(sample().settings)
  })
})
