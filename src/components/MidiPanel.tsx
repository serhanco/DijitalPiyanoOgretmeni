import { useState } from 'react'
import { useMidi } from '../midi/midiStore'

export function MidiPanel() {
  const { status, devices, error, connect } = useMidi()
  const [showHelp, setShowHelp] = useState(false)

  let text: string
  let tone: 'ok' | 'warn' | 'off'
  if (status === 'unsupported') {
    text = 'Bu tarayıcı MIDI desteklemiyor. Ekran klavyesiyle devam edebilirsin.'
    tone = 'off'
  } else if (status === 'denied') {
    text = 'MIDI izni verilmedi.'
    tone = 'warn'
  } else if (status === 'ready' && devices.length > 0) {
    text = `Bağlı: ${devices.map((d) => d.name).join(', ')}`
    tone = 'ok'
  } else if (status === 'ready') {
    text = 'MIDI hazır, ama bağlı klavye yok. Klavyeni bağla, kendiliğinden görünecek.'
    tone = 'warn'
  } else {
    text = 'Piyanonu USB ya da Bluetooth MIDI ile bağla.'
    tone = 'off'
  }

  return (
    <section className={`card midi-panel midi-${tone}`}>
      <div className="midi-row">
        <span className="midi-dot" aria-hidden />
        <p>{text}</p>
        {(status === 'idle' || status === 'denied') && (
          <button className="btn btn-small" onClick={() => void connect()}>
            Bağlan
          </button>
        )}
        {status === 'requesting' && <span className="muted">Bağlanıyor…</span>}
      </div>
      {error && <p className="muted small">{error}</p>}
      <button className="link" onClick={() => setShowHelp((v) => !v)}>
        {showHelp ? 'Yardımı gizle' : 'Bluetooth ile nasıl bağlanırım?'}
      </button>
      {showHelp && (
        <ul className="help small">
          <li>
            <b>Android:</b> Chrome kullan. Bluetooth MIDI klavyeyi önce "MIDI BLE Connect" gibi bir uygulamayla
            eşleştir, sonra buraya dönüp Bağlan'a dokun.
          </li>
          <li>
            <b>Mac:</b> Audio MIDI Setup → Pencere → MIDI Stüdyosu → Bluetooth simgesi ile piyanoyu bağla. Chrome ya da
            Edge kullan.
          </li>
          <li>
            <b>Windows:</b> Chrome ya da Edge ile USB kablosu en sorunsuz yoldur. Bluetooth için piyanoyu Windows
            Bluetooth ayarlarından eşleştir.
          </li>
          <li>
            <b>iPhone / iPad:</b> Safari şu an MIDI desteklemiyor. Uygulamanın iOS sürümüne kadar ekran klavyesini
            kullan.
          </li>
          <li>
            Klavye yoksa bilgisayar klavyesi de çalışır: <kbd>A</kbd> Do, <kbd>S</kbd> Re, <kbd>D</kbd> Mi… <kbd>Z</kbd>
            /<kbd>X</kbd> oktav değiştirir.
          </li>
        </ul>
      )}
    </section>
  )
}
