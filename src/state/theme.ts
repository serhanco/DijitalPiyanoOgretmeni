import { useSyncExternalStore } from 'react'
import { type ThemeChoice, useSettings } from './settings'

export type Theme = 'light' | 'dark'

const DARK_QUERY = '(prefers-color-scheme: dark)'
/** The browser bar's colour per theme (`<meta name="theme-color">`). */
export const BAR_COLOR: Record<Theme, string> = { light: '#58cc02', dark: '#131f24' }

/** The theme a choice resolves to: 'system' follows the device. */
export function resolveTheme(choice: ThemeChoice, deviceDark: boolean): Theme {
  if (choice === 'system') return deviceDark ? 'dark' : 'light'
  return choice
}

function deviceDark() {
  return window.matchMedia?.(DARK_QUERY).matches ?? false
}

/** The theme in use right now, read from the page root (set by `setupTheme`). */
export function currentTheme(): Theme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
}

const listeners = new Set<() => void>()

function apply() {
  const theme = resolveTheme(useSettings.getState().theme, deviceDark())
  const root = document.documentElement
  if (root.dataset.theme !== theme) {
    root.dataset.theme = theme
    root.style.colorScheme = theme
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', BAR_COLOR[theme])
  }
  listeners.forEach((l) => l())
}

/** Puts `data-theme` on the page root and keeps it in step with the setting and the device. */
export function setupTheme() {
  apply()
  window.matchMedia?.(DARK_QUERY).addEventListener('change', apply)
  useSettings.subscribe((s, prev) => s.theme !== prev.theme && apply())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** True while the dark colours are on (for drawings that pick their own colours). */
export function useDark() {
  return useSyncExternalStore(subscribe, () => currentTheme() === 'dark')
}
