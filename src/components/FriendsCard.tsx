// The map's friends card (phase 17): signed out, a gentle "İlerlemeni
// kaybetme" that opens the sign-in (closable for good); signed in, the
// week's league place and the friends' news, a tap away from Arkadaşlar.

import { useEffect, useState } from 'react'
import { useAccount } from '../cloud/account'
import { league, news } from '../cloud/social'
import { weekKey } from '../progress/quests'
import { useProfile } from '../state/profile'
import { AccountPanel } from './AccountPanel'
import { Sheet } from './Sheet'
import { Icon } from './icons/Icon'

const NUDGE_KEY = 'dpo-account-nudge'

function nudgeClosed(): boolean {
  try {
    return localStorage.getItem(NUDGE_KEY) === 'closed'
  } catch {
    return false
  }
}

export function FriendsCard({ onOpen }: { onOpen: () => void }) {
  const { kind, ready, user, me, friends, events } = useAccount()
  const played = useProfile((s) => s.lessonsCompleted)
  const [closed, setClosed] = useState(nudgeClosed)
  const [signIn, setSignIn] = useState(false)
  const [week] = useState(() => weekKey(new Date()))
  // Signed in through the sheet: it closes, and stays closed after a later sign-out.
  useEffect(
    () =>
      useAccount.subscribe((s, prev) => {
        if (s.user && !prev.user) setSignIn(false)
      }),
    [],
  )
  if (!kind || !ready) return null

  if (!user) {
    // Shown once a lesson was finished, until closed or signed in.
    if (closed || played < 1) return signIn ? <SignInSheet onClose={() => setSignIn(false)} /> : null
    return (
      <>
        <section className="friends-card nudge" data-node="account" aria-label="Hesap">
          <span className="friends-card-icon" aria-hidden>
            <Icon name="cloud" size={44} />
          </span>
          <div className="friends-card-body">
            <h2>İlerlemeni kaybetme</h2>
            <p className="small muted">Giriş yap: ilerlemen her cihazda seninle olsun, arkadaşlarınla yarış.</p>
          </div>
          <button className="btn btn-small" onClick={() => setSignIn(true)}>
            Giriş yap
          </button>
          <button
            className="icon-btn friends-card-close"
            aria-label="Hesap kartını kapat"
            onClick={() => {
              try {
                localStorage.setItem(NUDGE_KEY, 'closed')
              } catch {
                // Without storage it comes back next time; nothing else depends on it.
              }
              setClosed(true)
            }}
          >
            ✕
          </button>
        </section>
        {signIn && <SignInSheet onClose={() => setSignIn(false)} />}
      </>
    )
  }

  const row = me ? league(me, friends, week).find((r) => r.me) : undefined
  const fresh = me ? news(me, friends, events, week).filter((n) => n.event || n.cheer).length : 0
  return (
    <section className="friends-card" data-node="friends" aria-label="Arkadaşlar">
      <span className="friends-card-icon" aria-hidden>
        <Icon name="friends" size={44} />
      </span>
      <div className="friends-card-body">
        <h2>Arkadaşlar</h2>
        <p className="small">
          {friends.length === 0
            ? 'Davet kodunu paylaş, birlikte yarışın.'
            : row
              ? `Bu hafta ligde ${row.place}. sıradasın (${row.xp} XP)`
              : `${friends.length} arkadaş`}
          {fresh > 0 && <span className="friends-badge"> · {fresh} yeni haber</span>}
        </p>
      </div>
      <button className="btn btn-small" onClick={onOpen} aria-label="Arkadaşlar ekranını aç">
        Aç
      </button>
    </section>
  )
}

function SignInSheet({ onClose }: { onClose: () => void }) {
  const user = useAccount((s) => s.user)
  return (
    <Sheet title="☁️ Hesap" onClose={onClose} className="account-sheet">
      <AccountPanel />
      {user && (
        <button className="btn" onClick={onClose}>
          Tamam
        </button>
      )}
    </Sheet>
  )
}
