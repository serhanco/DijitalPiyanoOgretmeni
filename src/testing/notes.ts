/** Where the tester was when they wrote a note: enough to reproduce what they saw. */
export interface NoteContext {
  /** Screen name, e.g. "Ders", "Sonuç", "Harita". */
  screen: string
  lessonId?: string
  lessonTitle?: string
  /** Unit title of the lesson, when it belongs to one. */
  unit?: string
  /** Lesson kind (drill, bird, chord…). */
  kind?: string
  /** Short facts about the moment, e.g. "doğruluk %80, 2 yıldız". */
  detail?: string
  build: string
  /** Input devices and screen size, e.g. "MIDI: MPK mini 3 · 390×844". */
  device: string
}

export interface TestNote {
  id: string
  at: number
  text: string
  context: NoteContext
}

const pad = (n: number) => String(n).padStart(2, '0')

/** "08.10 14:05", local time. */
export function formatTime(at: number): string {
  const d = new Date(at)
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** One line naming the place: "Ders · Ünite 1: Sol Anahtarı › Do ve Sol (treble-1, drill)". */
export function describePlace(c: NoteContext): string {
  if (!c.lessonId) return c.screen
  const lesson = `${c.lessonTitle ?? c.lessonId} (${[c.lessonId, c.kind].filter(Boolean).join(', ')})`
  return `${c.screen} · ${c.unit ? `${c.unit} › ` : ''}${lesson}`
}

/** All notes as Markdown, oldest first, ready to paste into a chat. */
export function notesToMarkdown(notes: TestNote[]): string {
  if (!notes.length) return ''
  const sorted = [...notes].sort((a, b) => a.at - b.at)
  const builds = [...new Set(sorted.map((n) => n.context.build))]
  const lines = [`# Test notları (${sorted.length})`, '', `Sürüm: ${builds.join(', ')}`, '']
  sorted.forEach((n, i) => {
    lines.push(`## ${i + 1}. ${describePlace(n.context)}`)
    lines.push(`_${formatTime(n.at)} · ${n.context.device}${n.context.detail ? ` · ${n.context.detail}` : ''}_`)
    lines.push('')
    lines.push(n.text.trim())
    lines.push('')
  })
  return lines.join('\n').trimEnd() + '\n'
}
