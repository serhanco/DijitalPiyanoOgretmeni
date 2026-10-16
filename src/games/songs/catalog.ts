// The songs of unit 9. Only anonymous folk songs and works by composers dead
// for more than seventy years, in Do majör, each shown with its original
// title and where it comes from. The left hand keeps to long bass notes
// (Do, Fa, Sol) so the first two-hand songs stay within reach.

import { JINGLE_BELLS, MARY_LAMB, ODE_SIMPLE } from '../../rhythm/tunes'
import type { Song } from './song'

export const MARY: Song = {
  ...MARY_LAMB,
  id: 'mary',
  beatsPerBar: 4,
  bpm: 76,
  left: 'C3/w | C3/w | G3/w | C3/w | C3/w | C3/w | G3/w | C3/w',
  sections: [4, 4],
}

export const TWINKLE_SONG: Song = {
  id: 'twinkle',
  title: 'Küçük Yıldız',
  original: 'Ah ! vous dirai-je, maman',
  origin: 'Fransız halk ezgisi, 1761',
  fact: "Mozart bu ezgi üzerine on iki çeşitleme yazdı; İngilizce sözleriyle 'Twinkle, Twinkle, Little Star' diye bilinir.",
  beatsPerBar: 4,
  bpm: 80,
  notes:
    'C4/q C4/q G4/q G4/q | A4/q A4/q G4/h | F4/q F4/q E4/q E4/q | D4/q D4/q C4/h | ' +
    'G4/q G4/q F4/q F4/q | E4/q E4/q D4/h | G4/q G4/q F4/q F4/q | E4/q E4/q D4/h | ' +
    'C4/q C4/q G4/q G4/q | A4/q A4/q G4/h | F4/q F4/q E4/q E4/q | D4/q D4/q C4/h',
  left:
    'C3/w | F3/h C3/h | F3/h C3/h | G3/h C3/h | ' +
    'C3/h F3/h | C3/h G3/h | C3/h F3/h | C3/h G3/h | ' +
    'C3/w | F3/h C3/h | F3/h C3/h | G3/h C3/h',
  sections: [4, 4, 4],
}

export const HANSCHEN: Song = {
  id: 'hanschen',
  title: 'Küçük Hans',
  original: 'Hänschen klein',
  origin: 'Alman halk şarkısı, sözleri Franz Wiedemann, 1840',
  fact: "İngilizce 'Lightly Row' adıyla bilinir; dünyada birçok keman ve piyano kitabının ilk şarkılarındandır.",
  beatsPerBar: 4,
  bpm: 84,
  notes:
    'G4/q E4/q E4/h | F4/q D4/q D4/h | C4/q D4/q E4/q F4/q | G4/q G4/q G4/h | ' +
    'G4/q E4/q E4/h | F4/q D4/q D4/h | C4/q E4/q G4/q G4/q | C4/w | ' +
    'D4/q D4/q D4/q D4/q | D4/q E4/q F4/h | E4/q E4/q E4/q E4/q | E4/q F4/q G4/h | ' +
    'G4/q E4/q E4/h | F4/q D4/q D4/h | C4/q E4/q G4/q G4/q | C4/w',
  left:
    'C3/w | G3/w | C3/w | C3/w | ' +
    'C3/w | G3/w | C3/h G3/h | C3/w | ' +
    'G3/w | G3/w | C3/w | C3/w | ' +
    'C3/w | G3/w | C3/h G3/h | C3/w',
  sections: [4, 4, 4, 4],
}

export const ODE_SONG: Song = {
  ...ODE_SIMPLE,
  id: 'ode',
  beatsPerBar: 4,
  bpm: 84,
  left: 'C3/w | G3/w | C3/w | G3/w | C3/w | G3/w | C3/w | G3/h C3/h',
  sections: [4, 4],
}

export const YANKEE: Song = {
  id: 'yankee',
  title: 'Yankee Doodle',
  original: 'Yankee Doodle',
  origin: 'Amerikan halk şarkısı, 18. yüzyıl',
  fact: 'İngiliz askerleri Amerikalılarla alay etmek için söylerdi; Amerikalılar şarkıyı sahiplendi ve bugün Connecticut eyaletinin marşı.',
  beatsPerBar: 4,
  bpm: 92,
  notes:
    'C5/q C5/q D5/q E5/q | C5/q E5/q D5/q G4/q | C5/q C5/q D5/q E5/q | C5/h B4/h | ' +
    'C5/q C5/q D5/q E5/q | F5/q E5/q D5/q C5/q | B4/q G4/q A4/q B4/q | C5/h C5/h',
  left: 'C3/w | C3/h G3/h | C3/w | C3/h G3/h | C3/w | F3/h C3/h | G3/w | C3/w',
  sections: [4, 4],
}

