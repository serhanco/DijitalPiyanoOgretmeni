import { parseTonic, type ScaleType, scaleOctave } from '../../music/scales'
import type { NoteLesson } from '../noteHunter/lessons'
import { PART_BEATS, type ScalePart, scaleKeyboard } from './steps'

const part = (tonic: string, type: ScaleType, hands: ScalePart['hands']): ScalePart => ({ tonic, type, hands })

/** A scale lesson read from the staff, with fingers and crossings, at the player's own pace. */
function scaleLesson(id: string, title: string, description: string, scales: ScalePart[]): NoteLesson {
  return {
    id,
    kind: 'scale',
    title,
    description,
    clef: scales.every((s) => s.hands === 'left') ? 'bass' : 'treble',
    grand: scales.some((s) => s.hands === 'parallel' || s.hands === 'contrary'),
    notes: [],
    length: 0,
    keyboard: scaleKeyboard(scales),
    scales,
  }
}

/** Gam Merdiveni: the same scales on the metronome, one note per beat. */
function ladderLesson(id: string, title: string, description: string, bpm: number, scales: ScalePart[]): NoteLesson {
  return {
    ...scaleLesson(id, title, description, scales),
    kind: 'ladder',
    rhythm: { bpm, beatsPerBar: 4, bars: (scales.length * PART_BEATS) / 4, values: ['q'] },
  }
}

/** Melodi Hafızası on one octave of a scale. */
function memoryLesson(
  id: string,
  title: string,
  description: string,
  tonic: string,
  type: ScaleType,
  octave: number,
  maxLength: number,
): NoteLesson {
  const notes = scaleOctave(parseTonic(tonic), type, octave).map((n) => n.midi)
  return {
    id,
    kind: 'memory',
    title,
    description,
    clef: 'treble',
    notes,
    length: 0,
    keyboard: { low: notes[0] - (notes[0] % 12), high: notes[notes.length - 1] },
    memory: { startLength: 3, maxLength },
  }
}

/**
 * Unit 5: scales. Right hand, then left hand, then both hands in parallel
 * and contrary motion; majors first, then the three minors.
 */
export const SCALE_LESSONS: NoteLesson[] = [
  scaleLesson('scale-c-right', 'Do Majör', 'Sağ el; parmak numaralarını takip et', [part('C', 'major', 'right')]),
  scaleLesson('scale-g-right', 'Sol Majör', 'İlk diyez: Fa#', [part('G', 'major', 'right')]),
  ladderLesson('scale-ladder-1', 'Gam Merdiveni', 'Her vuruşta bir basamak tırman', 60, [
    part('C', 'major', 'right'),
    part('G', 'major', 'right'),
  ]),
  scaleLesson('scale-left-1', 'Sol Elle Gam', 'Do ve Sol Majör sol elle', [
    part('C', 'major', 'left'),
    part('G', 'major', 'left'),
  ]),
  memoryLesson('scale-memory-1', 'Melodi Hafızası', 'Dinle, izle ve tekrar et', 'C', 'major', 4, 7),
  scaleLesson('scale-f', 'Fa Majör', 'İlk bemol: Si♭; sağ elde 4. parmak', [
    part('F', 'major', 'right'),
    part('F', 'major', 'left'),
  ]),
  scaleLesson('scale-d-a', 'Re ve La Majör', 'İki ve üç diyezli gamlar', [
    part('D', 'major', 'right'),
    part('A', 'major', 'right'),
    part('D', 'major', 'left'),
  ]),
  ladderLesson('scale-ladder-2', 'Merdiven: Sol El', 'Sol elle vuruşunda tırman', 60, [
    part('C', 'major', 'left'),
    part('F', 'major', 'left'),
  ]),
  scaleLesson('scale-parallel', 'İki El Eş Zamanlı', 'Do Majör, iki el aynı yönde', [part('C', 'major', 'parallel')]),
  scaleLesson('scale-contrary', 'Zıt Hareket', 'Eller Orta Do’dan ayrılıp geri döner', [
    part('C', 'major', 'contrary'),
  ]),
  ladderLesson('scale-ladder-hands', 'Merdiven: İki El', 'İki el aynı vuruşta', 54, [part('C', 'major', 'parallel')]),
  scaleLesson('scale-e-bb', 'Mi ve Si♭ Majör', 'Dört diyez ve iki bemol', [
    part('E', 'major', 'right'),
    part('Bb', 'major', 'right'),
    part('Bb', 'major', 'left'),
  ]),
  scaleLesson('scale-minor-natural', 'La Minör', 'Doğal minör: Do Majör’ün notaları, La’dan', [
    part('A', 'natural', 'right'),
    part('A', 'natural', 'left'),
  ]),
  scaleLesson('scale-minor-forms', 'Armonik ve Melodik', 'Sol# ile armonik; çıkarken Fa# ve Sol# ile melodik', [
    part('A', 'harmonic', 'right'),
    part('A', 'melodic', 'right'),
  ]),
  memoryLesson('scale-memory-2', 'Hafıza: La Minör', 'Armonik minör parçalarını tekrar et', 'A', 'harmonic', 4, 8),
  scaleLesson('scale-minor-e-d', 'Mi ve Re Minör', 'Armonik minör, iki elle ayrı ayrı', [
    part('E', 'harmonic', 'right'),
    part('D', 'harmonic', 'right'),
    part('D', 'harmonic', 'left'),
  ]),
  scaleLesson('scale-minor-hands', 'İki El: La Minör', 'Armonik minör, paralel ve zıt hareket', [
    part('A', 'harmonic', 'parallel'),
    part('A', 'harmonic', 'contrary'),
  ]),
  ladderLesson('scale-ladder-minor', 'Merdiven: Minörler', 'La ve Mi armonik minör vuruşunda', 60, [
    part('A', 'harmonic', 'right'),
    part('E', 'harmonic', 'right'),
  ]),
]
