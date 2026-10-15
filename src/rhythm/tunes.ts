// Well-known songs whose copyright has run out (anonymous folk songs, or
// composers dead for more than seventy years), simplified to the five-finger
// position and to the note values learnt so far. Each one supports a rhythm
// pattern; the learner sees its original title and where it comes from.

import type { Tune } from './plan'

/** Quarters: the opening phrase, sung twice in the song. */
export const FRERE_JACQUES_OPENING: Tune = {
  title: 'Uyuyor musun? (ilk cümle)',
  original: 'Frère Jacques',
  origin: 'Fransız halk şarkısı, 18. yüzyıl',
  fact: 'Dünyanın en bilinen kanonlarından: aynı ezgiye sırayla giren sesler birbirine karışmadan söyler.',
  notes: 'C4/q D4/q E4/q C4/q | C4/q D4/q E4/q C4/q',
}

export const TWINKLE: Tune = {
  title: 'Küçük Yıldız',
  original: 'Ah ! vous dirai-je, maman',
  origin: 'Fransız halk ezgisi, 1761',
  fact: "Mozart bu ezgi üzerine on iki çeşitleme yazdı; İngilizce sözleri 'Twinkle, Twinkle, Little Star' diye bilinir.",
  notes: 'C4/q C4/q G4/q G4/q | A4/q A4/q G4/h | F4/q F4/q E4/q E4/q | D4/q D4/q C4/h',
}

/** Ode to Joy with plain halves; the dotted rhythm comes in its own lesson later. */
export const ODE_SIMPLE: Tune = {
  title: 'Neşeye Övgü',
  original: 'An die Freude',
  origin: 'Ludwig van Beethoven, 9. Senfoni, 1824',
  fact: 'Beethoven bu senfoniyi neredeyse hiç duyamazken yazdı. Ezgi bugün Avrupa Birliği’nin marşıdır.',
  notes:
    'E4/q E4/q F4/q G4/q | G4/q F4/q E4/q D4/q | C4/q C4/q D4/q E4/q | E4/q D4/q D4/h | ' +
    'E4/q E4/q F4/q G4/q | G4/q F4/q E4/q D4/q | C4/q C4/q D4/q E4/q | D4/q C4/q C4/h',
}

export const AU_CLAIR: Tune = {
  title: 'Ay Işığında',
  original: 'Au clair de la lune',
  origin: 'Fransız halk şarkısı, 18. yüzyıl',
  fact: '1860’ta bir Fransız mucidin kaydettiği bu şarkı, bilinen en eski insan sesi kaydıdır.',
  notes: 'C4/q C4/q C4/q D4/q | E4/h D4/h | C4/q E4/q D4/q D4/q | C4/w',
}

export const MARY_LAMB: Tune = {
  title: 'Ufak Kuzu',
  original: 'Mary Had a Little Lamb',
  origin: 'Amerikan çocuk şarkısı, Lowell Mason, 1830',
  fact: 'Edison 1877’de icat ettiği fonografa ilk olarak bu şarkının sözlerini kaydetti.',
  notes:
    'E4/q D4/q C4/q D4/q | E4/q E4/q E4/h | D4/q D4/q D4/h | E4/q G4/q G4/h | ' +
    'E4/q D4/q C4/q D4/q | E4/q E4/q E4/q E4/q | D4/q D4/q E4/q D4/q | C4/w',
}

/** Hot Cross Buns as it is sung in rhythm classes: a rest after each call. */
export const HOT_CROSS_BUNS_RESTS: Tune = {
  title: 'Sıcak Çörekler (esli)',
  original: 'Hot Cross Buns',
  origin: 'İngiliz sokak satıcısı türküsü, 18. yüzyıl',
  fact: 'Londra sokaklarında çörek satanların bağırarak söylediği bir satış çağrısıydı.',
  notes: 'E4/q D4/q C4/q qr | E4/q D4/q C4/q qr | C4/q C4/q D4/q D4/q | E4/q D4/q C4/q qr',
}

/** Twinkle with every long note cut to a quarter and a rest: say one beat, keep one silent. */
export const TWINKLE_RESTS: Tune = {
  ...TWINKLE,
  title: 'Küçük Yıldız (esli)',
  fact: 'Bu kez uzun notaların yarısında susuyoruz: bir vuruş çal, bir vuruş dinle.',
  notes: 'C4/q C4/q G4/q G4/q | A4/q A4/q G4/q qr | F4/q F4/q E4/q E4/q | D4/q D4/q C4/q qr',
}