export const SAINTS: Song = {
  id: 'saints',
  title: 'Azizler Yürürken',
  original: 'When the Saints Go Marching In',
  origin: 'Amerikan spiritüeli, 19. yüzyıl sonu',
  fact: 'New Orleans bandoları cenazeden dönerken bu şarkıyı neşeyle çalardı; Louis Armstrong’un 1938 kaydıyla dünyaca ünlendi.',
  beatsPerBar: 4,
  bpm: 96,
  notes:
    'qr C4/q E4/q F4/q | G4/w | qr C4/q E4/q F4/q | G4/w | ' +
    'qr C4/q E4/q F4/q | G4/h E4/h | C4/h E4/h | D4/w | ' +
    'qr E4/q E4/q D4/q | C4/hd C4/q | E4/h G4/q G4/q | F4/w | ' +
    'qr qr E4/q F4/q | G4/h E4/h | C4/h D4/h | C4/w',
  left:
    'C3/w | C3/w | C3/w | C3/w | ' +
    'C3/w | C3/w | C3/w | G3/w | ' +
    'C3/w | C3/w | C3/w | F3/w | ' +
    'C3/w | C3/w | C3/h G3/h | C3/w',
  sections: [4, 4, 4, 4],
}

/** The cello's eight notes under the violins' long notes, moved from Re to Do. */
export const CANON: Song = {
  id: 'canon',
  title: 'Kanon',
  original: 'Kanon und Gigue in D-Dur',
  origin: 'Johann Pachelbel, 1680 civarı',
  fact: 'Aynı sekiz bas notası baştan sona 28 kez tekrar eder, üç keman aynı ezgiye sırayla girer. Burada Re majörden Do majöre taşındı.',
  beatsPerBar: 4,
  bpm: 66,
  notes: 'E5/h D5/h | C5/h B4/h | A4/h G4/h | A4/h B4/h | ' + 'C5/h B4/h | A4/h G4/h | F4/h E4/h | F4/h D4/h',
  left: 'C4/h G3/h | A3/h E3/h | F3/h C3/h | F3/h G3/h | ' + 'C4/h G3/h | A3/h E3/h | F3/h C3/h | F3/h G3/h',
  sections: [4, 4],
}

export const JINGLE_SONG: Song = {
  ...JINGLE_BELLS,
  id: 'jingle',
  fact: 'Aslında bir Şükran Günü şarkısı olarak yazıldı. 1965’te Gemini 6 astronotları onu ağız mızıkası ve çıngırakla çaldı: uzayda çalınan ilk şarkı.',
  beatsPerBar: 4,
  bpm: 100,
  notes:
    JINGLE_BELLS.notes +
    ' | E4/q E4/q E4/h | E4/q E4/q E4/h | E4/q G4/q C4/qd D4/e | E4/w | ' +
    'F4/q F4/q F4/qd F4/e | F4/q E4/q E4/q E4/e E4/e | G4/q G4/q F4/q D4/q | C4/w',
  left:
    'C3/w | C3/w | C3/w | C3/w | F3/w | C3/w | G3/w | G3/w | ' +
    'C3/w | C3/w | C3/w | C3/w | F3/w | C3/w | G3/w | C3/w',
  sections: [4, 4, 4, 4],
}

/** 3/4: the first eight bars, moved from Sol to Do. */
export const MINUET_SONG: Song = {
  id: 'minuet',
  title: 'Menüet',
  original: 'Menuet in G, BWV Anh. 114',
  origin: 'Christian Petzold, 1725 (Anna Magdalena Bach’ın nota defterinden)',
  fact: 'Uzun yıllar Bach’ın sanıldı; asıl bestecisinin Dresdenli orgcu Petzold olduğu 1970’lerde anlaşıldı.',
  beatsPerBar: 3,
  bpm: 88,
  notes:
    'G4/q C4/e D4/e E4/e F4/e | G4/q C4/q C4/q | A4/q F4/e G4/e A4/e B4/e | C5/q C4/q C4/q | ' +
    'F4/q G4/e F4/e E4/e D4/e | E4/q F4/e E4/e D4/e C4/e | B3/q C4/e D4/e E4/e C4/e | D4/hd',
  left: 'C3/hd | E3/hd | F3/hd | E3/hd | F3/hd | E3/hd | G3/hd | G3/hd',
  sections: [4, 4],
}

export const SONGS: Song[] = [MARY, TWINKLE_SONG, HANSCHEN, ODE_SONG, YANKEE, SAINTS, CANON, JINGLE_SONG, MINUET_SONG]
