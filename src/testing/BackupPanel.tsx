import { useState } from 'react'
import { backupSummary, BackupError, decodeBackup, encodeBackup } from './backup'
import { collectBackup, restoreBackup } from './backupStore'
import { copyText, downloadText, today } from './share'

/** Move progress between devices: a code to paste, or a file. */
export function BackupPanel() {
  const [code, setCode] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const exportCode = async () => {
    setBusy(true)
    try {
      const next = await encodeBackup(await collectBackup())
      setCode(next)
      setMessage((await copyText(next)) ? 'Kod kopyalandı. Diğer cihazda buraya yapıştır.' : 'Kodu seçip kopyala.')
    } catch (err) {
      console.error(err)
      setMessage('İlerleme okunamadı.')
    } finally {
      setBusy(false)
    }
  }

  const exportFile = async () => {
    const backup = await collectBackup()
    downloadText(`piyano-ilerleme-${today()}.json`, JSON.stringify(backup), 'application/json')
  }

  const importText = async (text: string) => {
    setBusy(true)
    try {
      const backup = await decodeBackup(text)
      const ok = window.confirm(`Bu cihazdaki ilerleme silinip yerine şu yüklensin mi?\n${backupSummary(backup)}`)
      if (!ok) return
      await restoreBackup(backup)
      window.location.reload()
    } catch (err) {
      setMessage(err instanceof BackupError ? err.message : 'İçe aktarılamadı.')
      if (!(err instanceof BackupError)) console.error(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="backup">
      <span>İlerlemeyi taşı</span>
      <p className="muted">XP, yıldızlar, istatistikler ve ayarlar. Bir cihazda kodu al, ötekine yapıştır.</p>
      <div className="goal-picker">
        <button className="pill" disabled={busy} onClick={exportCode}>
          📤 Kodu al
        </button>
        <button className="pill" disabled={busy} onClick={exportFile}>
          💾 Dosya indir
        </button>
        <label className="pill">
          📂 Dosya yükle
          <input
            type="file"
            accept="application/json,.json"
            hidden
            onChange={async (e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              if (file) await importText(await file.text())
            }}
          />
        </label>
      </div>
      <textarea
        className="backup-code"
        rows={3}
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Diğer cihazdan aldığın kodu buraya yapıştır"
        onFocus={(e) => e.target.select()}
      />
      <button className="btn btn-small" disabled={busy || !code.trim()} onClick={() => importText(code)}>
        Kodu yükle
      </button>
      {message && (
        <p className="muted backup-message" role="status">
          {message}
        </p>
      )}
    </div>
  )
}
