/** Copy text, falling back to a hidden textarea where the Clipboard API is blocked. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const area = document.createElement('textarea')
    area.value = text
    area.style.position = 'fixed'
    area.style.opacity = '0'
    document.body.appendChild(area)
    area.select()
    const ok = document.execCommand?.('copy') ?? false
    area.remove()
    return ok
  }
}

/** Save text as a file through the browser's download. */
export function downloadText(name: string, text: string, type = 'text/plain'): void {
  downloadBlob(name, new Blob([text], { type: `${type};charset=utf-8` }))
}

export function downloadBlob(name: string, blob: Blob): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** The phone's share sheet (send straight to a chat app), where there is one. */
export const canShare = () => typeof navigator !== 'undefined' && typeof navigator.share === 'function'

/** Share files where the browser can (phones), else the text. */
export async function shareNotes(title: string, text: string, files: File[]): Promise<void> {
  try {
    if (files.length && navigator.canShare?.({ files })) await navigator.share({ title, files })
    else await navigator.share({ title, text })
  } catch {
    // Cancelled by the user.
  }
}

/** "2026-10-08" for file names. */
export const today = () => new Date().toISOString().slice(0, 10)
