// The installable app: the browser's "install" offer, and a new version
// waiting in the service worker. Registered from main.tsx; the Android app
// has its own copy of the files and no service worker.

import { create } from 'zustand'
import { isNativeApp } from '../midi/nativeMidi'

interface InstallPrompt extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

interface AppUpdateState {
  /** A new version is downloaded and waits for a reload. */
  needRefresh: boolean
  /** The browser offers to install the app (Chrome, Edge, Android). */
  installPrompt: InstallPrompt | null
  installed: boolean
  update: () => void
  checkForUpdate: () => Promise<boolean>
  dismiss: () => void
  install: () => Promise<void>
}

let applyUpdate: ((reload?: boolean) => Promise<void>) | null = null
let registration: ServiceWorkerRegistration | undefined

export const useAppUpdate = create<AppUpdateState>((set, get) => ({
  needRefresh: false,
  installPrompt: null,
  installed: false,
  update: () => void applyUpdate?.(true),
  async checkForUpdate() {
    await registration?.update().catch(() => undefined)
    return get().needRefresh
  },
  dismiss: () => set({ needRefresh: false }),
  async install() {
    const p = get().installPrompt
    if (!p) return
    await p.prompt()
    const { outcome } = await p.userChoice
    set({ installPrompt: null, installed: outcome === 'accepted' })
  },
}))

/** Opened from the home screen as an installed app (not in a browser tab). */
export const isStandalone = () =>
  isNativeApp() ||
  (typeof window !== 'undefined' &&
    (window.matchMedia?.('(display-mode: standalone)').matches ||
      (navigator as { standalone?: boolean }).standalone === true))

export const isIos = () =>
  typeof navigator !== 'undefined' &&
  (/iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (/macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1))

export const isAndroidBrowser = () =>
  typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent) && !isNativeApp()

export function setupAppUpdates(): void {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    useAppUpdate.setState({ installPrompt: e as InstallPrompt })
  })
  window.addEventListener('appinstalled', () => useAppUpdate.setState({ installPrompt: null, installed: true }))
  if (isNativeApp() || !('serviceWorker' in navigator)) return
  void import('virtual:pwa-register').then(({ registerSW }) => {
    applyUpdate = registerSW({
      onNeedRefresh: () => useAppUpdate.setState({ needRefresh: true }),
      onRegisteredSW: (_url, reg) => {
        registration = reg
        // An open app looks for a new version every hour.
        if (reg) window.setInterval(() => void reg.update().catch(() => undefined), 60 * 60 * 1000)
      },
    })
  })
}
