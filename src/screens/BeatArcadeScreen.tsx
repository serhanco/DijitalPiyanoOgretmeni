import type { Application } from 'pixi.js'
import { useCallback, useMemo } from 'react'
import { createDinoScene } from '../games/arcade/dino/scene'
import { lanesFor } from '../games/arcade/drum/engine'
import { createDrumScene } from '../games/arcade/drum/scene'
import { createLadderScene } from '../games/arcade/ladder/scene'
import { PixiStage } from '../games/arcade/PixiStage'
import { createSurfScene } from '../games/arcade/surf/scene'
import { arpeggioTitle, surfPlan, type SurfPlan } from '../games/chords/arpeggio'
import type { NoteLesson } from '../games/noteHunter/lessons'
import type { SessionSummary } from '../games/noteHunter/summary'
import { ladderPlan, ladderReport, type LadderPlan, partTitle, spelledNames } from '../games/scales/steps'
import { solfegeName } from '../music/notes'
import { BeatTrack } from '../rhythm/track'
import { useSettings } from '../state/settings'
import { BeatFrame, type FieldProps } from './beat/BeatFrame'

const ARCADE_HEARTS = 3
/** A two-hand beat costs two hearts when missed: the ladder is more forgiving. */
const LADDER_HEARTS = 5

interface Props {
  lesson: NoteLesson
  onFinish: (summary: SessionSummary) => void
  onExit: () => void
}

function DinoField({ trackRef, spec, lesson }: FieldProps & { lesson: NoteLesson }) {
  const create = useCallback(
    (app: Application) =>
      createDinoScene(app, trackRef, { clef: lesson.clef, pitched: !spec.anyKey, beatsPerBar: spec.beatsPerBar }),
    [trackRef, lesson.clef, spec],
  )
  return <PixiStage create={create} className="pixi-stage" />
}

function DrumField({ trackRef, spec, skill }: FieldProps) {
  // Lanes come from the planned targets, so they are known before the start.
  const lanes = useMemo(() => lanesFor(new BeatTrack(skill, { bpm: 60, startAt: 0 }), !!spec.anyKey), [skill, spec])
  const create = useCallback(
    (app: Application) =>
      createDrumScene(app, trackRef, { lanes, anyKey: !!spec.anyKey, beatsPerBar: spec.beatsPerBar }),
    [trackRef, lanes, spec],
  )
  return <PixiStage create={create} className="pixi-stage" />
}

function LadderField({ trackRef, plan, lesson }: FieldProps & { plan: LadderPlan; lesson: NoteLesson }) {
  const preview = useMemo(() => new BeatTrack(plan.skill, { bpm: 60, startAt: 0 }), [plan])
  const create = useCallback(
    (app: Application) => createLadderScene(app, trackRef, { parts: lesson.scales!, meta: plan.meta, preview }),
    [trackRef, lesson.scales, plan, preview],
  )
  return <PixiStage create={create} className="pixi-stage" />
}

/** Gam Merdiveni: a scale on the metronome, one stair per beat. */
function LadderScreen({ lesson, onFinish, onExit }: Props) {
  const ignoreOctave = useSettings((s) => s.ignoreOctave)
  const plan = useMemo(() => ladderPlan(lesson.scales!, ignoreOctave), [lesson, ignoreOctave])
  const names = useMemo(() => spelledNames(plan.steps), [plan])
  const nameOf = useCallback((m: number) => names.get(m) ?? solfegeName(m), [names])
  const twoHands = plan.steps.some((s) => s.notes.length > 1)
  const report = useCallback(
    (tracks: BeatTrack[], summary: SessionSummary): SessionSummary => ({
      ...summary,
      ...ladderReport(
        tracks.map((t) => t.records),
        plan.meta,
        lesson.scales!.map(partTitle),
      ),
      noteNames: Object.fromEntries(names),
    }),
    [plan, lesson.scales, names],
  )
  return (
    <BeatFrame
      lesson={lesson}
      hearts={LADDER_HEARTS}
      howTo={
        twoHands
          ? 'İki eli aynı vuruşta indir: her vuruşta bir basamak! Mavi rozet sağ el, pembe rozet sol el parmağı.'
          : 'Her vuruşta gamın sıradaki notasını çal, basamağı tırman! Rozetteki sayı parmak numarası.'
      }
      className="arcade"
      onFinish={onFinish}
      onExit={onExit}
      plan={plan}
      report={report}
      nameOf={nameOf}
      renderField={(p) => <LadderField {...p} plan={plan} lesson={lesson} />}
    />
  )
}

