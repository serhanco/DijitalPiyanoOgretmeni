// Altın balon / altın müşteri: now and then a golden target that is worth
// extra points, and extra XP when it is played right on the first try.
// İpucu parıltısı: the urgent target's key glows when it is about to get
// away; a glowing answer no longer counts as right on the first try. Pure.

import { firstTryOk, type PromptRecord } from '../noteHunter/session'

/** The fifth target is the first golden one, then every seventh. */
const GOLDEN_FROM = 4
const GOLDEN_EVERY = 7
/** Points for a golden target (instead of 1), doubled during a surprise like any other. */
export const GOLDEN_POINTS = 3

export const isGoldenIndex = (i: number) => i >= GOLDEN_FROM && (i - GOLDEN_FROM) % GOLDEN_EVERY === 0

/** Marks the golden targets of a game. */
export function markGolden(records: PromptRecord[]): void {
  records.forEach((r, i) => {
    if (isGoldenIndex(i)) r.golden = true
  })
}

/** Golden targets met so far and the ones played right on the first try. */
export function goldenStats(records: PromptRecord[]): { shown: number; caught: number } {
  const golden = records.filter((r) => r.golden && r.shownAt !== null)
  return { shown: golden.length, caught: golden.filter((r) => r.answeredAt !== null && firstTryOk(r)).length }
}

/** Glows the key of `record` if it is still open; the answer then counts as hinted. */
export function hintFor(record: PromptRecord | null | undefined): PromptRecord | null {
  if (!record || record.answeredAt !== null || record.missed) return null
  record.hinted = true
  return record
}
