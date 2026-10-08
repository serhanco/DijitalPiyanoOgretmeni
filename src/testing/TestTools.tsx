import { useEffect, useMemo, useState } from 'react'
import type { NoteLesson } from '../games/noteHunter/lessons'
import { pauseGame, resumeGame } from '../input/gameClock'
import { useMidi } from '../midi/midiStore'
import { UNITS } from '../progress/curriculum'
import { useSettings } from '../state/settings'
import { requestFinish } from './finishRequest'
import { describePlace, formatTime, type NoteContext, notesToMarkdown, shotFileName, sortNotes } from './notes'
import { canShare, copyText, downloadBlob, downloadText, shareNotes, today } from './share'
import { captureScreen, loadShot, saveShot } from './shots'
import { useTestNotes } from './useTestNotes'
import { makeZip } from './zip'

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

type Shot = { state: 'taking' } | { state: 'ready'; blob: Blob; url: string } | { state: 'none' }

/** The notes' Markdown and their screenshots as files, numbered like the list. */
async function exportFiles(): Promise<{ markdown: string; shots: { name: string; blob: Blob }[] }> {
  const notes = sortNotes(useTestNotes.getState().notes)
  const shots: { name: string; blob: Blob }[] = []
  for (const [i, n] of notes.entries()) {
    const blob = n.shot ? await loadShot(n.id).catch(() => null) : null
    if (blob) shots.push({ name: shotFileName(i), blob })
  }
  // A screenshot that went missing is not referenced.
  const kept = new Set(shots.map((s) => s.name))
  const markdown = notesToMarkdown(notes.map((n, i) => ({ ...n, shot: kept.has(shotFileName(i)) })))
  return { markdown, shots }
}

/**
 * Test mode: a note button on every screen (it pauses the game and takes a
 * screenshot), "Dersi bitir" in lessons, and the list of notes to send out.
 */
