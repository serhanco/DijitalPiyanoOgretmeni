// Hesap ve bulut (phase 17): what the app needs from the cloud. Two backends
// implement it: Supabase (the real one, when the build has its address and
// key) and a fake one kept in localStorage for tests and the browser scripts.

import type { Backup } from '../testing/backup'
import type { CloudEvent, Player, PlayerUpdate } from './social'

export interface CloudUser {
  id: string
  email: string | null
  /** The name the sign-in gave (Google's full name), a first guess for the player name. */
  name: string | null
}

export type AddFriendResult = 'added' | 'not-found' | 'self'

export interface CloudBackend {
  kind: 'supabase' | 'fake'
  /** The signed-in user, also after a Google sign-in returned to the page. */
  current(): Promise<CloudUser | null>
  onChange(listener: (user: CloudUser | null) => void): () => void
  signInWithGoogle(): Promise<void>
  /** E-posta ile giriş: sends a six-digit code, then `verifyEmailCode` signs in with it. */
  sendEmailCode(email: string): Promise<void>
  verifyEmailCode(email: string, code: string): Promise<void>
  signOut(): Promise<void>
  /** Deletes the account and everything kept for it in the cloud. */
  deleteAccount(): Promise<void>

  pull(): Promise<Backup | null>
  push(backup: Backup): Promise<void>

  me(): Promise<Player | null>
  savePlayer(update: PlayerUpdate): Promise<Player>
  friends(): Promise<Player[]>
  addFriend(code: string): Promise<AddFriendResult>
  removeFriend(id: string): Promise<void>
  events(): Promise<CloudEvent[]>
  send(to: string, kind: CloudEvent['kind'], about: string): Promise<void>
}

/** localStorage switch the browser scripts use to get the fake cloud. */
export const FAKE_KEY = 'dpo-cloud'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** Which cloud this build talks to; none until the Supabase project is set up (docs/HESAP.md). */
export function cloudKind(): CloudBackend['kind'] | null {
  try {
    if (localStorage.getItem(FAKE_KEY) === 'fake') return 'fake'
  } catch {
    // Storage blocked: no fake.
  }
  return url && key ? 'supabase' : null
}

let loading: Promise<CloudBackend> | null = null

/** The backend, loaded on first use (its code is in its own chunk). */
export function loadBackend(): Promise<CloudBackend> | null {
  const kind = cloudKind()
  if (!kind) return null
  loading ??=
    kind === 'fake'
      ? import('./fakeBackend').then((m) => m.fakeBackend())
      : import('./supabaseBackend').then((m) => m.supabaseBackend(url!, key!))
  return loading
}
