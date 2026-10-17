import { lazy, Suspense, useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { useSoundRouting } from './audio/useSoundRouting'
import { type NoteLesson, PATTERN_KINDS } from './games/noteHunter/lessons'
import type { SessionSummary } from './games/noteHunter/summary'
import { attachComputerKeyboard, setComputerKeyboardBase } from './input/computerKeyboard'
import { useMidi } from './midi/midiStore'
import { buildReviewLesson, mapNodeOf } from './progress/curriculum'
import { recordSession } from './progress/history'
import { HomeScreen } from './screens/HomeScreen'
import { LessonPlayer } from './screens/LessonPlayer'
import { ProfileScreen } from './screens/ProfileScreen'
import { ResultsScreen } from './screens/ResultsScreen'
import { type Reward, useProfile } from './state/profile'
import { useSettings } from './state/settings'
import { Welcome } from './components/Welcome'
import { welcomeDone } from './components/welcomeState'
import { consumeFinishRequest } from './testing/finishRequest'
import { type Place, TestTools } from './testing/TestTools'

// The note-reading drill is the most played screen: load it right after the map.
const loadGame = () => import('./screens/NoteHunterScreen')
const CalibrationScreen = lazy(() =>
  import('./screens/CalibrationScreen').then((m) => ({ default: m.CalibrationScreen })),
)

type Screen =
  | { name: 'home'; focus?: string }
  | { name: 'profile' }
  | { name: 'calibrate' }
  | { name: 'play'; lesson: NoteLesson; run: number }
  | { name: 'results'; lesson: NoteLesson; summary: SessionSummary; reward: Reward; trial: boolean }

/** True once the saved profile has been read; a returning learner must not see the welcome flash by. */
function useProfileLoaded(): boolean {
  return useSyncExternalStore(
    (notify) => useProfile.persist.onFinishHydration(notify),
    () => useProfile.persist.hasHydrated(),
  )
}

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'home' })
  const midiStatus = useMidi((s) => s.status)
  const connectMidi = useMidi((s) => s.connect)
  const testMode = useSettings((s) => s.testMode)
  const profileLoaded = useProfileLoaded()
  const lessonsCompleted = useProfile((s) => s.lessonsCompleted)
  const [welcomed, setWelcomed] = useState(welcomeDone)
  // Old players (who have finished a lesson) never see the welcome.
  const showWelcome = !welcomed && profileLoaded && lessonsCompleted === 0

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
      chords: summary.chords !== undefined,
      quiz: summary.quiz !== undefined,
      ear: summary.ear !== undefined,
      songLearned: !!summary.memory?.song?.lastClean,
      song: summary.song?.mode,
      songHands: summary.song?.hands,
      allTogether: !!summary.chords && summary.chords.played >= 5 && summary.chords.together === summary.chords.played,
      noneMissed: !!summary.chords && summary.chords.played === summary.total,
      kind: lesson.kind,
      ...(summary.boss && { boss: { defeated: summary.boss.defeated } }),
      tempoRaised: !!summary.tempoLadder?.raisedTo,
    }
    // "Dersi bitir" in test mode shows the results but keeps them out of the progress.
    const trial = consumeFinishRequest()
    const earned = useProfile.getState().completeLesson(outcome, new Date(), !trial)
    // Nothing was kept, so nothing is celebrated as new.
    const reward = trial
      ? { ...earned, newBadges: [], levelAfter: earned.levelBefore, goalJustReached: false, streakExtended: false }
      : earned
    const timing = summary.timing && {
      counts: summary.timing.counts,
      meanOffsetMs: summary.timing.meanOffsetMs,
      bpm: summary.timing.bpm,
    }
    // Rhythm results say how well notes were timed, and scales and memory runs are known in
    // advance: only note-reading lessons feed the note statistics.
    const reading = !summary.timing && !PATTERN_KINDS.includes(lesson.kind ?? 'drill')
    if (!trial)
      void recordSession(
        { ...outcome, at: Date.now(), xp: reward.xpGained, timing },
        reading ? summary.perNote : [],
      ).catch((err) => console.error('Could not save the session', err))
    setScreen({ name: 'results', lesson, summary, reward, trial })
  }

  const home = () => setScreen({ name: 'home' })
  // Finished, failed or left halfway: the map comes back at the lesson's node.
  const backFrom = (lesson: NoteLesson) => () => setScreen({ name: 'home', focus: mapNodeOf(lesson) })

  const place: Place =
    screen.name === 'play'
      ? { screen: 'Ders', lesson: screen.lesson }
      : screen.name === 'results'
        ? {
            screen: 'Sonuç',
            lesson: screen.lesson,
            detail: `${screen.summary.failed ? 'canlar bitti, ' : ''}doğruluk %${Math.round(screen.summary.accuracy * 100)}, ${screen.summary.stars} yıldız`,
          }
        : { screen: screen.name === 'profile' ? 'Profil' : screen.name === 'calibrate' ? 'Gecikme ayarı' : 'Harita' }

  return (
    <main className="app">
      {screen.name === 'home' && (
        <HomeScreen
          onStart={start}
          onProfile={() => setScreen({ name: 'profile' })}
          onCalibrate={() => setScreen({ name: 'calibrate' })}
          focus={screen.focus}
        />
      )}
      {screen.name === 'profile' && <ProfileScreen onBack={home} />}
      {screen.name === 'calibrate' && (
        <Suspense fallback={<p className="muted">Yükleniyor…</p>}>
          <CalibrationScreen onBack={home} />
        </Suspense>
      )}
      {screen.name === 'play' && (
        <LessonPlayer
          key={screen.run}
          lesson={screen.lesson}
          onFinish={finish(screen.lesson)}
          onExit={backFrom(screen.lesson)}
        />
      )}
      {screen.name === 'results' && (
        <ResultsScreen
          lesson={screen.lesson}
          summary={screen.summary}
          reward={screen.reward}
          trial={screen.trial}
          onRetry={() => start(screen.lesson)}
          onHome={backFrom(screen.lesson)}
          onPractice={(notes, clef) => start(buildReviewLesson(clef, notes))}
        />
      )}
      {showWelcome && <Welcome onDone={() => setWelcomed(true)} />}
      {testMode && <TestTools place={place} />}
    </main>
  )
}
