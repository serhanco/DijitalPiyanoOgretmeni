import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
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
