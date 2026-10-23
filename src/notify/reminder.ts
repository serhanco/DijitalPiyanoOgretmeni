// Seri hatırlatması (phase 17): in the Android app, a notification in the
// evening on days nothing was played yet. Local notifications need no server;
// the next week's are scheduled again at every start and after every lesson.

import { currentStreak, dayKey } from '../progress/gamification'
import { isNativeApp } from '../midi/nativeMidi'
import { useProfile } from '../state/profile'
import { useSettings } from '../state/settings'

/** How many days ahead are scheduled (the app is opened more often than that). */
export const REMINDER_DAYS = 7
/** Notification ids 1700…1706, so they never clash with others. */
const FIRST_ID = 1700

/** The reminder times of the next days: today too when nothing was played yet and the hour is still ahead. */
export function reminderTimes(now: Date, hour: number, playedToday: boolean, days = REMINDER_DAYS): Date[] {
  const out: Date[] = []
  for (let i = 0; out.length < days && i <= days; i++) {
    const at = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i, hour, 0, 0)
    if (i === 0 && (playedToday || at <= now)) continue
    out.push(at)
  }
  return out
}

/** The text: the streak at risk when there is one. */
export function reminderText(streak: number): { title: string; body: string } {
  return streak > 0
    ? { title: `🔥 ${streak} günlük serin bekliyor`, body: 'Notiş hazır: birkaç dakikalık bir ders seriyi korur.' }
    : { title: '🎹 Piyano zamanı', body: 'Bugün birkaç dakika çalalım mı? Notiş seni bekliyor.' }
}

/** Schedule (or cancel) the reminders by the setting. Only in the Android app. */
export async function scheduleReminders(now = new Date()): Promise<void> {
  if (!isNativeApp()) return
  const { LocalNotifications } = await import('@capacitor/local-notifications')
  const ids = Array.from({ length: REMINDER_DAYS }, (_, i) => ({ id: FIRST_ID + i }))
  await LocalNotifications.cancel({ notifications: ids }).catch(() => undefined)
  const { reminder } = useSettings.getState()
  if (!reminder.on) return
  const perm = await LocalNotifications.checkPermissions()
  if (perm.display !== 'granted' && (await LocalNotifications.requestPermissions()).display !== 'granted') return
  const { streak } = useProfile.getState()
  const today = dayKey(now)
  const text = reminderText(currentStreak(streak, today))
  await LocalNotifications.schedule({
    notifications: reminderTimes(now, reminder.hour, streak.lastDay === today).map((at, i) => ({
      id: FIRST_ID + i,
      ...text,
      schedule: { at },
    })),
  })
}
