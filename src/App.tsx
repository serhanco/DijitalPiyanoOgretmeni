import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { useSoundRouting } from './audio/useSoundRouting'
import { type NoteLesson, PATTERN_KINDS } from './games/noteHunter/lessons'
import type { SessionSummary } from './games/noteHunter/summary'
import { attachComputerKeyboard, setComputerKeyboardBase } from './input/computerKeyboard'
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
// Melodies read from the staff (VexFlow, like the drill).
const MelodyScreen = lazy(() => import('./screens/MelodyScreen').then((m) => ({ default: m.MelodyScreen })))
const MemoryScreen = lazy(() => import('./screens/MemoryScreen').then((m) => ({ default: m.MemoryScreen })))
const ArcadeScreen = lazy(() => import('./screens/ArcadeScreen').then((m) => ({ default: m.ArcadeScreen })))
// Rhythm activities: the notation drill (VexFlow) and the beat arcade games (PixiJS).
const RhythmScreen = lazy(() => import('./screens/RhythmScreen').then((m) => ({ default: m.RhythmScreen })))
const BeatArcadeScreen = lazy(() => import('./screens/BeatArcadeScreen').then((m) => ({ default: m.BeatArcadeScreen })))
const CalibrationScreen = lazy(() =>
  import('./screens/CalibrationScreen').then((m) => ({ default: m.CalibrationScreen })),
)

type Screen =
  | { name: 'home' }
  | { name: 'profile' }
  | { name: 'calibrate' }
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
    setComputerKeyboardBase(lesson.keyboard.low)
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
      rhythm: summary.timing !== undefined,
    }
    const reward = useProfile.getState().completeLesson(outcome)
    const timing = summary.timing && {
      counts: summary.timing.counts,
      meanOffsetMs: summary.timing.meanOffsetMs,
      bpm: summary.timing.bpm,
    }
    // Rhythm results say how well notes were timed, and scales and memory runs are known in
    // advance: only note-reading lessons feed the note statistics.
    const reading = !summary.timing && !PATTERN_KINDS.includes(lesson.kind ?? 'drill')
    void recordSession(
      { ...outcome, at: Date.now(), xp: reward.xpGained, timing },
      reading ? summary.perNote : [],
    ).catch((err) => console.error('Could not save the session', err))
    setScreen({ name: 'results', lesson, summary, reward })
  }

  const home = () => setScreen({ name: 'home' })

  return (
    <main className="app">
      {screen.name === 'home' && (
        <HomeScreen
          onStart={start}
          onProfile={() => setScreen({ name: 'profile' })}
          onCalibrate={() => setScreen({ name: 'calibrate' })}
        />
      )}
      {screen.name === 'profile' && <ProfileScreen onBack={home} />}
      {screen.name === 'calibrate' && (
        <Suspense fallback={<p className="muted">Yükleniyor…</p>}>
          <CalibrationScreen onBack={home} />
        </Suspense>
      )}
      {screen.name === 'play' && (
        <Suspense fallback={<p className="muted">Yükleniyor…</p>}>
          {screen.lesson.kind === 'bird' || screen.lesson.kind === 'balloon' || screen.lesson.kind === 'bar' ? (
            <ArcadeScreen key={screen.run} lesson={screen.lesson} onFinish={finish(screen.lesson)} onExit={home} />
          ) : screen.lesson.kind === 'melody' || screen.lesson.kind === 'scale' ? (
            <MelodyScreen key={screen.run} lesson={screen.lesson} onFinish={finish(screen.lesson)} onExit={home} />
          ) : screen.lesson.kind === 'rhythm' ? (
            <RhythmScreen key={screen.run} lesson={screen.lesson} onFinish={finish(screen.lesson)} onExit={home} />
          ) : screen.lesson.kind === 'memory' ? (
            <MemoryScreen key={screen.run} lesson={screen.lesson} onFinish={finish(screen.lesson)} onExit={home} />
          ) : screen.lesson.kind === 'dino' || screen.lesson.kind === 'drum' || screen.lesson.kind === 'ladder' ? (
            <BeatArcadeScreen key={screen.run} lesson={screen.lesson} onFinish={finish(screen.lesson)} onExit={home} />
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
          onPractice={(notes, clef) => start(buildReviewLesson(clef, notes))}
        />
      )}
    </main>
  )
}
