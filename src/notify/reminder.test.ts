import { describe, expect, it } from 'vitest'
import { reminderText, reminderTimes } from './reminder'

describe('streak reminders', () => {
  it('skips today once played or past the hour', () => {
    const morning = new Date(2026, 9, 23, 9)
    expect(reminderTimes(morning, 19, false, 3).map((d) => d.getDate())).toEqual([23, 24, 25])
    expect(reminderTimes(morning, 19, true, 3).map((d) => d.getDate())).toEqual([24, 25, 26])
    expect(reminderTimes(new Date(2026, 9, 23, 20), 19, false, 2).map((d) => [d.getDate(), d.getHours()])).toEqual([
      [24, 19],
      [25, 19],
    ])
  })

  it('names the streak when there is one', () => {
    expect(reminderText(4).title).toContain('4 günlük')
    expect(reminderText(0).title).toBe('🎹 Piyano zamanı')
  })
})
