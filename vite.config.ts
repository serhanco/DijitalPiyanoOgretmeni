import { execSync } from 'node:child_process'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import { VitePWA } from 'vite-plugin-pwa'

/** Short commit and build date, so test notes say which version they were written on. */
function buildStamp(): string {
  let sha = process.env.GITHUB_SHA?.slice(0, 7) ?? ''
  if (!sha) {
    try {
      sha = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
        .toString()
        .trim()
    } catch {
      sha = 'yerel'
    }
  }
  return `${sha} · ${new Date().toISOString().slice(0, 10)}`
}

export default defineConfig({
  define: { __APP_BUILD__: JSON.stringify(buildStamp()) },
  // Relative base so the build works on GitHub Pages under any repo path.
  base: './',
  plugins: [
    react(),
    VitePWA({
      // A new version waits for "Yenile" (UpdateToast), so a lesson is never reloaded halfway.
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Dijital Piyano Öğretmeni',
        short_name: 'Piyano',
        description: 'Duolingo tarzı oyunlarla, MIDI klavyenle piyano öğren.',
        lang: 'tr',
        theme_color: '#58cc02',
        background_color: '#f7f9fc',
        display: 'standalone',
        orientation: 'any',
        start_url: '.',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'icons/notis.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2,png}'],
        // The Android app file is downloaded, never cached.
        globIgnores: ['**/*.apk'],
        runtimeCaching: [
          {
            // Piano samples: download once, then play offline.
            urlPattern: /^https:\/\/tonejs\.github\.io\/audio\//,
            handler: 'CacheFirst',
            options: { cacheName: 'piano-samples', expiration: { maxEntries: 60 } },
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})