function SurfField({ trackRef, plan, titles }: FieldProps & { plan: SurfPlan; titles: string[] }) {
  const preview = useMemo(() => new BeatTrack(plan.skill, { bpm: 60, startAt: 0 }), [plan])
  const create = useCallback(
    (app: Application) => createSurfScene(app, trackRef, { meta: plan.meta, titles, preview }),
    [trackRef, plan, titles, preview],
  )
  return <PixiStage create={create} className="pixi-stage" />
}

/** Arpej Sörfü: arpeggios on the metronome, one note per beat; the surfer rides the wave they draw. */
function SurfScreen({ lesson, onFinish, onExit }: Props) {
  const ignoreOctave = useSettings((s) => s.ignoreOctave)
  const plan = useMemo(() => surfPlan(lesson.arpeggios!, ignoreOctave), [lesson, ignoreOctave])
  const titles = useMemo(() => lesson.arpeggios!.map(arpeggioTitle), [lesson])
  const names = useMemo(() => spelledNames(plan.steps), [plan])
  const nameOf = useCallback((m: number) => names.get(m) ?? solfegeName(m), [names])
  const twoHands = plan.steps.some((s) => s.notes.length > 1)
  const report = useCallback(
    (tracks: BeatTrack[], summary: SessionSummary): SessionSummary => ({
      ...summary,
      ...ladderReport(
        tracks.map((t) => t.records),
        plan.meta,
        titles,
      ),
      noteNames: Object.fromEntries(names),
    }),
    [plan, titles, names],
  )
  return (
    <BeatFrame
      lesson={lesson}
      hearts={LADDER_HEARTS}
      howTo={
        twoHands
          ? 'İki el aynı dalgada: her vuruşta iki eli birlikte indir! Mavi rozet sağ el, pembe rozet sol el parmağı.'
          : 'Dalgadaki notaları vuruşunda çal, sörfçü dalgada kalsın! Rozetteki sayı parmak numarası.'
      }
      className="arcade"
      onFinish={onFinish}
      onExit={onExit}
      plan={plan}
      report={report}
      nameOf={nameOf}
      renderField={(p) => <SurfField {...p} plan={plan} titles={titles} />}
    />
  )
}

export function BeatArcadeScreen({ lesson, onFinish, onExit }: Props) {
  if (lesson.kind === 'ladder') return <LadderScreen lesson={lesson} onFinish={onFinish} onExit={onExit} />
  if (lesson.kind === 'surf') return <SurfScreen lesson={lesson} onFinish={onFinish} onExit={onExit} />
  const dino = lesson.kind === 'dino'
  const pitched = !lesson.rhythm?.anyKey
  const howTo = dino
    ? pitched
      ? 'Engeldeki notayı, engel Dino’ya vardığı vuruşta çal!'
      : 'Engel Dino’ya vardığı vuruşta bir tuşa bas, Dino zıplasın! Çiçeklerde sus.'
    : pitched
      ? 'Notalar davula indiği anda o davulun notasını çal!'
      : 'Notalar davula indiği anda bir tuşa bas!'
  return (
    <BeatFrame
      lesson={lesson}
      hearts={ARCADE_HEARTS}
      howTo={howTo}
      className="arcade"
      onFinish={onFinish}
      onExit={onExit}
      renderField={(p) => (dino ? <DinoField {...p} lesson={lesson} /> : <DrumField {...p} />)}
    />
  )
}
