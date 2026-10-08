import { afterEach, describe, expect, it, vi } from 'vitest'
import { gameNow, gameTimeout, isPaused, pauseGame, resumeGame, toGameTime } from './gameClock'

describe('game clock', () => {
  afterEach(() => {
    resumeGame()
    vi.useRealTimers()
  })

  it('stands still while paused and timers wait out the pause', () => {
    vi.useFakeTimers()
    const start = gameNow()
    const fired = vi.fn()
    gameTimeout(fired, 1000)
    vi.advanceTimersByTime(400)
    pauseGame()
    expect(isPaused()).toBe(true)
    vi.advanceTimersByTime(5000)
    expect(fired).not.toHaveBeenCalled()
    expect(gameNow() - start).toBeCloseTo(400, -1)
    resumeGame()
    vi.advanceTimersByTime(590)
    expect(fired).not.toHaveBeenCalled()
    vi.advanceTimersByTime(20)
    expect(fired).toHaveBeenCalledOnce()
    // A timestamp taken after the pause lands right after the pause on the game clock.
    expect(toGameTime(performance.now())).toBeCloseTo(gameNow(), 0)
  })

  it('cancels timers', () => {
    vi.useFakeTimers()
    const fired = vi.fn()
    const cancel = gameTimeout(fired, 100)
    cancel()
    vi.advanceTimersByTime(200)
    expect(fired).not.toHaveBeenCalled()
  })
})
