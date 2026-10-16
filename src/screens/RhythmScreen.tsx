import { RhythmStaff } from '../components/RhythmStaff'
import type { NoteLesson } from '../games/noteHunter/lessons'
import type { SessionSummary } from '../games/noteHunter/summary'
import { HEARTS_PER_LESSON } from '../progress/gamification'
import { layoutRhythm } from '../rhythm/rhythm'
import { useSettings } from '../state/settings'
import { BeatFrame, type FieldProps } from './beat/BeatFrame'

interface Props {
  lesson: NoteLesson
  onFinish: (summary: SessionSummary) => void
  onExit: () => void
}

function RhythmField({ spec, bars, track, now }: FieldProps) {
  const events = layoutRhythm(bars, spec.beatsPerBar).map((e, i) => {
    const r = track?.records[i]
    // How far through its length the note was (or is being) held.
    const share = r?.holdShare ?? (r && r.heldKey !== null ? Math.max(0, (now - r.dueAt) / track!.lengthMs(r)) : null)
    return {
      ...e,
      judgement: r?.judgement ?? null,
      hold: share === null ? null : { share, verdict: r!.holdVerdict },
    }
  })
  const beat = track ? track.beatAt(now) : null
  return (
    <div className="rhythm-field">
      <RhythmStaff events={events} bars={spec.bars} beatsPerBar={spec.beatsPerBar} playhead={beat} />
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
          ? 'Notaları metronomla birlikte, herhangi bir tuşla çal ve süreleri kadar basılı tut. Eslerde sus!'
          : 'Notaları metronomla birlikte çal ve süreleri kadar basılı tut.'
      }
      onFinish={onFinish}
      onExit={onExit}
      holds
      renderField={(p) => <RhythmField {...p} />}
    />
  )
}
