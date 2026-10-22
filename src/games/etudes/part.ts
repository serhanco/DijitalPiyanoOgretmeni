// Building blocks of the Etüt Kitaplığı, kept apart from the catalog of
// imported scores so the key units can use the Hanon exercises without it:
// a written score as a `Song`, the pieces written by rule (drills.ts) and a
// lesson on a range of bars.

import type { NoteLesson } from '../noteHunter/lessons'
import { waterfall } from '../songs/lessons'
import type { Song, SongSpec } from '../songs/song'
import { FIVE_PIECES, type FivePosition, fiveScore, hanonScore } from './drills'
import type { ScoreSource } from './score'

/** Sections of eight bars (the last one may be shorter). */
function eights(bars: number): number[] {
  const out: number[] = []
  for (let left = bars; left > 0; left -= 8) out.push(Math.min(8, left))
  return out
}

export function etude(score: ScoreSource, info: Omit<Song, 'id' | 'notes' | 'beatsPerBar' | 'score'>): Song {
  const [num, den] = score.time
  return { id: score.id, notes: '', beatsPerBar: (num * 4) / den, score, sections: eights(score.bars), ...info }
}

const POSITION_NAMES: Record<string, string> = { C: 'Do', D: 'Re', F: 'Fa', G: 'Sol', A: 'La' }

/** A five-finger piece in a position: "Basamaklar (Sol pozisyonu)". */
export function fivePiece(slug: string, pos: FivePosition): Song {
  const piece = FIVE_PIECES.find((p) => p.slug === slug)!
  const where = `${POSITION_NAMES[pos.tonic]}${pos.type === 'major' ? '' : ' minör'} pozisyonu`
  return etude(fiveScore(piece, pos), {
    title: `${piece.title} (${where})`,
    original: 'Beş parmak alıştırması',
    origin: 'Dijital Piyano Öğretmeni; Ferdinand Beyer’in yöntemindeki gibi beş parmak pozisyonunda',
    fact: 'Ferdinand Beyer’in piyano okulu (Vorschule im Klavierspiel, Op. 101) da böyle başlar: el beş komşu tuşun üstünde durur, her parmağın kendi tuşu vardır.',
    bpm: piece.time[0] === 3 ? 96 : 84,
  })
}

const HANON_FACT =
  'Charles-Louis Hanon (1819–1900) Fransız bir piyano öğretmeniydi. Altmış alıştırması her parmağı eşit güçte ve bağımsız yapmak için yazıldı; bugün de dünyanın her yerinde ısınma çalışması olarak çalınır.'

/** Hanon's exercise `no` (one or two octaves, in a major key). */
export function hanonPiece(no: number, tonic = 'C', octaves: 1 | 2 = 1): Song {
  const key = tonic.replace('b', '♭')
  return etude(hanonScore(no, tonic, octaves), {
    title: `Hanon ${no}${octaves === 2 ? ' (iki oktav)' : ''}`,
    original: `Le Pianiste virtuose, No. ${no}`,
    origin: `Charles-Louis Hanon, 1873${tonic === 'C' ? '' : `; ${key} tonuna taşınmış`}`,
    fact: HANON_FACT,
    bpm: 60,
  })
}

// ---- Lessons --------------------------------------------------------------------

const HANDS = { right: 'sağ el', left: 'sol el', both: 'iki el' }

/** A lesson on bars given from 1, as printed (the lesson keeps them from 0). */
export function etudePart(
  id: string,
  song: Song,
  hands: SongSpec['hands'],
  mode: SongSpec['mode'],
  [from, to]: [number, number],
  title: string,
): NoteLesson {
  const bars: [number, number] = [from - 1, to - 1]
  const how = mode === 'wait' ? 'notalar seni bekler' : 'metronomla'
  const lesson = waterfall(
    id,
    title,
    `${song.title}: ${HANDS[hands]}, ölçü ${from}–${to}, ${how}`,
    { songs: [song], hands, mode, bars },
    // On the metronome the suggested tempo starts slower than the piece.
    mode === 'tempo' ? { bpm: Math.round(((song.bpm ?? 80) * 0.7) / 2) * 2 } : {},
  )
  return { ...lesson, kind: 'etude' }
}
