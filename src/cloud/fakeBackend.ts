// A cloud kept in this browser's localStorage, for tests and the browser
// scripts (localStorage `dpo-cloud` = `fake`). It follows the Supabase rules:
// friends both ways, notes only between friends. Any e-mail code is 123456.
// `window.__dpoFakeCloud` lets a script add other players and their notes.

import type { Backup } from '../testing/backup'
import type { AddFriendResult, CloudBackend, CloudUser } from './backend'
import type { CloudEvent, Player, PlayerUpdate } from './social'

const STORE = 'dpo-fake-cloud'
export const FAKE_EMAIL_CODE = '123456'

interface FakeState {
  session: CloudUser | null
  users: Record<string, CloudUser>
  progress: Record<string, Backup>
  players: Record<string, Player>
  friends: [string, string][]
  events: CloudEvent[]
}

const empty = (): FakeState => ({ session: null, users: {}, progress: {}, players: {}, friends: [], events: [] })

function load(): FakeState {
  try {
    return { ...empty(), ...(JSON.parse(localStorage.getItem(STORE) ?? 'null') as FakeState | null) }
  } catch {
    return empty()
  }
}

const save = (s: FakeState) => localStorage.setItem(STORE, JSON.stringify(s))
const idOf = (email: string) => `fake-${email.toLowerCase().replace(/[^a-z0-9]/g, '')}`
const codeOf = (id: string) => {
  let h = 0
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return (h % 0xffffff).toString(16).toUpperCase().padStart(6, '0')
}

/** A short wait, so the screens show their "…" states as they would with a network. */
const later = <T>(value: T) => new Promise<T>((resolve) => setTimeout(() => resolve(value), 60))

export function fakeBackend(): CloudBackend {
  const listeners = new Set<(u: CloudUser | null) => void>()
  const signIn = (email: string, name: string | null) => {
    const s = load()
    const id = idOf(email)
    s.users[id] ??= { id, email, name }
    s.session = s.users[id]
    save(s)
    for (const l of listeners) l(s.session)
  }
  const uid = () => {
    const id = load().session?.id
    if (!id) throw new Error('not signed in')
    return id
  }
  const isFriend = (s: FakeState, a: string, b: string) => s.friends.some(([x, y]) => x === a && y === b)

  const tools = {
    /** Add another learner (a friend to be) with an invite code. */
    addPlayer(p: Partial<Player> & { id: string; name: string }) {
      const s = load()
      s.players[p.id] = {
        code: codeOf(p.id),
        costume: null,
        streak: 0,
        week: '',
        weekXp: 0,
        weekLessons: 0,
        lastWeek: '',
        lastWeekXp: 0,
        records: {},
        ghosts: {},
        partner: null,
        ...p,
      }
      save(s)
      return s.players[p.id].code
    },
    /** A note from another learner to the signed-in one. */
    sendFrom(from: string, kind: CloudEvent['kind'], about = '') {
      const s = load()
      s.events.push({ id: s.events.length + 1, from, to: uid(), kind, about, at: Date.now() })
      save(s)
    },
    state: load,
  }
  ;(window as unknown as { __dpoFakeCloud: typeof tools }).__dpoFakeCloud = tools

  return {
    kind: 'fake',
    current: () => later(load().session),
    onChange(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    async signInWithGoogle() {
      signIn('serhan@example.com', 'Serhan')
    },
    sendEmailCode: () => later(undefined),
    async verifyEmailCode(email, code) {
      await later(null)
      if (code !== FAKE_EMAIL_CODE) throw new Error('Token has expired or is invalid')
      signIn(email, null)
    },
    async signOut() {
      const s = load()
      s.session = null
      save(s)
      for (const l of listeners) l(null)
    },
    async deleteAccount() {
      const s = load()
      const id = uid()
      delete s.users[id]
      delete s.progress[id]
      delete s.players[id]
      s.friends = s.friends.filter(([a, b]) => a !== id && b !== id)
      s.events = s.events.filter((e) => e.from !== id && e.to !== id)
      s.session = null
      save(s)
      for (const l of listeners) l(null)
    },

    pull: async () => later(load().progress[uid()] ?? null),
    async push(backup) {
      const s = load()
      s.progress[uid()] = backup
      save(s)
    },

    me: async () => later(load().players[uid()] ?? null),
    async savePlayer(p: PlayerUpdate) {
      const s = load()
      const id = uid()
      s.players[id] = { ...p, id, code: s.players[id]?.code ?? codeOf(id) }
      save(s)
      return later(s.players[id])
    },
    async friends() {
      const s = load()
      const id = uid()
      return later(
        s.friends
          .filter(([a]) => a === id)
          .map(([, b]) => s.players[b])
          .filter(Boolean),
      )
    },
    async addFriend(code): Promise<AddFriendResult> {
      const s = load()
      const id = uid()
      const other = Object.values(s.players).find((p) => p.code === code.trim().toUpperCase())
      if (!other) return later('not-found')
      if (other.id === id) return later('self')
      if (!isFriend(s, id, other.id)) s.friends.push([id, other.id], [other.id, id])
      save(s)
      return later('added')
    },
    async removeFriend(friend) {
      const s = load()
      const id = uid()
      s.friends = s.friends.filter(([a, b]) => !((a === id && b === friend) || (a === friend && b === id)))
      save(s)
    },
    async events() {
      const s = load()
      const id = uid()
      return later(s.events.filter((e) => e.to === id || e.from === id).sort((a, b) => b.at - a.at))
    },
    async send(to, kind, about) {
      const s = load()
      const id = uid()
      if (!isFriend(s, id, to)) throw new Error('not a friend')
      s.events.push({ id: s.events.length + 1, from: id, to, kind, about, at: Date.now() })
      save(s)
    },
  }
}
