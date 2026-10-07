// Pure rules for XP, levels, streaks and badges. No storage, no React.

export const XP_PER_FIRST_TRY = 2
export const XP_LESSON_COMPLETE = 10
export const XP_PERFECT_BONUS = 10
export const XP_SPEED_BONUS = 5
/** Average reaction under this (with high accuracy) earns the speed bonus. */
export const SPEED_BONUS_MS = 1500
export const DEFAULT_DAILY_GOAL = 30
export const HEARTS_PER_LESSON = 5

export interface LessonOutcome {
  lessonId: string
  total: number
  firstTry: number
  accuracy: number
  avgReactionMs: number | null
  stars: number
  /** True when the lesson ended because the hearts ran out. */
  failed: boolean
  /** Rhythm lessons: `firstTry` counts notes played on the beat (and rests kept). */
  rhythm?: boolean
}

export interface XpLine {
  label: string
  xp: number
}

export function xpFor(outcome: LessonOutcome): XpLine[] {
  const label = outcome.rhythm ? 'Vuruşunda çalınan notalar' : 'İlk denemede doğru notalar'
  const lines: XpLine[] = [{ label, xp: outcome.firstTry * XP_PER_FIRST_TRY }]
  if (outcome.failed) return lines
  lines.push({ label: 'Ders tamamlandı', xp: XP_LESSON_COMPLETE })
  if (outcome.accuracy === 1) lines.push({ label: 'Hatasız ders', xp: XP_PERFECT_BONUS })
  if (outcome.accuracy >= 0.9 && outcome.avgReactionMs !== null && outcome.avgReactionMs < SPEED_BONUS_MS) {
    lines.push({ label: 'Hız bonusu', xp: XP_SPEED_BONUS })
  }
  return lines
}

export const sumXp = (lines: XpLine[]) => lines.reduce((n, l) => n + l.xp, 0)

/** XP needed to go from `level` to `level + 1`. Grows gently. */
export function xpForNextLevel(level: number): number {
  return 50 + (level - 1) * 25
}

export function levelFromXp(totalXp: number): { level: number; intoLevel: number; needed: number } {
  let level = 1
  let rest = totalXp
  while (rest >= xpForNextLevel(level)) {
    rest -= xpForNextLevel(level)
    level++
  }
  return { level, intoLevel: rest, needed: xpForNextLevel(level) }
}

/** Local calendar day as YYYY-MM-DD. */
export function dayKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number)
  const [by, bm, bd] = b.split('-').map(Number)
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000)
}

export interface Streak {
  count: number
  best: number
  lastDay: string | null
}

/** Streak after practising on `today`. */
export function extendStreak(streak: Streak, today: string): Streak {
  if (streak.lastDay === today) return streak
  const gap = streak.lastDay ? daysBetween(streak.lastDay, today) : Infinity
  const count = gap === 1 ? streak.count + 1 : 1
  return { count, best: Math.max(streak.best, count), lastDay: today }
}

/** Streak as it should be displayed on `today` (0 once a day was missed). */
export function currentStreak(streak: Streak, today: string): number {
  if (!streak.lastDay) return 0
  return daysBetween(streak.lastDay, today) <= 1 ? streak.count : 0
}

export interface BadgeContext {
  totalXp: number
  streak: number
  lessonsCompleted: number
  outcome: LessonOutcome
  /** Lesson ids with 3 stars, after this lesson. */
  threeStarLessons: string[]
  allTrebleLessonIds: string[]
}

export interface Badge {
  id: string
  title: string
  description: string
  icon: string
  earned: (c: BadgeContext) => boolean
}

export const BADGES: Badge[] = [
  {
    id: 'first-lesson',
    title: 'İlk Nota',
    description: 'İlk dersini tamamla',
    icon: '🎵',
    earned: (c) => c.lessonsCompleted >= 1,
  },
  {
    id: 'perfect',
    title: 'Kusursuz',
    description: 'Bir dersi hiç hata yapmadan bitir',
    icon: '💎',
    earned: (c) => !c.outcome.failed && c.outcome.accuracy === 1,
  },
  {
    id: 'speedy',
    title: 'Şimşek Parmaklar',
    description: '%90 üstü doğrulukla ortalama 1 saniyenin altında yanıt ver',
    icon: '⚡',
    earned: (c) => !c.outcome.failed && c.outcome.accuracy >= 0.9 && (c.outcome.avgReactionMs ?? Infinity) < 1000,
  },
  {
    id: 'metronome',
    title: 'Metronom Gibi',
    description: 'Bir ritim dersini %90 üstü zamanlamayla bitir',
    icon: '🥁',
    earned: (c) => c.outcome.lessonId.startsWith('rhythm') && !c.outcome.failed && c.outcome.accuracy >= 0.9,
  },
  { id: 'streak-3', title: 'Isınıyoruz', description: '3 günlük seri yap', icon: '🔥', earned: (c) => c.streak >= 3 },
  { id: 'streak-7', title: 'Bir Hafta', description: '7 günlük seri yap', icon: '🏅', earned: (c) => c.streak >= 7 },
  { id: 'xp-100', title: 'Yüzlük', description: '100 XP topla', icon: '⭐', earned: (c) => c.totalXp >= 100 },
  { id: 'xp-500', title: 'Beş Yüz', description: '500 XP topla', icon: '🌟', earned: (c) => c.totalXp >= 500 },
  {
    id: 'lessons-10',
    title: 'Çalışkan',
    description: '10 ders tamamla',
    icon: '📚',
    earned: (c) => c.lessonsCompleted >= 10,
  },
  {
    id: 'treble-master',
    title: 'Sol Anahtarı Ustası',
    description: 'Sol anahtarındaki tüm dersleri 3 yıldızla bitir',
    icon: '🎼',
    earned: (c) => c.allTrebleLessonIds.every((id) => c.threeStarLessons.includes(id)),
  },
]

export function newlyEarnedBadges(ctx: BadgeContext, alreadyEarned: Iterable<string>): Badge[] {
  const have = new Set(alreadyEarned)
  return BADGES.filter((b) => !have.has(b.id) && b.earned(ctx))
}
