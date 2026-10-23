// Hesap ve bulut (phase 17): the signed-in learner, the sync of their progress
// and their friends. Everything here is optional: without a cloud (`kind`
// null) or signed out, the app works on this device alone as before.

import { create } from 'zustand'
import { db } from '../progress/db'
import { currentStreak, dayKey } from '../progress/gamification'
import { useProfile } from '../state/profile'
import { collectBackup } from '../testing/backupStore'
import type { Backup } from '../testing/backup'
import { type CloudBackend, type CloudUser, cloudKind, loadBackend } from './backend'
import { baseOf, mergeBackups, type SyncBase } from './merge'
import {
  cleanCode,
  cleanName,
  type CloudEvent,
  isCode,
  lastWeekPlace,
  MEDAL_XP,
  type NewsItem,
  nextPlayer,
  PAIR_XP,
  pairQuest,
  type Player,
  type PlayerUpdate,
  previousWeek,
  weekStats,
} from './social'
import { weekKey } from '../progress/quests'

export type SyncStatus = 'idle' | 'syncing' | 'ok' | 'error'

interface AccountState {
  kind: CloudBackend['kind'] | null
  /** The backend said who is signed in (until then the screens wait). */
  ready: boolean
  user: CloudUser | null
  status: SyncStatus
  lastSync: number | null
  error: string | null
  me: Player | null
  friends: Player[]
  events: CloudEvent[]
  /** A friends reward or an added friend, shown once as a toast on the map. */
  toast: string | null
}

export const useAccount = create<AccountState>()(() => ({
  kind: null,
  ready: false,
  user: null,
  status: 'idle',
  lastSync: null,
  error: null,
  me: null,
  friends: [],
  events: [],
  toast: null,
}))

const set = useAccount.setState
const get = useAccount.getState

/** What this device counted at its last sync, per user. */
const BASE_KEY = 'dpo-sync-base'
/** An invite code from a `?arkadas=CODE` link, used once the learner is signed in. */
const INVITE_KEY = 'dpo-invite'
/** Sync again when the app comes back after this long. */
const STALE_MS = 10 * 60_000

function readBase(user: string): SyncBase | null {
  try {
    const b = JSON.parse(localStorage.getItem(BASE_KEY) ?? 'null') as (SyncBase & { user: string }) | null
    return b?.user === user ? { xp: b.xp, lessons: b.lessons } : null
  } catch {
    return null
  }
}

const writeBase = (user: string, base: SyncBase | null) =>
  base ? localStorage.setItem(BASE_KEY, JSON.stringify({ user, ...base })) : localStorage.removeItem(BASE_KEY)

const message = (e: unknown) => (e instanceof Error ? e.message : String(e))

async function backend(): Promise<CloudBackend> {
  const b = loadBackend()
  if (!b) throw new Error('no cloud')
  return b
}

let started = false

/** Called once at start: who is signed in, the invite link, the first sync. */
export function initAccount() {
  const kind = cloudKind()
  set({ kind })
  if (!kind || started) return
  started = true
  const invite = new URLSearchParams(location.search).get('arkadas')
  if (invite && isCode(invite)) {
    sessionStorage.setItem(INVITE_KEY, cleanCode(invite))
    const url = new URL(location.href)
    url.searchParams.delete('arkadas')
    history.replaceState(null, '', url.pathname + url.search + url.hash)
  }
  void backend().then(async (b) => {
    b.onChange((user) => {
      const was = get().user?.id
      set({ user, ...(user ? {} : { me: null, friends: [], events: [], status: 'idle', lastSync: null }) })
      if (user && user.id !== was) void syncNow()
    })
    const user = await b.current().catch(() => null)
    set({ user, ready: true })
    if (user && get().status === 'idle') void syncNow()
  })
  document.addEventListener('visibilitychange', () => {
    const { user, lastSync, status } = get()
    if (
      document.visibilityState === 'visible' &&
      user &&
      status !== 'syncing' &&
      Date.now() - (lastSync ?? 0) > STALE_MS
    )
      void syncNow()
  })
}

/** Join this device's progress with the cloud's: lessons the other device played arrive here. */
async function applyLocal(merged: Backup, local: Backup) {
  const key = (s: { lessonId: string; at: number }) => `${s.lessonId}@${s.at}`
  const have = new Set(local.sessions.map(key))
  const add = merged.sessions.filter((s) => !have.has(key(s)))
  const profileChanged = merged.profile !== local.profile
  await db.transaction('rw', [db.kv, db.sessions, db.noteStats, db.review], async () => {
    // A lesson finished meanwhile: this sync stops, the next one takes it.
    if (((await db.kv.get('profile'))?.value ?? null) !== local.profile) throw new Error('changed meanwhile')
    if (add.length) await db.sessions.bulkAdd(add.map((s) => ({ ...s })))
    await db.noteStats.bulkPut(merged.noteStats)
    await db.review.bulkPut(merged.review ?? [])
    if (profileChanged && merged.profile) await db.kv.put({ key: 'profile', value: merged.profile })
  })
  if (profileChanged) await useProfile.persist.rehydrate()
}

