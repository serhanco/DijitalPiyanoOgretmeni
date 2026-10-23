// Arkadaşlar (phase 17): the invite code, adding a friend, this week's
// friends league, the shared quest, the friends' news with a cheer, and the
// friend list. Signed out, it shows the sign-in first.

import { useEffect, useState } from 'react'
import { addFriend, cheer, clearToast, refreshFriends, removeFriend, setPartner, useAccount } from '../cloud/account'
import { isCode, lastWeekPlace, league, news, PAIR_GOAL, pairQuest } from '../cloud/social'
import { AccountPanel } from '../components/AccountPanel'
import { Icon } from '../components/icons/Icon'
import { weekKey } from '../progress/quests'

const MEDALS = ['🥇', '🥈', '🥉']

const inviteLink = (code: string) => `${location.origin}${location.pathname}?arkadas=${code}`

export function FriendsScreen({ onBack }: { onBack: () => void }) {
  const { user, me, friends, events, toast } = useAccount()
  const [code, setCode] = useState('')
  const [said, setSaid] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)
  const [now] = useState(() => new Date())
  const week = weekKey(now)

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(clearToast, 3500)
    return () => clearTimeout(t)
  }, [toast])

  useEffect(() => {
    window.scrollTo({ top: 0 })
    if (useAccount.getState().user) void refreshFriends().catch(() => undefined)
  }, [])

  const rows = me ? league(me, friends, week) : []
  const lastPlace = me ? lastWeekPlace(me, friends, now) : null
  const pair = me ? pairQuest(me, friends, week) : null
  const items = me ? news(me, friends, events, week) : []

  const share = async () => {
    if (!me) return
    const text = `Dijital Piyano Öğretmeni'nde arkadaş olalım! Kodum: ${me.code}`
    try {
      if (navigator.share) await navigator.share({ title: 'Piyano arkadaşı', text, url: inviteLink(me.code) })
      else {
        await navigator.clipboard.writeText(`${text}\n${inviteLink(me.code)}`)
        setSaid('Davet bağlantısı kopyalandı.')
      }
    } catch {
      // The share sheet was closed.
    }
  }

  const add = async () => {
    setBusy(true)
    setSaid(null)
    try {
      const r = await addFriend(code)
      setSaid(
        r === 'added'
          ? 'Eklendi! Artık birbirinizi ligde görürsünüz.'
          : r === 'self'
            ? 'Bu senin kendi kodun 🙂'
            : 'Bu kodla kimse bulunamadı.',
      )
      if (r === 'added') setCode('')
    } catch {
      setSaid('Şu an eklenemedi; internet bağlantını kontrol et.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="salon friends">
      <header className="salon-top">
        <button className="icon-btn" onClick={onBack} aria-label="Haritaya dön">
          ✕
        </button>
        <div>
          <h1>
            <Icon name="friends" size={36} /> Arkadaşlar
          </h1>
          <p className="muted small">
            Haftalık ligde yarışın, ortak görevi birlikte bitirin, rekorlarınızla düello yapın.
          </p>
        </div>
      </header>

      {!user ? (
        <section className="card">
          <AccountPanel />
        </section>
      ) : (
        <>
          <section className="card friends-invite" data-invite={me?.code ?? ''}>
            <h2>Davet</h2>
            <p>
              Davet kodun: <b className="friends-code">{me?.code ?? '…'}</b>
            </p>
            <div className="account-row">
              <button className="btn btn-small" disabled={!me} onClick={() => void share()}>
                Davet bağlantısını paylaş
              </button>
            </div>
            <form
              className="account-row"
              onSubmit={(e) => {
                e.preventDefault()
                if (isCode(code)) void add()
              }}
            >
              <input
                aria-label="Arkadaşının kodu"
                placeholder="Arkadaşının kodu"
                maxLength={8}
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
              <button className="btn btn-small" data-add-friend disabled={busy || !isCode(code)}>
                Ekle
              </button>
            </form>
            {said && (
              <p className="small" role="status" data-said>
                {said}
              </p>
            )}
          </section>

          <section className="card friends-league" aria-label="Bu haftanın ligi">
            <h2>Bu haftanın ligi</h2>
            {friends.length === 0 ? (
              <p className="small muted">Bir arkadaş ekleyince haftalık XP sıralamanız burada görünür.</p>
            ) : (
              <ol className="league">
                {rows.map((r) => (
                  <li
                    key={r.player.id}
                    className={r.me ? 'me' : ''}
                    data-league-row={r.me ? 'me' : r.player.id}
                    data-place={r.place}
                  >
                    <span className="league-place">{(r.xp > 0 && MEDALS[r.place - 1]) || `${r.place}.`}</span>
                    <span className="league-name">
                      {r.player.name}
                      {r.me && ' (sen)'}
                    </span>
                    <span className="league-xp">{r.xp} XP</span>
                  </li>
                ))}
              </ol>
            )}
            {lastPlace && (
              <p className="small muted" data-last-place={lastPlace}>
                Geçen hafta {lastPlace}. oldun{lastPlace <= 3 ? ` ${MEDALS[lastPlace - 1]}` : ''}.
              </p>
            )}
            <p className="small muted">Hafta pazartesi başlar. İlk üçe pazartesi XP ödülü, birinciye rozet.</p>
          </section>

          {friends.length > 0 && (
            <section className="card friends-pair" aria-label="Ortak görev">
              <h2>🤝 Ortak görev</h2>
              {pair ? (
                <>
                  <p className="small">
                    {pair.partner.name} ile bu hafta birlikte {PAIR_GOAL} ders bitirin, ikinize de sandık!
                  </p>
                  <div className="pair-bar" data-pair={pair.mine + pair.theirs}>
                    <span style={{ width: `${Math.min(100, ((pair.mine + pair.theirs) / PAIR_GOAL) * 100)}%` }} />
                  </div>
                  <p className="small muted">
                    Sen {pair.mine} · {pair.partner.name} {pair.theirs} · toplam{' '}
                    {Math.min(PAIR_GOAL, pair.mine + pair.theirs)}/{PAIR_GOAL}
                    {!pair.mutual && ` · ${pair.partner.name} de seni görev arkadaşı seçince sayılır`}
                  </p>
                </>
              ) : (
                <p className="small muted">
                  Bir görev arkadaşı seç: ikinizin bu hafta bitirdiği dersler birlikte sayılır.
                </p>
              )}
              <div className="account-row">
                {friends.map((f) => (
                  <button
                    key={f.id}
                    className={`chip salon-skill ${me?.partner === f.id ? 'on' : ''}`}
                    aria-pressed={me?.partner === f.id}
                    data-partner={f.id}
                    onClick={() => void setPartner(me?.partner === f.id ? null : f.id)}
                  >
                    {f.name}
                  </button>
                ))}
              </div>
            </section>
          )}

          {items.length > 0 && (
            <section className="card friends-news" aria-label="Haberler">
              <h2>Haberler</h2>
              <ul className="news">
                {items.map((n) => (
                  <li key={n.id} data-news={n.id}>
                    <span>{n.text}</span>
                    {n.cheer && (
                      <button className="pill" aria-label={`${n.friend.name}: alkışla`} onClick={() => void cheer(n)}>
                        👏
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {friends.length > 0 && (
            <section className="card" aria-label="Arkadaş listesi">
              <h2>Arkadaşların</h2>
              <ul className="friend-list">
                {friends.map((f) => (
                  <li key={f.id} data-friend={f.id}>
                    <span>
                      <b>{f.name}</b>
                      <span className="small muted">{f.streak > 0 ? ` · 🔥 ${f.streak} gün` : ''}</span>
                    </span>
                    {removing === f.id ? (
                      <span className="account-row">
                        <button
                          className="pill account-delete"
                          onClick={() => void removeFriend(f.id).then(() => setRemoving(null))}
                        >
                          Çıkar
                        </button>
                        <button className="pill" onClick={() => setRemoving(null)}>
                          Vazgeç
                        </button>
                      </span>
                    ) : (
                      <button
                        className="pill"
                        aria-label={`${f.name}: arkadaşlıktan çıkar`}
                        onClick={() => setRemoving(f.id)}
                      >
                        ✕
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  )
}
