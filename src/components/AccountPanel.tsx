// Hesap (phase 17): sign in with Google or an e-mail code, the sync state,
// the player name, signing out and deleting the account. Shown in Ayarlar and
// in the sheet the map's "İlerlemeni kaybetme" card opens.

import { useState } from 'react'
import {
  deleteAccount,
  sendEmailCode,
  setPlayerName,
  signInWithGoogle,
  signOut,
  syncNow,
  useAccount,
  verifyEmailCode,
} from '../cloud/account'
import { NAME_MAX } from '../cloud/social'

/** Turkish for the errors a sign-in can give. */
function errorText(e: unknown): string {
  const m = e instanceof Error ? e.message : String(e)
  if (/invalid|expired/i.test(m)) return 'Kod yanlış ya da süresi geçmiş. Yeni bir kod iste.'
  if (/rate|too many|seconds/i.test(m)) return 'Çok sık denendi. Bir dakika bekleyip tekrar dene.'
  if (/fetch|network|failed/i.test(m)) return 'İnternete ulaşılamadı. Bağlantını kontrol et.'
  return `Olmadı: ${m}`
}

const time = (ms: number) => new Date(ms).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })

export function Privacy() {
  return (
    <details className="privacy" data-privacy>
      <summary>Gizlilik: ne saklanıyor?</summary>
      <p className="small">
        Hesap açarsan bulutta şunlar saklanır: e-posta adresin, seçtiğin oyuncu adı ve ilerlemen (oynadığın dersler,
        yıldızlar, XP, rozetler, tekrar kartları, Salon rekorları). Arkadaşların yalnızca adını, serini, haftalık XP'ni
        ve Salon rekorlarını görür; e-postanı ve ilerlemenin geri kalanını göremez. Veriler Supabase'in Avrupa'daki
        sunucularında durur, reklam ya da başka bir amaçla kullanılmaz, kimseyle paylaşılmaz.
      </p>
      <p className="small">
        “Hesabımı sil” buluttaki her şeyi hemen siler (KVKK, Kişisel Verilerin Korunması Kanunu kapsamındaki silme
        hakkın). Bu cihazdaki ilerleme silinmez; onu Ayarlar → İlerlemeyi taşı ile yedekleyebilirsin.
      </p>
    </details>
  )
}

function SignIn() {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const run = async (task: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    try {
      await task()
    } catch (e) {
      setError(errorText(e))
    } finally {
      setBusy(false)
    }
  }
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())

  return (
    <div className="account-signin" data-account="out">
      <p className="small">
        Giriş yaparsan ilerlemen bulutta saklanır, telefonda ve bilgisayarda aynı olur. Arkadaşlarını ekleyip haftalık
        ligde yarışabilirsin. Giriş yapmasan da uygulama bugünkü gibi çalışır.
      </p>
      <button className="btn account-google" data-signin="google" disabled={busy} onClick={() => run(signInWithGoogle)}>
        <span aria-hidden>G</span> Google ile giriş yap
      </button>
      <p className="small muted account-or">ya da e-postana gelen kodla</p>
      {!sent ? (
        <form
          className="account-row"
          onSubmit={(e) => {
            e.preventDefault()
            if (emailOk)
              void run(async () => {
                await sendEmailCode(email)
                setSent(true)
              })
          }}
        >
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="e-posta adresin"
            aria-label="E-posta adresin"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button className="btn btn-small" data-signin="email" disabled={busy || !emailOk}>
            Kod gönder
          </button>
        </form>
      ) : (
        <form
          className="account-row"
          onSubmit={(e) => {
            e.preventDefault()
            void run(() => verifyEmailCode(email, code))
          }}
        >
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="6 haneli kod"
            aria-label="E-postana gelen kod"
            maxLength={8}
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <button className="btn btn-small" data-signin="code" disabled={busy || code.replace(/\D/g, '').length < 6}>
            Giriş yap
          </button>
          <button type="button" className="pill" onClick={() => setSent(false)}>
            E-postayı değiştir
          </button>
        </form>
      )}
      {sent && (
        <p className="small muted">{email} adresine bir kod gönderdik. Gelen kutunu (ve gereksizleri) kontrol et.</p>
      )}
      {error && (
        <p className="small account-error" role="alert">
          {error}
        </p>
      )}
      <Privacy />
    </div>
  )
}

function SignedIn() {
  const { user, me, status, lastSync, error } = useAccount()
  const [name, setName] = useState<string | null>(null)
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)
  const shownName = name ?? me?.name ?? ''

  return (
    <div className="account-in" data-account="in" data-sync={status}>
      <p>
        👤 <b>{me?.name ?? user?.name ?? 'Hesabın'}</b> <span className="small muted">{user?.email}</span>
      </p>
      <p className="small account-sync" role="status">
        {status === 'syncing'
          ? '⏳ Eşitleniyor…'
          : status === 'error'
            ? `⚠️ Eşitlenemedi (${error ?? 'bilinmeyen hata'}). İnternet gelince yeniden denenir.`
            : lastSync
              ? `✅ İlerlemen bulutta, son eşitleme ${time(lastSync)}`
              : '☁️ Bulutla eşitlenecek'}
      </p>
      <form
        className="account-row"
        onSubmit={(e) => {
          e.preventDefault()
          if (name !== null) void setPlayerName(name).then(() => setName(null))
        }}
      >
        <input
          aria-label="Arkadaşlarının göreceği adın"
          placeholder="Oyuncu adın"
          maxLength={NAME_MAX}
          value={shownName}
          onChange={(e) => setName(e.target.value)}
        />
        <button className="btn btn-small" disabled={name === null || !name.trim()}>
          Adı kaydet
        </button>
      </form>
      <div className="account-row">
        <button className="pill" data-sync-now disabled={status === 'syncing'} onClick={() => void syncNow()}>
          🔄 Şimdi eşitle
        </button>
        <button className="pill" data-signout onClick={() => void signOut()}>
          Çıkış yap
        </button>
        <button className="pill account-delete" onClick={() => setConfirm(true)}>
          Hesabımı sil
        </button>
      </div>
      {confirm && (
        <div className="account-confirm" role="alertdialog" aria-label="Hesabı silme onayı">
          <p className="small">
            Emin misin? Buluttaki ilerlemen, arkadaş listen ve rekorların silinir. Bu cihazdaki ilerleme kalır.
          </p>
          <div className="account-row">
            <button
              className="btn btn-small account-delete"
              data-delete-account
              disabled={busy}
              onClick={async () => {
                setBusy(true)
                setFailure(null)
                try {
                  await deleteAccount()
                } catch (e) {
                  setFailure(errorText(e))
                } finally {
                  setBusy(false)
                  setConfirm(false)
                }
              }}
            >
              Evet, sil
            </button>
            <button className="pill" onClick={() => setConfirm(false)}>
              Vazgeç
            </button>
          </div>
        </div>
      )}
      {failure && (
        <p className="small account-error" role="alert">
          {failure}
        </p>
      )}
      <Privacy />
    </div>
  )
}

/** The account's part of the settings; nothing until the cloud is set up. */
export function AccountPanel() {
  const { kind, ready, user } = useAccount()
  if (!kind) return null
  if (!ready) return <p className="small muted">Hesap bilgisi okunuyor…</p>
  return user ? <SignedIn /> : <SignIn />
}
