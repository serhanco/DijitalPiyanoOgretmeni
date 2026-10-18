// Kostüm dolabı: costumes for Notiş, opened by levels and badges. The one the
// learner picks shows on Notiş everywhere (map, lessons, games). Pure.

export type CostumeId =
  'party' | 'flower' | 'scarf' | 'bow' | 'glasses' | 'headphones' | 'chef' | 'detective' | 'wizard' | 'crown'

export interface Costume {
  id: CostumeId
  name: string
  icon: string
  /** What opens it, shown on a locked costume. */
  need: string
  /** A level, or a badge id. */
  level?: number
  badge?: string
}

export const COSTUMES: Costume[] = [
  { id: 'party', name: 'Parti Şapkası', icon: '🥳', need: '2. seviyeye çık', level: 2 },
  { id: 'flower', name: 'Çiçek', icon: '🌸', need: '3 günlük seri yap (Isınıyoruz rozeti)', badge: 'streak-3' },
  { id: 'scarf', name: 'Atkı', icon: '🧣', need: '4. seviyeye çık', level: 4 },
  { id: 'bow', name: 'Papyon', icon: '🎀', need: '10 ders bitir (Çalışkan rozeti)', badge: 'lessons-10' },
  { id: 'glasses', name: 'Güneş Gözlüğü', icon: '🕶️', need: '6. seviyeye çık', level: 6 },
  { id: 'headphones', name: 'Kulaklık', icon: '🎧', need: 'Metronom Gibi rozetini kazan', badge: 'metronome' },
  { id: 'chef', name: 'Aşçı Şapkası', icon: '👨‍🍳', need: 'Akor Şefi rozetini kazan', badge: 'chef' },
  { id: 'detective', name: 'Dedektif Şapkası', icon: '🕵️', need: 'Keskin Kulak rozetini kazan', badge: 'sharp-ear' },
  { id: 'wizard', name: 'Büyücü Şapkası', icon: '🧙', need: '10. seviyeye çık', level: 10 },
  { id: 'crown', name: 'Taç', icon: '👑', need: 'Bir ünite boss’unu yen (Boss Avcısı rozeti)', badge: 'boss-hunter' },
]

export interface WardrobeContext {
  level: number
  /** Badge ids earned. */
  badges: string[]
}

export function costumeOpen(c: Costume, ctx: WardrobeContext): boolean {
  if (c.level !== undefined) return ctx.level >= c.level
  return !!c.badge && ctx.badges.includes(c.badge)
}

export const openCostumes = (ctx: WardrobeContext) => COSTUMES.filter((c) => costumeOpen(c, ctx))

/** Costumes that opened between two moments (after a lesson). */
export function newCostumes(before: WardrobeContext, after: WardrobeContext): Costume[] {
  return COSTUMES.filter((c) => !costumeOpen(c, before) && costumeOpen(c, after))
}

export const costumeById = (id: string | null | undefined) => COSTUMES.find((c) => c.id === id) ?? null
