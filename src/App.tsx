import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { useSoundRouting } from './audio/useSoundRouting'
import type { NoteLesson } from './games/noteHunter/lessons'
import type { SessionSummary } from './games/noteHunter/summary'
import { attachComputerKeyboard } from './input/computerKeyboard'
import { useMidi } from './midi/midiStore'
import { buildReviewLesson } from './progress/curriculum'
import { recordSession } from './progress/history'
import { HomeScreen } from './screens/HomeScreen'
import { ProfileScreen } from './screens/ProfileScreen'
import { ResultsScreen } from './screens/ResultsScreen'
import { type Reward, useProfile } from './state/profile'

// The staff renderer (VexFlow + music font) is large, so load it after the home screen.
const loadGame = () => import('./screens/NoteHunterScreen')
const NoteHunterScreen = lazy(() => loadGame().then((m) => ({ default: m.NoteHunterScreen })))
// Arcade games bring PixiJS: their own chunk, loaded on demand.
const ArcadeScreen = lazy(() => import('./screens/ArcadeScreen').then((m) => ({ default: m.ArcadeScreen })))

type Screen =
  | { name: 'home' }
  | { name: 'profile' }
  | { name: 'play'; lesson: NoteLesson; run: number }
  | { name: 'results'; lesson: NoteLesson; summary: SessionSummary; reward: Reward }

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'home' })
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

  const finish = (lesson: NoteLesson) => (summary: SessionSummary) => {
    const outcome = {
      lessonId: lesson.id,
      total: summary.total,
      firstTry: summary.firstTry,
      accuracy: summary.accuracy,
      avgReactionMs: summary.avgReactionMs,
      stars: summary.stars,
      failed: summary.failed,
    }
    const reward = useProfile.getState().completeLesson(outcome)
    void recordSession({ ...outcome, at: Date.now(), xp: reward.xpGained }, lesson.clef, summary.perNote).catch((err) =>
      console.error('Could not save the session', err),
    )
    setScreen({ name: 'results', lesson, summary, reward })
  }

  const home = () => setScreen({ name: 'home' })

  return (
    <main className="app">
      {screen.name === 'home' && <HomeScreen onStart={start} onProfile={() => setScreen({ name: 'profile' })} />}
      {screen.name === 'profile' && <ProfileScreen onBack={home} />}
      {screen.name === 'play' && (
        <Suspense fallback={<p className="muted">Yükleniyor…</p>}>
          {screen.lesson.kind === 'bird' || screen.lesson.kind === 'balloon' ? (
            <ArcadeScreen key={screen.run} lesson={screen.lesson} onFinish={finish(screen.lesson)} onExit={home} />
          ) : (
            <NoteHunterScreen key={screen.run} lesson={screen.lesson} onFinish={finish(screen.lesson)} onExit={home} />
          )}
        </Suspense>
      )}
      {screen.name === 'results' && (
        <ResultsScreen
          lesson={screen.lesson}
          summary={screen.summary}
          reward={screen.reward}
          onRetry={() => start(screen.lesson)}
          onHome={home}
          onPractice={(notes) => start(buildReviewLesson(screen.lesson.clef, notes))}
        />
      )}
    </main>
  )
}
