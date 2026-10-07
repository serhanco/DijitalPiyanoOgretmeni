import { RhythmStaff } from '../components/RhythmStaff'
import type { NoteLesson } from '../games/noteHunter/lessons'
import type { SessionSummary } from '../games/noteHunter/summary'
import { HEARTS_PER_LESSON } from '../progress/gamification'
import { layoutRhythm } from '../rhythm/rhythm'
import { useSettings } from '../state/settings'
import { BeatFrame, type FieldProps } from './beat/BeatFrame'

const BARS_SHOWN = 2

interface Props {
  lesson: NoteLesson
  onFinish: (summary: SessionSummary) => void
  onExit: () => void
}

function RhythmField({ spec, bars, track, now }: FieldProps) {
  const events = layoutRhythm(bars, spec.beatsPerBar).map((e, i) => ({
    ...e,
    judgement: track?.records[i].judgement ?? null,
  }))
  const beat = track ? track.beatAt(now) : null
  // Turn the page half a beat early so the next bar can be read in time.
  const page = Math.max(0, Math.floor(((beat ?? 0) + 0.5) / (spec.beatsPerBar * BARS_SHOWN)))
  const firstBar = Math.min(page * BARS_SHOWN, Math.max(0, spec.bars - BARS_SHOWN))
  const barCount = Math.min(BARS_SHOWN, spec.bars)
  return (
    <div className="rhythm-field" data-page={page}>
      <RhythmStaff
        events={events.filter((e) => e.bar >= firstBar && e.bar < firstBar + barCount)}
        firstBar={firstBar}
        barCount={barCount}
        beatsPerBar={spec.beatsPerBar}
        playhead={beat}
      />
      <p className="rhythm-legend small muted">
        <span className="dot perfect" /> Mükemmel <span className="dot good" /> İyi <span className="dot early" />{' '}
        Erken/Geç <span className="dot miss" /> Kaçırıldı
      </p>
    </div>
  )
}

export function RhythmScreen({ lesson, onFinish, onExit }: Props) {
  const relaxedMode = useSettings((s) => s.relaxedMode)
  return (
    <BeatFrame
      lesson={lesson}
      hearts={relaxedMode ? null : HEARTS_PER_LESSON}
      howTo={
        lesson.rhythm?.anyKey
          ? 'Notaları metronomla birlikte, herhangi bir tuşla çal. Eslerde sus!'
          : 'Notaları metronomla birlikte çal.'
      }
      onFinish={onFinish}
      onExit={onExit}
      renderField={(p) => <RhythmField {...p} />}
    />
  )
}
