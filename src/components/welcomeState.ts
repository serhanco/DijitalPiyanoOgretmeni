const KEY = 'dpo-welcomed'

/** True once the welcome has been finished or skipped on this device. */
export function welcomeDone(): boolean {
  try {
    return localStorage.getItem(KEY) !== null
  } catch {
    return true
  }
}

export function markWelcomed(): void {
  try {
    localStorage.setItem(KEY, '1')
  } catch {
    // Without storage the welcome simply shows again next time.
  }
}
