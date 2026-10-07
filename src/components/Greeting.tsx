import { useState } from 'react'
import { currentStreak, dayKey } from '../progress/gamification'
import { useProfile } from '../state/profile'
import { Mascot, type MascotMood } from './Mascot'

function greet(hour: number): string {
  if (hour < 12) return 'Günaydın!'
  if (hour < 18) return 'İyi günler!'
  return 'İyi akşamlar!'
}

/** Notiş greets the learner on the lesson map with a context-aware line. */
export function Greeting() {
  const { lessonsCompleted, streak, daily, dailyGoal } = useProfile()
  const [now] = useState(() => new Date())
  const today = dayKey(now)
  const hour = now.getHours()
  const xpToday = daily.day === today ? daily.xp : 0
  const streakNow = currentStreak(streak, today)

  let mood: MascotMood = 'idle'
  let say: string
  if (hour >= 23 || hour < 6) {
    mood = 'sleep'
    say = 'Zzz… Geç oldu, ama kısa bir ders iyi gelir.'
  } else if (lessonsCompleted === 0) {
    mood = 'happy'
    say = 'Merhaba, ben Notiş! Hadi ilk dersimize başlayalım.'
  } else if (xpToday >= dailyGoal) {
    mood = 'cheer'
    say = 'Bugünkü hedefini tamamladın, harikasın!'
  } else if (streakNow > 0 && streak.lastDay !== today) {
    mood = 'think'
    say = `${streakNow} günlük serini korumak için bugün bir ders yapalım! 🔥`
  } else {
    say = `${greet(hour)} Hedefe ${dailyGoal - xpToday} XP kaldı.`
  }

  return (
    <div className="greeting">
      <Mascot mood={mood} size={92} />
      <p className="greeting-say">{say}</p>
    </div>
  )
}
