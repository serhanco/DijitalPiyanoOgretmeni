import type { Application } from 'pixi.js'
import { useCallback, useMemo } from 'react'
import { createDinoScene } from '../games/arcade/dino/scene'
import { lanesFor } from '../games/arcade/drum/engine'
import { createDrumScene } from '../games/arcade/drum/scene'
import { PixiStage } from '../games/arcade/PixiStage'
import type { NoteLesson } from '../games/noteHunter/lessons'
import type { SessionSummary } from '../games/noteHunter/summary'
import { BeatTrack } from '../rhythm/track'
import { BeatFrame, type FieldProps } from './beat/BeatFrame'

const ARCADE_HEARTS = 3

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

export function BeatArcadeScreen({ lesson, onFinish, onExit }: Props) {
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
