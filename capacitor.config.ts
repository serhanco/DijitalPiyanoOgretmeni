import type { CapacitorConfig } from '@capacitor/cli'

// The Android app wraps the same build as the web app (dist/). MIDI comes from
// the native NativeMidi plugin (android/app/src/main/java/.../NativeMidiPlugin.java),
// because the Android WebView has no Web MIDI.
const config: CapacitorConfig = {
  appId: 'io.github.serhanco.piyano',
  appName: 'Piyano Öğretmeni',
  webDir: 'dist',
  android: {
    // Taps on the keys must not be swallowed by WebView overscroll effects.
    allowMixedContent: false,
  },
}

export default config
