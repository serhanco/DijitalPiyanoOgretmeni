import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { useSoundRouting } from './audio/useSoundRouting'
import type { NoteLesson } from './games/noteHunter/lessons'
import type { SessionSummary } from './games/noteHunter/summary'
import { attachComputerKeyboard } from './input/computerKeyboard'
import { useMidi } from './midi/midiStore'
import { HomeScreen } from './screens/HomeScreen'
import { ResultsScreen } from './screens/ResultsScreen'
import { useProgress } from './state/progress'

// The staff renderer (VexFlow + music font) is large, so load it after the home screen.
const loadGame = () => import('./screens/NoteHunterScreen')
const NoteHunterScreen = lazy(() => loadGame().then((m) => ({ default: m.NoteHunterScreen })))

type Screen =
  | { name: 'home' }
  | { name: 'play'; lesson: NoteLesson; run: number }
  | { name: 'results'; lesson: NoteLesson; summary: SessionSummary }

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'home' })
  const record = useProgress((s) => s.record)
  const midiStatus = useMidi((s) => s.status)
  const connectMidi = useMidi((s) => s.connect)

  useSoundRouting()
  useEffect(() => attachComputerKeyboard(), [])
  useEffect(() => void loadGame(), [])

  // Chrome remembers a granted MIDI permission, so try quietly on load.
  useEffect(() => {
    if (midiStatus !== 'idle' || !navigator.permissions) return
    navigator.permissions
      .query({ name: 'midi' as PermissionName })
      .then((p) => {
        if (p.state === 'granted') void connectMidi()
      })
      .catch(() => undefined)
  }, [midiStatus, connectMidi])

  const start = useCallback((lesson: NoteLesson) => {
    if (useMidi.getState().status === 'idle') void useMidi.getState().connect()
    setScreen({ name: 'play', lesson, run: Date.now() })
  }, [])

  const finish = useCallback(
    (lesson: NoteLesson) => (summary: SessionSummary) => {
      record(lesson.id, summary.stars, summary.accuracy)
      setScreen({ name: 'results', lesson, summary })
    },
    [record],
  )

  return (
    <main className="app">
      {screen.name === 'home' && <HomeScreen onStart={start} />}
      {screen.name === 'play' && (
        <Suspense fallback={<p className="muted">Yükleniyor…</p>}>
          <NoteHunterScreen
            key={screen.run}
            lesson={screen.lesson}
            onFinish={finish(screen.lesson)}
            onExit={() => setScreen({ name: 'home' })}
          />
        </Suspense>
      )}
      {screen.name === 'results' && (
        <ResultsScreen
          lesson={screen.lesson}
          summary={screen.summary}
          onRetry={() => start(screen.lesson)}
          onHome={() => setScreen({ name: 'home' })}
        />
      )}
    </main>
  )
}
