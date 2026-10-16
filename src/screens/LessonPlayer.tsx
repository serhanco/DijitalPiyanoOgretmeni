// Plays one lesson on the screen of its kind. The screens are lazy: each
// brings its own renderer (VexFlow, PixiJS, Tone.js) when it is first needed.

import { lazy, Suspense } from 'react'
import type { NoteLesson } from '../games/noteHunter/lessons'
import type { SessionSummary } from '../games/noteHunter/summary'

// The staff renderer (VexFlow + music font) is large: App loads it after the home screen.
const loadGame = () => import('./NoteHunterScreen')
const NoteHunterScreen = lazy(() => loadGame().then((m) => ({ default: m.NoteHunterScreen })))
// Arcade games bring PixiJS: their own chunk, loaded on demand.
// Melodies read from the staff (VexFlow, like the drill).
const MelodyScreen = lazy(() => import('./MelodyScreen').then((m) => ({ default: m.MelodyScreen })))
const ChordScreen = lazy(() => import('./ChordScreen').then((m) => ({ default: m.ChordScreen })))
const TheoryScreen = lazy(() => import('./TheoryScreen').then((m) => ({ default: m.TheoryScreen })))
const EarScreen = lazy(() => import('./EarScreen').then((m) => ({ default: m.EarScreen })))
const SongScreen = lazy(() => import('./SongScreen').then((m) => ({ default: m.SongScreen })))
const MemoryScreen = lazy(() => import('./MemoryScreen').then((m) => ({ default: m.MemoryScreen })))
const ArcadeScreen = lazy(() => import('./ArcadeScreen').then((m) => ({ default: m.ArcadeScreen })))
const ChordArcadeScreen = lazy(() => import('./ChordArcadeScreen').then((m) => ({ default: m.ChordArcadeScreen })))
// Rhythm activities: the notation drill (VexFlow) and the beat arcade games (PixiJS).
const RhythmScreen = lazy(() => import('./RhythmScreen').then((m) => ({ default: m.RhythmScreen })))
const BeatArcadeScreen = lazy(() => import('./BeatArcadeScreen').then((m) => ({ default: m.BeatArcadeScreen })))
const BossScreen = lazy(() => import('./BossScreen').then((m) => ({ default: m.BossScreen })))

export interface LessonScreenProps {
  lesson: NoteLesson
  onFinish: (summary: SessionSummary) => void
  onExit: () => void
}

export function LessonPlayer({ lesson, onFinish, onExit }: LessonScreenProps) {
  return (
    <Suspense fallback={<p className="muted">Yükleniyor…</p>}>
      {lesson.kind === 'boss' ? (
        <BossScreen lesson={lesson} onFinish={onFinish} onExit={onExit} />
      ) : lesson.kind === 'theory' ? (
        <TheoryScreen lesson={lesson} onFinish={onFinish} onExit={onExit} />
      ) : lesson.kind === 'bird' || lesson.kind === 'balloon' || lesson.kind === 'bar' ? (
        <ArcadeScreen lesson={lesson} onFinish={onFinish} onExit={onExit} />
      ) : lesson.kind === 'melody' || lesson.kind === 'scale' || lesson.kind === 'arpeggio' ? (
        <MelodyScreen lesson={lesson} onFinish={onFinish} onExit={onExit} />
      ) : lesson.kind === 'chord' ? (
        <ChordScreen lesson={lesson} onFinish={onFinish} onExit={onExit} />
      ) : lesson.kind === 'chef' || lesson.kind === 'space' || lesson.kind === 'chordbar' ? (
        <ChordArcadeScreen lesson={lesson} onFinish={onFinish} onExit={onExit} />
      ) : lesson.kind === 'rhythm' ? (
        <RhythmScreen lesson={lesson} onFinish={onFinish} onExit={onExit} />
      ) : lesson.kind === 'ear' ? (
        <EarScreen lesson={lesson} onFinish={onFinish} onExit={onExit} />
      ) : lesson.kind === 'waterfall' ? (
        <SongScreen lesson={lesson} onFinish={onFinish} onExit={onExit} />
      ) : lesson.kind === 'memory' ? (
        <MemoryScreen lesson={lesson} onFinish={onFinish} onExit={onExit} />
      ) : lesson.kind === 'dino' || lesson.kind === 'drum' || lesson.kind === 'ladder' || lesson.kind === 'surf' ? (
        <BeatArcadeScreen lesson={lesson} onFinish={onFinish} onExit={onExit} />
      ) : (
        <NoteHunterScreen lesson={lesson} onFinish={onFinish} onExit={onExit} />
      )}
    </Suspense>
  )
}
