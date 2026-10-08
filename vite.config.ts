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
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
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
        icons: [{ src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
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
