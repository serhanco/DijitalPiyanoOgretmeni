import { useState } from 'react'
import { isNativeApp } from '../midi/nativeMidi'
import { isAndroidBrowser, isIos, isStandalone, useAppUpdate } from '../state/appUpdate'

export const APK_FILE = 'piyano-ogretmeni.apk'

/** Settings → Uygulama: install the app, get the Android app, look for a new version. */
export function InstallPanel() {
  const { installPrompt, installed, install, checkForUpdate, update, needRefresh } = useAppUpdate()
  const [checked, setChecked] = useState<'idle' | 'checking' | 'latest'>('idle')
  const native = isNativeApp()
  const standalone = isStandalone()

  return (
    <div className="install-panel small" data-install>
      {native ? (
        <p>📱 Android uygulamasındasın. Bluetooth piyanoyu klavye panelinden doğrudan bulabilirsin.</p>
      ) : standalone || installed ? (
        <p>✓ Uygulama olarak yüklü.</p>
      ) : installPrompt ? (
        <button className="btn btn-small" onClick={() => void install()} data-install-button>
          📲 Uygulamayı yükle
        </button>
      ) : isIos() ? (
        <p>
          iPhone/iPad’de: Safari’de <b>Paylaş</b> düğmesine, sonra <b>Ana Ekrana Ekle</b>’ye dokun. (iPhone’da MIDI yok;
          ekran klavyesi çalışır.)
        </p>
      ) : (
        <p className="muted">
          Tarayıcının menüsünden “Uygulamayı yükle” ya da “Ana ekrana ekle” ile kurabilirsin; internetsiz de açılır.
        </p>
      )}
      {isAndroidBrowser() && (
        <p>
          <a className="btn btn-small btn-secondary" href={`./${APK_FILE}`} download data-apk>
            🤖 Android uygulamasını indir
          </a>
          <span className="muted"> Bluetooth piyanoyu yardımcı uygulama olmadan bağlar.</span>
        </p>
      )}
      {!native && (
        <p>
          {needRefresh ? (
            <button className="btn btn-small" onClick={update}>
              ✨ Yeni sürümü aç
            </button>
          ) : (
            <button
              className="pill"
              onClick={() => {
                setChecked('checking')
                void checkForUpdate().then((found) => setChecked(found ? 'idle' : 'latest'))
              }}
            >
              {checked === 'checking' ? 'Bakılıyor…' : checked === 'latest' ? 'En yeni sürüm ✓' : 'Güncelleme var mı?'}
            </button>
          )}
        </p>
      )}
      <p className="muted">Sürüm: {__APP_BUILD__}</p>
    </div>
  )
}
