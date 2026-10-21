// Draws the app icons (Notiş on a piano) and writes the PNG sizes phones ask
// for into public/icons/. Run after changing the drawing: `node scripts/icons.mjs`.
// Needs Playwright's Chromium (CHROMIUM_PATH, as for the smoke test).

import { readFileSync, writeFileSync } from 'node:fs'
import { chromium } from 'playwright'

/** Notiş, happy, in a 120×120 box (the same drawing as components/Mascot.tsx). */
const notis = `
  <rect x="88" y="12" width="7" height="62" rx="3.5" fill="#5a2fd6"/>
  <path d="M94 13 c14 6 22 16 16 32 c-2 -10 -8 -16 -16 -18 z" fill="#5a2fd6"/>
  <ellipse cx="20" cy="78" rx="7" ry="12" fill="#5a2fd6" transform="rotate(20 20 70)"/>
  <ellipse cx="96" cy="80" rx="7" ry="12" fill="#5a2fd6" transform="rotate(-20 96 72)"/>
  <ellipse cx="58" cy="74" rx="40" ry="33" fill="#7c4dff" transform="rotate(-12 58 74)"/>
  <ellipse cx="58" cy="84" rx="22" ry="15" fill="#b9a3ff" opacity="0.55" transform="rotate(-12 58 84)"/>
  <g stroke="#2b1a5c" stroke-width="4" stroke-linecap="round" fill="none">
    <path d="M37 67 q8 -9 16 0"/><path d="M63 67 q8 -9 16 0"/>
  </g>
  <circle cx="33" cy="80" r="5" fill="#ff8fb1" opacity="0.8"/>
  <circle cx="84" cy="78" r="5" fill="#ff8fb1" opacity="0.8"/>
  <path d="M48 80 q10 14 20 0 z" fill="#2b1a5c" stroke="#2b1a5c" stroke-width="2" stroke-linejoin="round"/>`

/** Piano keys along the bottom of a 512 box. */
function keys(top) {
  const white = Array.from(
    { length: 7 },
    (_, i) => `<rect x="${i * 73.14}" y="${top}" width="72" height="${512 - top}" fill="#fff"/>`,
  )
  const black = [0, 1, 3, 4, 5].map(
    (i) =>
      `<rect x="${(i + 1) * 73.14 - 20}" y="${top}" width="40" height="${(512 - top) * 0.58}" rx="6" fill="#1f2a37"/>`,
  )
  return `<g>${white.join('')}${black.join('')}</g>`
}

/** `scale` shrinks Notiş for the maskable icon, whose edges may be cut to a circle. */
function icon({ rounded, scale }) {
  const size = 512 * scale
  const offset = (512 - size) / 2
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs><clipPath id="c"><rect width="512" height="512" rx="${rounded ? 112 : 0}"/></clipPath></defs>
  <g clip-path="url(#c)">
    <rect width="512" height="512" fill="#58cc02"/>
    ${keys(rounded ? 380 : 400)}
    <g transform="translate(${offset} ${offset - 34 * scale}) scale(${size / 120})">${notis}</g>
  </g>
</svg>`
}

const any = icon({ rounded: true, scale: 0.86 })
const maskable = icon({ rounded: false, scale: 0.62 })
writeFileSync('public/icons/notis.svg', any)
writeFileSync('public/favicon.svg', any)

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined })
const page = await browser.newPage()
for (const [file, svg, px] of [
  ['icon-192.png', any, 192],
  ['icon-512.png', any, 512],
  ['maskable-512.png', maskable, 512],
  ['apple-touch-icon.png', maskable, 180],
]) {
  await page.setViewportSize({ width: px, height: px })
  await page.setContent(
    `<style>html,body{margin:0;background:transparent}svg{width:${px}px;height:${px}px;display:block}</style>${svg}`,
  )
  writeFileSync(`public/icons/${file}`, await page.screenshot({ omitBackground: true }))
}

// The Android app: launcher icons per screen density, and the splash screens at their template sizes.
const res = 'android/app/src/main/res'
const round = icon({ rounded: false, scale: 0.86 }).replace('rx="0"', 'rx="256"')
const densities = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 }
const shots = []
for (const [d, k] of Object.entries(densities)) {
  shots.push([`${res}/mipmap-${d}/ic_launcher.png`, any, 48 * k, 48 * k])
  shots.push([`${res}/mipmap-${d}/ic_launcher_round.png`, round, 48 * k, 48 * k])
  // Adaptive icons: a 108 dp layer of which the middle 72 dp shows.
  shots.push([`${res}/mipmap-${d}/ic_launcher_foreground.png`, maskable, 108 * k, 108 * k])
}
const splash = (w, h) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
  <rect width="${w}" height="${h}" fill="#58cc02"/>
  <g transform="translate(${w / 2 - Math.min(w, h) * 0.2} ${h / 2 - Math.min(w, h) * 0.22}) scale(${(Math.min(w, h) * 0.4) / 120})">${notis}</g>
</svg>`
for (const dir of [
  'drawable',
  ...['land', 'port'].flatMap((o) => Object.keys(densities).map((d) => `drawable-${o}-${d}`)),
]) {
  const file = `${res}/${dir}/splash.png`
  const png = readFileSync(file)
  const w = png.readUInt32BE(16)
  const h = png.readUInt32BE(20)
  shots.push([file, splash(w, h), w, h])
}
for (const [file, svg, w, h] of shots) {
  await page.setViewportSize({ width: Math.round(w), height: Math.round(h) })
  await page.setContent(
    `<style>html,body{margin:0;background:transparent}svg{width:${w}px;height:${h}px;display:block}</style>${svg}`,
  )
  writeFileSync(file, await page.screenshot({ omitBackground: true }))
}
await browser.close()
console.log('icons written to public/icons/')
