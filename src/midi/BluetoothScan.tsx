import { useEffect, useRef, useState } from 'react'
import { type BluetoothFound, connectBluetooth, scanBluetooth } from './nativeMidi'

/** In the Android app: find a Bluetooth MIDI piano and connect it, without a helper app. */
export function BluetoothScan() {
  const [found, setFound] = useState<BluetoothFound[]>([])
  const [state, setState] = useState<'idle' | 'scanning' | 'connecting' | 'error'>('idle')
  const [error, setError] = useState('')
  const stop = useRef<(() => void) | null>(null)

  useEffect(() => () => stop.current?.(), [])

  const scan = async () => {
    setFound([])
    setError('')
    setState('scanning')
    try {
      stop.current?.()
      stop.current = await scanBluetooth((d) =>
        setFound((list) => (list.some((x) => x.address === d.address) ? list : [...list, d])),
      )
      window.setTimeout(() => setState((s) => (s === 'scanning' ? 'idle' : s)), 12_000)
    } catch (err) {
      setState('error')
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  const connect = async (d: BluetoothFound) => {
    setState('connecting')
    try {
      stop.current?.()
      await connectBluetooth(d.address)
      setState('idle')
    } catch (err) {
      setState('error')
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <div className="bt-scan">
      <button className="btn btn-small" onClick={() => void scan()} disabled={state === 'scanning'}>
        {state === 'scanning' ? 'Aranıyor…' : '📶 Bluetooth piyano ara'}
      </button>
      <p className="muted small">
        Piyanonun Bluetooth’unu aç. Telefonun Bluetooth ayarlarından eşleştirmene gerek yok: burada bulunca dokun.
      </p>
      {found.length > 0 && (
        <ul className="bt-list">
          {found.map((d) => (
            <li key={d.address}>
              <button className="pill" onClick={() => void connect(d)} disabled={state === 'connecting'}>
                🎹 {d.name}
              </button>
            </li>
          ))}
        </ul>
      )}
      {state === 'error' && <p className="small bad">{error}</p>}
    </div>
  )
}
