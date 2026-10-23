// The Supabase backend (schema in supabase/schema.sql). Loaded only when the
// build has VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.

import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'
import { isNativeApp } from '../midi/nativeMidi'
import type { Backup } from '../testing/backup'
import type { AddFriendResult, CloudBackend, CloudUser } from './backend'
import type { CloudEvent, Player, PlayerUpdate } from './social'

/** Where Google sends the app back to (AndroidManifest.xml has the intent filter). */
export const NATIVE_REDIRECT = 'io.github.serhanco.piyano://auth'

interface PlayerRow {
  user_id: string
  name: string
  code: string
  costume: string | null
  streak: number
  week: string
  week_xp: number
  week_lessons: number
  last_week: string
  last_week_xp: number
  records: Player['records']
  ghosts: Player['ghosts']
  partner: string | null
}

const toPlayer = (r: PlayerRow): Player => ({
  id: r.user_id,
  name: r.name,
  code: r.code,
  costume: r.costume,
  streak: r.streak,
  week: r.week,
  weekXp: r.week_xp,
  weekLessons: r.week_lessons,
  lastWeek: r.last_week,
  lastWeekXp: r.last_week_xp,
  records: r.records ?? {},
  ghosts: r.ghosts ?? {},
  partner: r.partner,
})

const toUser = (u: User | null | undefined): CloudUser | null =>
  u
    ? {
        id: u.id,
        email: u.email ?? null,
        name:
          (u.user_metadata?.full_name as string | undefined) ?? (u.user_metadata?.name as string | undefined) ?? null,
      }
    : null

/** The page without the sign-in's ?code=… (web Google sign-in returns here). */
const pageUrl = () => location.origin + location.pathname

function check<T>(r: { data: T; error: { message: string } | null }): T {
  if (r.error) throw new Error(r.error.message)
  return r.data
}

export function supabaseBackend(url: string, key: string): CloudBackend {
  const sb: SupabaseClient = createClient(url, key, {
    auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: !isNativeApp() },
  })

  // The Android app: Google returns to io.github.serhanco.piyano://auth?code=…
  if (isNativeApp())
    void import('@capacitor/app').then(({ App }) =>
      App.addListener('appUrlOpen', async ({ url: back }) => {
        if (!back.startsWith(NATIVE_REDIRECT)) return
        const code = new URL(back).searchParams.get('code')
        if (code) await sb.auth.exchangeCodeForSession(code)
        const { Browser } = await import('@capacitor/browser')
        await Browser.close().catch(() => undefined)
      }),
    )

  const uid = async () => {
    const { data } = await sb.auth.getSession()
    const id = data.session?.user.id
    if (!id) throw new Error('not signed in')
    return id
  }

  return {
    kind: 'supabase',
    async current() {
      const { data } = await sb.auth.getSession()
      if (data.session && location.search.includes('code=')) history.replaceState(null, '', pageUrl() + location.hash)
      return toUser(data.session?.user)
    },
    onChange(listener) {
      const { data } = sb.auth.onAuthStateChange((_event, session) => listener(toUser(session?.user)))
      return () => data.subscription.unsubscribe()
    },
    async signInWithGoogle() {
      if (isNativeApp()) {
        const { data, error } = await sb.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: NATIVE_REDIRECT, skipBrowserRedirect: true },
        })
        if (error) throw new Error(error.message)
        const { Browser } = await import('@capacitor/browser')
        await Browser.open({ url: data.url })
        return
      }
      const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: pageUrl() } })
      if (error) throw new Error(error.message)
    },
    async sendEmailCode(email) {
      check(await sb.auth.signInWithOtp({ email, options: { shouldCreateUser: true } }))
    },
    async verifyEmailCode(email, code) {
      check(await sb.auth.verifyOtp({ email, token: code, type: 'email' }))
    },
    async signOut() {
      await sb.auth.signOut()
    },
    async deleteAccount() {
      check(await sb.rpc('delete_account'))
      await sb.auth.signOut({ scope: 'local' })
    },

    async pull() {
      const row = check(
        await sb
          .from('progress')
          .select('data')
          .eq('user_id', await uid())
          .maybeSingle(),
      )
      return (row?.data as Backup | undefined) ?? null
    },
    async push(backup) {
      check(
        await sb.from('progress').upsert({ user_id: await uid(), data: backup, updated_at: new Date().toISOString() }),
      )
    },

    async me() {
      const row = check(
        await sb
          .from('players')
          .select('*')
          .eq('user_id', await uid())
          .maybeSingle(),
      )
      return row ? toPlayer(row as PlayerRow) : null
    },
    async savePlayer(p: PlayerUpdate) {
      const row = check(
        await sb
          .from('players')
          .upsert({
            user_id: await uid(),
            name: p.name,
            costume: p.costume,
            streak: p.streak,
            week: p.week,
            week_xp: p.weekXp,
            week_lessons: p.weekLessons,
            last_week: p.lastWeek,
            last_week_xp: p.lastWeekXp,
            records: p.records,
            ghosts: p.ghosts,
            partner: p.partner,
            updated_at: new Date().toISOString(),
          })
          .select('*')
          .single(),
      )
      return toPlayer(row as PlayerRow)
    },
    async friends() {
      const me = await uid()
      const rows = check(await sb.from('players').select('*').neq('user_id', me))
      return (rows as PlayerRow[]).map(toPlayer)
    },
    async addFriend(code): Promise<AddFriendResult> {
      const other = check(await sb.rpc('add_friend', { friend_code: code })) as string | null
      return other === null ? 'not-found' : other === (await uid()) ? 'self' : 'added'
    },
    async removeFriend(id) {
      check(await sb.rpc('remove_friend', { friend: id }))
    },
    async events() {
      const rows = check(await sb.from('events').select('*').order('at', { ascending: false }).limit(50))
      return (
        rows as { id: number; from_id: string; to_id: string; kind: CloudEvent['kind']; about: string; at: string }[]
      ).map((r) => ({ id: r.id, from: r.from_id, to: r.to_id, kind: r.kind, about: r.about, at: Date.parse(r.at) }))
    },
    async send(to, kind, about) {
      check(await sb.from('events').insert({ from_id: await uid(), to_id: to, kind, about }))
    },
  }
}