export function TestTools({ place }: { place: Place }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [context, setContext] = useState<NoteContext | null>(null)
  const [shot, setShot] = useState<Shot>({ state: 'none' })
  const [withShot, setWithShot] = useState(true)
  const [flash, setFlash] = useState<string | null>(null)
  const { notes, add, remove, clear } = useTestNotes()
  const listed = useMemo(() => sortNotes(notes).map((n, i) => ({ n, i })), [notes])

  useEffect(() => {
    if (!flash) return
    const t = window.setTimeout(() => setFlash(null), 2200)
    return () => clearTimeout(t)
  }, [flash])

  // Never leave the game frozen behind a closed panel.
  useEffect(() => () => resumeGame(), [])

  useEffect(() => {
    if (shot.state !== 'ready') return
    return () => URL.revokeObjectURL(shot.url)
  }, [shot])

  const show = () => {
    // Freeze the game and the context when the note is started, not when it is saved.
    pauseGame()
    setContext(noteContext(place))
    setWithShot(true)
    setShot({ state: 'taking' })
    setOpen(true)
    void captureScreen().then((blob) =>
      setShot(blob ? { state: 'ready', blob, url: URL.createObjectURL(blob) } : { state: 'none' }),
    )
  }
  const close = () => {
    setOpen(false)
    resumeGame()
  }
  const save = async () => {
    if (!context || !text.trim()) return
    const blob = withShot && shot.state === 'ready' ? shot.blob : null
    const id = add(text.trim(), context, !!blob)
    if (blob) await saveShot(id, blob).catch(() => undefined)
    setText('')
    setFlash(`Not kaydedildi (${notes.length + 1})`)
    close()
  }
  const finish = () => {
    if (!requestFinish()) setFlash('Bu ekranda bitirilecek bir ders yok')
  }

  const copy = async () => {
    const { markdown } = await exportFiles()
    setFlash((await copyText(markdown)) ? 'Kopyalandı' : 'Kopyalanamadı')
  }
  const share = async () => {
    const { markdown, shots } = await exportFiles()
    const files = [
      new File([markdown], `test-notlari-${today()}.md`, { type: 'text/markdown' }),
      ...shots.map((s) => new File([s.blob], s.name.replace('ekranlar/', ''), { type: 'image/jpeg' })),
    ]
    await shareNotes('Test notları', markdown, files)
  }
  const download = async () => {
    const { markdown, shots } = await exportFiles()
    if (!shots.length) return downloadText(`test-notlari-${today()}.md`, markdown, 'text/markdown')
    const enc = new TextEncoder()
    const entries = [{ name: 'test-notlari.md', data: enc.encode(markdown) }]
    for (const s of shots) entries.push({ name: s.name, data: new Uint8Array(await s.blob.arrayBuffer()) })
    downloadBlob(`test-notlari-${today()}.zip`, new Blob([makeZip(entries) as BlobPart], { type: 'application/zip' }))
  }

  return (
    <div className="test-tools">
      <div className="test-fabs">
        <button className="test-fab" onClick={show} aria-label="Test notu bırak">
          📝{notes.length > 0 && <span className="test-fab-count">{notes.length}</span>}
        </button>
        {place.screen === 'Ders' && (
          <button className="test-fab" onClick={finish} aria-label="Dersi bitir" title="Dersi şimdi bitir">
            ⏭
          </button>
        )}
      </div>

      {open && context && (
        <div className="overlay test-overlay" role="dialog" aria-label="Test notu" onClick={close}>
          <div className="test-panel" onClick={(e) => e.stopPropagation()}>
            <header>
              <h2>📝 Test notu</h2>
              <button className="icon-btn" onClick={close} aria-label="Kapat">
                ✕
              </button>
            </header>
            <p className="test-place">{describePlace(context)}</p>
            <p className="muted test-meta">
              {context.detail ? `${context.detail} · ` : ''}
              {context.device} · sürüm {context.build}
              {place.screen === 'Ders' && ' · oyun duraklatıldı'}
            </p>
            <div className="test-shot">
              {shot.state === 'taking' && <span className="muted">Ekran görüntüsü alınıyor…</span>}
              {shot.state === 'none' && <span className="muted">Ekran görüntüsü alınamadı.</span>}
              {shot.state === 'ready' && (
                <>
                  <img src={shot.url} alt="Ekran görüntüsü" className={withShot ? '' : 'off'} />
                  <label className="test-shot-toggle">
                    <input type="checkbox" checked={withShot} onChange={(e) => setWithShot(e.target.checked)} />
                    Ekran görüntüsünü ekle
                  </label>
                </>
              )}
            </div>
            <textarea
              autoFocus
              rows={4}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Ne gördün? Ne olmalıydı?"
            />
            <div className="test-actions">
              <button className="btn btn-small" disabled={!text.trim() || shot.state === 'taking'} onClick={save}>
                Kaydet
              </button>
            </div>

            <h3>Notların ({notes.length})</h3>
            {notes.length === 0 ? (
              <p className="muted">Henüz not yok. Kaydettiğin notlar bu cihazda saklanır.</p>
            ) : (
              <>
                <ol className="test-list">
                  {[...listed].reverse().map(({ n, i }) => (
                    <li key={n.id}>
                      <div>
                        <b>
                          {i + 1}. {describePlace(n.context)}
                        </b>
                        <span className="muted">
                          {' '}
                          · {formatTime(n.at)}
                          {n.shot && ' · 📷'}
                        </span>
                        <p>{n.text}</p>
                      </div>
                      <button className="icon-btn" onClick={() => remove(n.id)} aria-label="Notu sil">
                        🗑
                      </button>
                    </li>
                  ))}
                </ol>
                <div className="test-actions">
                  <button className="btn btn-small" onClick={copy}>
                    Hepsini kopyala
                  </button>
                  {canShare() && (
                    <button className="btn btn-small btn-secondary" onClick={share}>
                      Paylaş
                    </button>
                  )}
                  <button className="btn btn-small btn-secondary" onClick={download}>
                    İndir
                  </button>
                  <button
                    className="btn btn-small btn-secondary danger"
                    onClick={() => window.confirm('Bütün notlar silinsin mi?') && clear()}
                  >
                    Hepsini sil
                  </button>
                </div>
                <p className="muted test-hint">
                  Kopyalanan metinde ekran görüntüleri yok; onlar için Paylaş ya da İndir (.zip).
                </p>
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
    </div>
  )
}
