// Oyun arası Notiş: the first time a game opens, Notiş tells its rule in two
// sentences and shows one move in three steps. Seen games are remembered on
// this device (like the welcome), so the rule is told once.

import type { LessonKind } from './noteHunter/lessons'

export interface GameIntro {
  name: string
  /** Two sentences: what happens and what to do. */
  rule: string
  /** One move, step by step: an icon and a few words each. */
  steps: [string, string][]
}

export const GAME_INTROS: Partial<Record<LessonKind, GameIntro>> = {
  bird: {
    name: 'Nota Kuşu',
    rule: 'Kuş borulardaki boşluktan geçmek istiyor. Boşluğun notasını oku ve tuşuna bas, kuş oraya uçsun!',
    steps: [
      ['🎵', 'Boşluktaki notayı oku'],
      ['🎹', 'Tuşuna bas'],
      ['🐦', 'Kuş boşluktan geçer'],
    ],
  },
  balloon: {
    name: 'Balon Patlatma',
    rule: 'Balonlar yükseliyor, her birinde bir nota var. En üstteki balonun notasını çal ve yolcuyu kurtar!',
    steps: [
      ['🎈', 'En üstteki notayı oku'],
      ['🎹', 'Tuşuna bas'],
      ['🪂', 'Balon patlar, yolcu iner'],
    ],
  },
  bar: {
    name: 'Nota Barmeni',
    rule: 'Müşteriler tezgâha yürüyor, kartlarında bir nota var. Notayı çal, içecek kaysın; bara varan müşteri kızar!',
    steps: [
      ['🐻', 'Bara en yakın kartı oku'],
      ['🎹', 'Notasını çal'],
      ['🍹', 'İçecek müşteriye kayar'],
    ],
  },
  train: {
    name: 'Nota Treni',
    rule: 'Vagonlar sinyale doğru geliyor. Öndeki vagonun notasını çal, lokomotife bağlansın!',
    steps: [
      ['🚃', 'Öndeki vagonu oku'],
      ['🎹', 'Notasını çal'],
      ['🔗', 'Vagon bağlanır'],
    ],
  },
  chirp: {
    name: 'Kayıp Kuş Sesi',
    rule: 'Kuş bir nota ötüyor ama notayı göremezsin. Kulağınla bul, tuşuna bas, kuş yuvasına dönsün!',
    steps: [
      ['🔊', 'Ötüşü dinle'],
      ['🎹', 'Aynı sesi tuşlarda bul'],
      ['🪺', 'Kuş yuvasına döner'],
    ],
  },
  frog: {
    name: 'Kurbağa Atlayışı',
    rule: 'Kurbağa yapraktan yaprağa zıplıyor, balon kaç basamak zıplayacağını söylüyor. Çizgi ve araları say, indiği notayı çal!',
    steps: [
      ['🐸', 'Zıplamayı oku: ↑ 3’lü'],
      ['🔢', 'Çizgi ve araları say'],
      ['🎹', 'İndiği notayı çal'],
    ],
  },
  chef: {
    name: 'Akor Aşçısı',
    rule: 'Tarifte bir akor var, malzemeleri onun notaları. Notalara birlikte bas, yemek pişsin!',
    steps: [
      ['📜', 'Tarifteki akoru oku'],
      ['🎹', 'Notalara aynı anda bas'],
      ['🍲', 'Yemek hazır'],
    ],
  },
  space: {
    name: 'Uzay Savunması',
    rule: 'İstilacılar birer akor taşıyor. Birinin akorunu çal, topun onu vursun!',
    steps: [
      ['👾', 'İstilacının akorunu oku'],
      ['🎹', 'Notalara birlikte bas'],
      ['🚀', 'Top ateş eder'],
    ],
  },
  chordbar: {
    name: 'Akor Barmeni',
    rule: 'Müşteriler bu kez akor istiyor. Karttaki akoru çal, içkisi kaysın!',
    steps: [
      ['🐱', 'Karttaki akoru oku'],
      ['🎹', 'Notalara birlikte bas'],
      ['🍸', 'İçki kayar'],
    ],
  },
  dino: {
    name: 'Dino Koşusu',
    rule: 'Engeller vuruşla birlikte Dino’ya geliyor. Engel Dino’ya vardığı vuruşta bas, Dino zıplasın!',
    steps: [
      ['🥁', 'Vuruşu say: 1, 2, 3, 4'],
      ['🌵', 'Engel yaklaşır'],
      ['🦖', 'Tam vuruşta bas, Dino zıplar'],
    ],
  },
  drum: {
    name: 'Ritim Davulcusu',
    rule: 'Notalar davullara doğru iniyor. Davula değdikleri anda bas, tam vuruşta çal!',
    steps: [
      ['⬇️', 'Nota davula iner'],
      ['🥁', 'Değdiği anı bekle'],
      ['🎹', 'Tam o anda bas'],
    ],
  },
  ladder: {
    name: 'Gam Merdiveni',
    rule: 'Gam bir merdiven, her vuruşta bir basamak. Sıradaki notayı vuruşunda çal, tırmanıcı çıksın!',
    steps: [
      ['🪜', 'Sıradaki basamağı oku'],
      ['🥁', 'Vuruşu bekle'],
      ['🎹', 'Çal, tırmanıcı zıplar'],
    ],
  },
  surf: {
    name: 'Arpej Sörfü',
    rule: 'Arpej bir dalga çiziyor, şamandıralarda notaları var. Her şamandırayı vuruşunda çal, sörfçü dalgada kalsın!',
    steps: [
      ['🌊', 'Şamandıradaki notayı oku'],
      ['🥁', 'Vuruşu bekle'],
      ['🏄', 'Çal, sörfçü kayar'],
    ],
  },
  duet: {
    name: 'Çift Kişilik Davul',
    rule: 'Notiş bir ölçü çalar, sen sonraki ölçüde cevap verirsin. Önce aynısını tekrarla, sonra kendi ritmini uydur!',
    steps: [
      ['🎧', 'Notiş’i dinle'],
      ['🔁', 'Aynısını çal'],
      ['🎶', 'Sonra kendi ritmin'],
    ],
  },
  memory: {
    name: 'Melodi Hafızası',
    rule: 'Notiş kısa bir melodi çalar ve tuşları yakar. Aynısını çal; her turda melodi bir nota uzar!',
    steps: [
      ['👀', 'Dinle ve izle'],
      ['🎹', 'Aynı sırayla çal'],
      ['➕', 'Melodi uzar'],
    ],
  },
}

const KEY = 'dpo-intros'

/** Games whose rule Notiş already told on this device; `'off'` turns the intros off (browser tests). */
function seen(): Set<string> | 'off' {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw === 'off') return 'off'
    return new Set(raw ? (JSON.parse(raw) as string[]) : [])
  } catch {
    return 'off'
  }
}

/** The intro to show before this game, or null when it was told already (or the kind has none). */
export function introFor(kind: LessonKind | undefined): GameIntro | null {
  const intro = kind ? GAME_INTROS[kind] : undefined
  if (!intro) return null
  const s = seen()
  return s === 'off' || s.has(kind!) ? null : intro
}

export function markIntroSeen(kind: LessonKind): void {
  const s = seen()
  if (s === 'off') return
  s.add(kind)
  try {
    localStorage.setItem(KEY, JSON.stringify([...s]))
  } catch {
    // Without storage the intro shows again next time.
  }
}
