import { useEffect } from 'react'
import { keepAwakeNative } from '../midi/nativeMidi'

// Screens can nest (a boss fight plays its phases in LessonPlayers): the native flag follows the outermost.
let holders = 0

/**
 * Keep the screen on while `active`: during a lesson the hands are on the
 * keys, and a phone that dims after 30 seconds would end the game. Browsers
 * drop the lock when the page is hidden, so it is taken again on return.
 */
export function useWakeLock(active = true) {
  useEffect(() => {
    if (!active) return
    let lock: WakeLockSentinel | null = null
    let gone = false
    const take = async () => {
      if (document.visibilityState !== 'visible' || !('wakeLock' in navigator)) return
      try {
        lock = await navigator.wakeLock.request('screen')
        if (gone) void lock.release()
      } catch {
        // Battery saver or no permission: the screen just dims as usual.
      }
    }
    const onVisible = () => void take()
    void take()
    if (holders++ === 0) void keepAwakeNative(true)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      gone = true
      document.removeEventListener('visibilitychange', onVisible)
      void lock?.release().catch(() => undefined)
      if (--holders === 0) void keepAwakeNative(false)
    }
  }, [active])
}
