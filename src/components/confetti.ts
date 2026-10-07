import confetti from 'canvas-confetti'

/** Fire a burst of confetti from both sides of the screen. */
export function burstConfetti() {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
  const colors = ['#58cc02', '#1cb0f6', '#ffc800', '#ff4b4b', '#7c4dff']
  void confetti({ particleCount: 70, spread: 70, angle: 60, origin: { x: 0, y: 0.7 }, colors })
  void confetti({ particleCount: 70, spread: 70, angle: 120, origin: { x: 1, y: 0.7 }, colors })
}