/** The summary friends see, from the profile and this week's lessons. */
async function publish(b: CloudBackend, user: CloudUser, prev: Player | null, patch: Partial<PlayerUpdate> = {}) {
  const now = new Date()
  const since = now.getTime() - 8 * 86_400_000
  const stats = weekStats(await db.sessions.where('at').aboveOrEqual(since).toArray(), now)
  const p = useProfile.getState()
  const records = Object.fromEntries(Object.entries(p.salon).map(([id, r]) => [id, r.best]))
  const ghosts = Object.fromEntries(Object.entries(p.ghosts).filter(([id]) => id in p.salon))
  const update = nextPlayer(prev, stats, {
    name: prev?.name ?? cleanName(user.name ?? user.email?.split('@')[0] ?? 'Piyanist'),
    costume: p.costume,
    streak: currentStreak(p.streak, dayKey(now)),
    records,
    ghosts,
    partner: prev?.partner ?? null,
    ...patch,
  })
  return b.savePlayer(update)
}

let syncing: Promise<void> | null = null
let again = false

/** Pull, merge, write here, push, publish the summary, then read the friends. */
export function syncNow(): Promise<void> {
  if (syncing) {
    again = true
    return syncing
  }
  syncing = (async () => {
    const user = get().user
    if (!user) return
    set({ status: 'syncing', error: null })
    try {
      const b = await backend()
      const local = await collectBackup()
      const remote = await b.pull()
      const merged = mergeBackups(local, remote, readBase(user.id))
      await applyLocal(merged, local)
      await b.push(merged)
      writeBase(user.id, baseOf(merged))
      const me = await publish(b, user, get().me ?? (await b.me()))
      set({ me, status: 'ok', lastSync: Date.now() })
      await refreshFriends()
    } catch (e) {
      set({ status: 'error', error: message(e) })
    }
  })().finally(() => {
    syncing = null
    if (again) {
      again = false
      void syncNow()
    }
  })
  return syncing
}

let soon: number | undefined

/** After a lesson: sync a moment later (several lessons in a row make one sync). */
export function syncSoon() {
  if (!get().user) return
  clearTimeout(soon)
  soon = window.setTimeout(() => void syncNow(), 1500)
}

/** Friends, notes and the friends rewards (shared quest chest, last week's medal). */
export async function refreshFriends() {
  const b = await backend()
  const [friends, events] = await Promise.all([b.friends(), b.events()])
  set({ friends, events })
  const invite = sessionStorage.getItem(INVITE_KEY)
  if (invite) {
    sessionStorage.removeItem(INVITE_KEY)
    await addFriend(invite)
  }
  const me = get().me
  if (!me) return
  const now = new Date()
  const profile = useProfile.getState()
  const pair = pairQuest(me, get().friends, weekKey(now))
  if (pair?.done && profile.socialReward('pair', weekKey(now), PAIR_XP, 'team-player'))
    set({ toast: `🤝 ${pair.partner.name} ile ortak görevi bitirdiniz! +${PAIR_XP} XP` })
  const place = lastWeekPlace(me, get().friends, now)
  if (place && place <= 3) {
    const xp = MEDAL_XP[place - 1]
    if (profile.socialReward('medal', previousWeek(now), xp, place === 1 ? 'league-first' : undefined))
      set({ toast: `${['🥇', '🥈', '🥉'][place - 1]} Geçen hafta arkadaş liginde ${place}. oldun! +${xp} XP` })
  }
}

export async function signInWithGoogle() {
  await (await backend()).signInWithGoogle()
}

export async function sendEmailCode(email: string) {
  await (await backend()).sendEmailCode(email.trim())
}

export async function verifyEmailCode(email: string, code: string) {
  await (await backend()).verifyEmailCode(email.trim(), code.replace(/\D/g, ''))
}

/** Signs out; the progress stays on this device. */
export async function signOut() {
  await (await backend()).signOut()
  set({ user: null, me: null, friends: [], events: [], status: 'idle', lastSync: null })
}

/** Deletes the account and its cloud copy; the progress stays on this device. */
export async function deleteAccount() {
  await (await backend()).deleteAccount()
  localStorage.removeItem(BASE_KEY)
  set({ user: null, me: null, friends: [], events: [], status: 'idle', lastSync: null })
}

async function savePatch(patch: Partial<PlayerUpdate>) {
  const { user, me } = get()
  if (!user) return
  const b = await backend()
  set({ me: await publish(b, user, me ?? (await b.me()), patch) })
}

export const setPlayerName = (name: string) => savePatch({ name: cleanName(name) || 'Piyanist' })
export async function setPartner(id: string | null) {
  await savePatch({ partner: id })
  await refreshFriends()
}

/** Add a friend by their code; the result is said in the toast. */
export async function addFriend(code: string): Promise<'added' | 'not-found' | 'self'> {
  const b = await backend()
  const result = await b.addFriend(cleanCode(code))
  if (result === 'added') {
    const friends = await b.friends()
    const had = new Set(get().friends.map((f) => f.id))
    const added = friends.find((f) => !had.has(f.id))
    set({ friends, toast: added ? `👋 ${added.name} artık arkadaşın!` : null })
    useProfile.getState().giveBadge('first-friend')
  }
  return result
}

export async function removeFriend(id: string) {
  const b = await backend()
  await b.removeFriend(id)
  if (get().me?.partner === id) await setPartner(null)
  set({ friends: get().friends.filter((f) => f.id !== id) })
}

/** 👏 on a friend's news. */
export async function cheer(item: NewsItem) {
  const b = await backend()
  const about = item.id.slice(item.friend.id.length + 1)
  await b.send(item.friend.id, 'cheer', about)
  set({ events: await b.events() })
}

/** Tell a friend their Salon record was beaten. */
export async function sendBeat(friend: string, game: string) {
  if (!get().user) return
  await (await backend()).send(friend, 'beat', game.slice(0, 80)).catch(() => undefined)
}

export const clearToast = () => set({ toast: null })
