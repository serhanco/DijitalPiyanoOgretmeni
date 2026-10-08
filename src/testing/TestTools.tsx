import { useEffect, useState } from 'react'
import type { NoteLesson } from '../games/noteHunter/lessons'
import { useMidi } from '../midi/midiStore'
import { UNITS } from '../progress/curriculum'
import { useSettings } from '../state/settings'
import { describePlace, formatTime, type NoteContext, notesToMarkdown } from './notes'
import { canShare, copyText, downloadText, shareText, today } from './share'
import { useTestNotes } from './useTestNotes'

/** What the app is showing, as App knows it. */
export interface Place {
  screen: string
  lesson?: NoteLesson
  detail?: string
}

function noteContext(place: Place): NoteContext {
  const { lesson } = place
  const settings = useSettings.getState()
  const devices = useMidi.getState().devices.map((d) => d.name)
  const modes = [settings.relaxedMode && 'rahat mod', settings.ignoreOctave && 'oktav serbest'].filter(Boolean)
  return {
    screen: place.screen,
    ...(lesson && {
      lessonId: lesson.id,
      lessonTitle: lesson.title,
      kind: lesson.kind ?? 'drill',
      unit: UNITS.find((u) => u.lessons.some((l) => l.id === lesson.id))?.title,
    }),
    detail: [place.detail, ...modes].filter(Boolean).join(', ') || undefined,
    build: __APP_BUILD__,
    device: [
      devices.length ? `MIDI: ${devices.join(', ')}` : 'MIDI yok',
      `${window.innerWidth}×${window.innerHeight}`,
      navigator.maxTouchPoints > 0 ? 'dokunmatik' : 'fare',
    ].join(' · '),
  }
}

/** Test mode: a note button on every screen and the list of notes to copy out. */
export function TestTools({ place }: { place: Place }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [context, setContext] = useState<NoteContext | null>(null)
  const [flash, setFlash] = useState<string | null>(null)
  const { notes, add, remove, clear } = useTestNotes()

  useEffect(() => {
    if (!flash) return
    const t = window.setTimeout(() => setFlash(null), 2200)
    return () => clearTimeout(t)
  }, [flash])

  const show = () => {
    // Freeze the context when the note is started, not when it is saved.
    setContext(noteContext(place))
    setOpen(true)
  }
  const save = () => {
    if (!context || !text.trim()) return
    add(text.trim(), context)
    setText('')
    setFlash(`Not kaydedildi (${notes.length + 1})`)
  }
  const markdown = () => notesToMarkdown(notes)

  return (
    <>
      <button className="test-fab" onClick={show} aria-label="Test notu bırak">
        📝{notes.length > 0 && <span className="test-fab-count">{notes.length}</span>}
      </button>

      {open && context && (
        <div className="overlay test-overlay" role="dialog" aria-label="Test notu" onClick={() => setOpen(false)}>
          <div className="test-panel" onClick={(e) => e.stopPropagation()}>
            <header>
              <h2>📝 Test notu</h2>
              <button className="icon-btn" onClick={() => setOpen(false)} aria-label="Kapat">
                ✕
              </button>
            </header>
            <p className="test-place">{describePlace(context)}</p>
            <p className="muted test-meta">
              {context.detail ? `${context.detail} · ` : ''}
              {context.device} · sürüm {context.build}
            </p>
            <textarea
              autoFocus
              rows={4}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Ne gördün? Ne olmalıydı?"
            />
            <div className="test-actions">
              <button className="btn btn-small" disabled={!text.trim()} onClick={save}>
                Kaydet
              </button>
            </div>

            <h3>Notların ({notes.length})</h3>
            {notes.length === 0 ? (
              <p className="muted">Henüz not yok. Kaydettiğin notlar bu cihazda saklanır.</p>
            ) : (
              <>
                <ol className="test-list">
                  {[...notes].reverse().map((n) => (
                    <li key={n.id}>
                      <div>
                        <b>{describePlace(n.context)}</b>
                        <span className="muted"> · {formatTime(n.at)}</span>
                        <p>{n.text}</p>
                      </div>
                      <button className="icon-btn" onClick={() => remove(n.id)} aria-label="Notu sil">
                        🗑
                      </button>
                    </li>
                  ))}
                </ol>
                <div className="test-actions">
                  <button
                    className="btn btn-small"
                    onClick={async () => setFlash((await copyText(markdown())) ? 'Kopyalandı' : 'Kopyalanamadı')}
                  >
                    Hepsini kopyala
                  </button>
                  {canShare() && (
                    <button
                      className="btn btn-small btn-secondary"
                      onClick={() => shareText('Test notları', markdown())}
                    >
                      Paylaş
                    </button>
                  )}
                  <button
                    className="btn btn-small btn-secondary"
                    onClick={() => downloadText(`test-notlari-${today()}.md`, markdown(), 'text/markdown')}
                  >
                    İndir
                  </button>
                  <button
                    className="btn btn-small btn-secondary danger"
                    onClick={() => window.confirm('Bütün notlar silinsin mi?') && clear()}
                  >
                    Hepsini sil
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {flash && (
        <div className="toast" role="status">
          {flash}
        </div>
      )}
    </>
  )
}
