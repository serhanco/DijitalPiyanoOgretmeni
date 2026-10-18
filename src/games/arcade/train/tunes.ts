// Songs for Nota Treni: well-known melodies whose copyright has run out
// (folk songs, or composers dead for more than seventy years), in the treble
// clef around middle C. Only the pitches ride the wagons; the values keep
// each bar full so the tunes can be reused by rhythm lessons later.

import { parseNote } from '../../../music/notes'
import type { Tune } from '../../../rhythm/plan'

export const GOING_HOME: Tune = {
  title: 'Eve Dönüş',
  original: 'Goin’ Home (Largo)',
  origin: 'Antonín Dvořák, Yeni Dünya Senfonisi, 1893',
  fact: 'Dvořák bu ezgiyi Amerika’dayken, yurdunu özleyerek yazdı; Neil Armstrong Ay’a giderken senfoninin kaydını yanında götürdü.',
  notes:
    'E4/q G4/q G4/h | E4/q D4/q C4/h | D4/q E4/q G4/q E4/q | D4/w | ' +
    'E4/q G4/q G4/h | E4/q D4/q C4/h | D4/q E4/q D4/q C4/q | C4/w',
}

export const ROW_BOAT: Tune = {
  title: 'Kürek Çek',
  original: 'Row, Row, Row Your Boat',
  origin: 'Amerikan çocuk şarkısı, 1852',
  fact: 'Dört kişi sırayla girince kendi kendine çok sesli olan ünlü bir kanondur; ilk kez 1852’de basıldı.',
  notes:
    'C4/h C4/h | C4/q D4/q E4/h | E4/q D4/q E4/q F4/q | G4/w | ' +
    'C5/e C5/e C5/e G4/e G4/e G4/e E4/e E4/e | E4/e C4/e C4/e C4/e G4/q F4/q | E4/q D4/q C4/h',
}

export const OLD_MACDONALD: Tune = {
  title: 'Yaşlı MacDonald’ın Çiftliği',
  original: 'Old MacDonald Had a Farm',
  origin: 'Amerikan halk şarkısı, ilk basımı 1917',
  fact: 'Her kıtada çiftliğe yeni bir hayvan gelir ve onun sesi eklenir; şarkının İngiltere’de daha eski bir atası vardır.',
  notes: 'F4/q F4/q F4/q C4/q | D4/q D4/q C4/h | A4/q A4/q G4/q G4/q | F4/w',
}

export const MORNING_MOOD: Tune = {
  title: 'Sabah',
  original: 'Morgenstemning',
  origin: 'Edvard Grieg, Peer Gynt, 1875',
  fact: 'Grieg bu müziği bir oyunda güneşin doğduğu sahne için yazdı; ezgi flütten obuaya geçerek gökyüzü gibi aydınlanır.',
  notes:
    'G4/q E4/q D4/q C4/q | D4/q E4/q G4/q E4/q | D4/q C4/q D4/q E4/q | ' +
    'D4/q E4/q G4/q E4/q | G4/q A4/q E4/q A4/q | G4/q E4/q D4/q C4/q',
}

export const SUSANNA: Tune = {
  title: 'Ah Susanna',
  original: 'Oh! Susanna',
  origin: 'Stephen Foster, ABD, 1848',
  fact: 'Altına Hücum yıllarında Kaliforniya’ya giden yolcuların dilinden düşmeyen şarkı oldu; Foster’ın ilk büyük başarısıdır.',
  notes:
    'C4/e D4/e E4/q G4/q G4/q | A4/q G4/q E4/q C4/q | D4/q E4/q E4/q D4/q | C4/q D4/hd | ' +
    'C4/e D4/e E4/q G4/q G4/q | A4/q G4/q E4/q C4/q | D4/q E4/q E4/q D4/q | D4/q C4/hd',
}

export const ALOUETTE: Tune = {
  title: 'Tarlakuşu',
  original: 'Alouette',
  origin: 'Fransız-Kanada halk şarkısı, 19. yüzyıl',
  fact: 'Kanada’da kürk tüccarlarının kano çekerken tempo tutmak için söylediği şarkılardan biri olduğu anlatılır.',
  notes:
    'G4/q A4/q B4/q B4/q | A4/q G4/q A4/q B4/q | G4/h D4/h | ' + 'G4/q A4/q B4/q B4/q | A4/q G4/q A4/q B4/q | G4/w',
}

/** 3/4. */
export const BRAHMS_LULLABY: Tune = {
  title: 'Ninni',
  original: 'Wiegenlied (Guten Abend, gut’ Nacht)',
  origin: 'Johannes Brahms, 1868',
  fact: 'Brahms bu ninniyi bir arkadaşının yeni doğan oğlu için yazdı; dünyada en çok söylenen ninnilerden biridir.',
  notes:
    'E4/q E4/q G4/q | E4/q E4/q G4/q | E4/q G4/q C5/q | B4/h A4/q | A4/h G4/q | D4/q E4/q F4/q | ' +
    'D4/q D4/q E4/q | F4/h D4/q | F4/q B4/q A4/q | G4/h B4/q | C5/hd',
}

/** The pitches of a tune in order (rests left out). */
export const tunePitches = (tune: Tune): number[] =>
  tune.notes
    .split(/[\s|]+/)
    .filter((token) => token.includes('/'))
    .map((token) => parseNote(token.split('/')[0]))
