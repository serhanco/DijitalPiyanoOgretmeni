// Reads theory cards and questions aloud with the browser's speech synthesis
// (Turkish voice when the device has one). Silently does nothing without it.

export const canSpeak = (): boolean => typeof window !== 'undefined' && 'speechSynthesis' in window

export function speak(text: string): void {
  if (!canSpeak()) return
  const synth = window.speechSynthesis
  synth.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'tr-TR'
  u.rate = 0.95
  const voice = synth.getVoices().find((v) => v.lang.toLowerCase().startsWith('tr'))
  if (voice) u.voice = voice
  synth.speak(u)
}

export function stopSpeaking(): void {
  if (canSpeak()) window.speechSynthesis.cancel()
}
