import type { LessonKind, NoteLesson } from '../games/noteHunter/lessons'
import { Sheet } from './Sheet'

const KIND_NAME: Record<LessonKind, string> = {
  theory: 'Bilgi kartları ve sorular',
  drill: 'Nota okuma alıştırması',
  melody: 'Melodi çalma',
  bird: 'Oyun: Nota Kuşu',
  bar: 'Oyun: Nota Barmeni',
  balloon: 'Oyun: Balon Patlatma',
  rhythm: 'Ritim çalışması',
  dino: 'Oyun: Dino Koşusu',
  drum: 'Oyun: Ritim Davulcusu',
  scale: 'Gam çalışması',
  ladder: 'Oyun: Gam Merdiveni',
  memory: 'Oyun: Melodi Hafızası',
  chord: 'Akor çalışması',
  chef: 'Oyun: Akor Aşçısı',
  space: 'Oyun: Uzay Savunması',
  chordbar: 'Oyun: Akor Barmeni',
  arpeggio: 'Arpej çalışması',
  surf: 'Oyun: Arpej Sörfü',
  ear: 'Oyun: Kulak Dedektifi',
  waterfall: 'Oyun: Nota Şelalesi',
  boss: 'Boss savaşı',
  mix: 'Günün tekrar karışımı',
}

interface Props {
  lesson: NoteLesson
  icon: string
  stars: number
  bestAccuracy: number | null
  plays: number
  onStart: () => void
  onClose: () => void
}

/** The small card that opens when a lesson is tapped on the map: what it is, your best, and Başla. */
export function LessonPeek({ lesson, icon, stars, bestAccuracy, plays, onStart, onClose }: Props) {
  return (
    <Sheet title={lesson.title} onClose={onClose} className="lesson-peek">
      <p className="peek-kind">
        <span aria-hidden>{icon}</span> {KIND_NAME[lesson.kind ?? 'drill']}
      </p>
      <p className="peek-desc">{lesson.description}</p>
      <p className="peek-best">
        <span className="node-stars" aria-label={`${stars} yıldız`}>
          {[1, 2, 3].map((s) => (
            <span key={s} className={s <= stars ? 'on' : ''}>
              ★
            </span>
          ))}
        </span>
        <span className="muted">
          {plays > 0 && bestAccuracy !== null
            ? `En iyi doğruluk %${Math.round(bestAccuracy * 100)} · ${plays} kez çalındı`
            : 'Henüz çalınmadı'}
        </span>
      </p>
      <button className="btn lesson-peek-go" onClick={onStart} autoFocus>
        {plays > 0 ? 'Tekrar çal' : 'Başla'}
      </button>
    </Sheet>
  )
}