export const HOT_CROSS_BUNS: Tune = {
  title: 'Sıcak Çörekler',
  original: 'Hot Cross Buns',
  origin: 'İngiliz sokak satıcısı türküsü, 18. yüzyıl',
  fact: "Üçüncü ölçüdeki sekizlikler satıcının 'bir peniye bir, iki peniye bir' diye hızlı hızlı söylediği yer.",
  notes: 'E4/q D4/q C4/h | E4/q D4/q C4/h | C4/e C4/e C4/e C4/e D4/e D4/e D4/e D4/e | E4/q D4/q C4/h',
}

export const FRERE_JACQUES: Tune = {
  ...FRERE_JACQUES_OPENING,
  title: 'Uyuyor musun?',
  fact: 'Çan seslerini anlatan beşinci ölçüdeki sekizlikler, şarkının en hareketli yeri.',
  notes:
    'C4/q D4/q E4/q C4/q | C4/q D4/q E4/q C4/q | E4/q F4/q G4/h | E4/q F4/q G4/h | ' +
    'G4/e A4/e G4/e F4/e E4/q C4/q | G4/e A4/e G4/e F4/e E4/q C4/q | C4/q G3/q C4/h | C4/q G3/q C4/h',
}

/** 3/4: the waltz's opening call and its two answering notes. */
export const BLUE_DANUBE: Tune = {
  title: 'Mavi Tuna',
  original: 'An der schönen blauen Donau',
  origin: 'Johann Strauss II, vals, 1866',
  fact: 'Viyana’da her yılbaşı konserinin sonunda çalınır; 2001: Bir Uzay Destanı filminde uzayda süzülen gemilerin müziğidir.',
  notes:
    'C4/q C4/q E4/q | G4/hd | qr G4/q G4/q | qr E4/q E4/q | ' + 'C4/q C4/q E4/q | G4/hd | qr A4/q A4/q | qr F4/q F4/q',
}

/** 3/4 with eighths: the first four bars, moved from Sol to Do. */
export const MINUET: Tune = {
  title: 'Menüet',
  original: 'Menuet in G, BWV Anh. 114',
  origin: 'Christian Petzold, 1725 (Anna Magdalena Bach’ın nota defterinden)',
  fact: 'Uzun yıllar Bach’ın sanıldı; asıl bestecisinin Dresdenli orgcu Petzold olduğu 1970’lerde anlaşıldı.',
  notes: 'G4/q C4/e D4/e E4/e F4/e | G4/q C4/q C4/q | A4/q F4/e G4/e A4/e B4/e | C5/q C4/q C4/q',
}

export const LONDON_BRIDGE: Tune = {
  title: 'Londra Köprüsü',
  original: 'London Bridge Is Falling Down',
  origin: 'İngiliz halk şarkısı, 17. yüzyıl',
  fact: 'Şarkıdaki köprü, Thames üzerinde yüzyıllar boyunca defalarca yıkılıp yeniden yapılan eski Londra Köprüsü.',
  notes:
    'G4/qd A4/e G4/q F4/q | E4/q F4/q G4/h | D4/q E4/q F4/h | E4/q F4/q G4/h | ' +
    'G4/qd A4/e G4/q F4/q | E4/q F4/q G4/h | D4/h G4/h | E4/q C4/hd',
}

export const ODE: Tune = {
  ...ODE_SIMPLE,
  title: 'Neşeye Övgü (aslı gibi)',
  fact: 'Bu kez Beethoven’ın yazdığı gibi: dördüncü ölçüde noktalı dörtlük ve bir sekizlik var.',
  notes:
    'E4/q E4/q F4/q G4/q | G4/q F4/q E4/q D4/q | C4/q C4/q D4/q E4/q | E4/qd D4/e D4/h | ' +
    'E4/q E4/q F4/q G4/q | G4/q F4/q E4/q D4/q | C4/q C4/q D4/q E4/q | D4/qd C4/e C4/h',
}

export const JINGLE_BELLS: Tune = {
  title: 'Çanlar Çalıyor',
  original: 'Jingle Bells',
  origin: 'James Lord Pierpont, 1857',
  fact: '1965’te Gemini 6 astronotlarının ağız mızıkası ve çıngırakla çaldığı bu şarkı, uzayda çalınan ilk şarkı oldu.',
  notes:
    'E4/q E4/q E4/h | E4/q E4/q E4/h | E4/q G4/q C4/qd D4/e | E4/w | ' +
    'F4/q F4/q F4/qd F4/e | F4/q E4/q E4/q E4/e E4/e | E4/q D4/q D4/q E4/q | D4/h G4/h',
}
