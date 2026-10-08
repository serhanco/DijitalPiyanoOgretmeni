import { describe, expect, it } from 'vitest'
import { describePlace, type NoteContext, notesToMarkdown, type TestNote } from './notes'

const ctx = (over: Partial<NoteContext> = {}): NoteContext => ({
  screen: 'Ders',
  lessonId: 'treble-1',
  lessonTitle: 'Do ve Sol',
  kind: 'drill',
  unit: 'Ünite 1: Sol Anahtarı',
  build: 'abc1234 · 2026-10-08',
  device: 'MIDI yok · 390×844 · dokunmatik',
  ...over,
})

describe('describePlace', () => {
  it('names the unit, lesson, id and kind', () => {
    expect(describePlace(ctx())).toBe('Ders · Ünite 1: Sol Anahtarı › Do ve Sol (treble-1, drill)')
  })
  it('is just the screen outside lessons', () => {
    expect(describePlace({ screen: 'Harita', build: 'x', device: 'y' })).toBe('Harita')
  })
})

describe('notesToMarkdown', () => {
  it('is empty without notes', () => {
    expect(notesToMarkdown([])).toBe('')
  })

  it('lists notes oldest first with their context', () => {
    const notes: TestNote[] = [
      { id: 'b', at: new Date(2026, 9, 8, 14, 5).getTime(), text: 'Tuşlar çok sıkışık', context: ctx() },
      {
        id: 'a',
        at: new Date(2026, 9, 8, 9, 30).getTime(),
        text: ' Kuş çok hızlı \n',
        context: ctx({
          screen: 'Sonuç',
          lessonId: 'treble-3',
          lessonTitle: 'Nota Kuşu',
          kind: 'bird',
          detail: '2 yıldız',
        }),
      },
    ]
    const md = notesToMarkdown(notes)
    expect(md).toContain('# Test notları (2)')
    expect(md).toContain('Sürüm: abc1234 · 2026-10-08')
    expect(md.indexOf('Kuş çok hızlı')).toBeLessThan(md.indexOf('Tuşlar çok sıkışık'))
    expect(md).toContain('## 1. Sonuç · Ünite 1: Sol Anahtarı › Nota Kuşu (treble-3, bird)')
    expect(md).toContain('_08.10 09:30 · MIDI yok · 390×844 · dokunmatik · 2 yıldız_')
    expect(md.endsWith('Tuşlar çok sıkışık\n')).toBe(true)
  })
})
