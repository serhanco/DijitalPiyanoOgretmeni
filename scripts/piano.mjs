// Faz 13 checks in a real browser: a fake Clavinova behind Web MIDI (an input and an
// output that records what the app sends), the keyboard setup wizard, example notes
// played on the piano, the sustain pedal holding notes, the screen wake lock, the app
// manifest and icons, and the app opening offline from the service worker.
// Usage: npm run build && npx vite preview --port 4173 & npm run piano [-- <screenshot dir>]

import { mkdirSync } from 'node:fs'
import { chromium } from 'playwright'

const out = process.argv[2] ?? 'piano-screens'
const url = process.env.APP_URL ?? 'http://localhost:4173/'
mkdirSync(out, { recursive: true })

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {})
const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
await context.addInitScript(() => {
  localStorage.setItem('dpo-welcomed', '1')
  if (localStorage.getItem('dpo-intro') === null) localStorage.setItem('dpo-intro', 'off')
  if (localStorage.getItem('dpo-intros') === null) localStorage.setItem('dpo-intros', 'off')
  // Test mode opens every lesson.
  if (!localStorage.getItem('dpo-settings'))
    localStorage.setItem('dpo-settings', JSON.stringify({ state: { testMode: true }, version: 0 }))
  const input = {
    id: 'clp-in',
    name: 'Digital Piano',
    manufacturer: 'Yamaha Corporation',
    state: 'connected',
    onmidimessage: null,
  }
  window.__sent = []
  const output = {
    id: 'clp-out',
    name: 'Digital Piano',
    manufacturer: 'Yamaha Corporation',
    state: 'connected',
    send: (data, at) => window.__sent.push({ data: [...data], at: at ?? performance.now() }),
  }
  const access = { inputs: new Map([['clp-in', input]]), outputs: new Map([['clp-out', output]]), onstatechange: null }
  Object.defineProperty(navigator, 'requestMIDIAccess', { value: async () => access })
  window.__fakeMidi = (bytes) => input.onmidimessage?.({ data: new Uint8Array(bytes), timeStamp: performance.now() })
  // Count wake lock requests (headless Chromium may refuse the real one).
  window.__wakeLocks = 0
  Object.defineProperty(navigator, 'wakeLock', {
    value: {
      request: async () => {
        window.__wakeLocks++
        return { release: async () => undefined }
      },
    },
  })
})
const page = await context.newPage()
page.setDefaultTimeout(10000)
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
page.on(
  'console',
  (m) =>
    m.type() === 'error' && !/ERR_FAILED|ERR_TUNNEL|ERR_INTERNET_DISCONNECTED/.test(m.text()) && errors.push(m.text()),
)
const midi = (bytes) => page.evaluate((b) => window.__fakeMidi(b), bytes)
const check = (ok, message) => ok || errors.push(message)

await page.goto(url)
await page.waitForSelector('.home')

// The manifest lists PNG icons that exist.
const manifest = await page.evaluate(async () => {
  const href = document.querySelector('link[rel="manifest"]')?.getAttribute('href')
  return href ? (await fetch(href)).json() : null
})
check(manifest, 'No web app manifest linked')
for (const icon of manifest?.icons ?? []) {
  const status = await page.evaluate(async (src) => (await fetch(src)).status, icon.src)
  check(status === 200, `Icon ${icon.src}: HTTP ${status}`)
}
check(
  manifest?.icons?.some((i) => i.purpose === 'maskable'),
  'No maskable icon',
)

// The wizard, from the settings sheet.
await page.getByLabel('Ayarlar').click()
await page.locator('.settings [data-open-setup]').click()
await page.waitForSelector('.setup[data-setup-step="connect"]')
await page.click('[data-setup-connect]')
await page.waitForSelector('[data-setup-devices]')
check((await page.textContent('[data-setup-devices]')).includes('Clavinova'), 'Wizard: the Clavinova is not recognised')
await page.screenshot({ path: `${out}/setup-connect.png` })
await page.click('[data-setup-next]')

// Keys: leftmost and rightmost of 88.
await midi([0x90, 21, 80])
await midi([0x80, 21, 0])
await midi([0x90, 108, 80])
await midi([0x80, 108, 0])
await page.waitForSelector('[data-setup-range]')
check((await page.textContent('[data-setup-range]')).includes('88 tuş, hepsi geliyor'), 'Wizard: 88 keys not seen')
await page.screenshot({ path: `${out}/setup-keys.png` })
await page.click('[data-setup-next]')

// Do-Mi-Sol together.
await midi([0x90, 60, 90])
await midi([0x90, 64, 90])
await midi([0x90, 67, 90])
await page.waitForSelector('[data-setup-chord]')
for (const n of [60, 64, 67]) await midi([0x80, n, 0])
await page.click('[data-setup-next]')

// Touch: soft, then loud.
await midi([0x90, 62, 20])
await midi([0x80, 62, 0])
await midi([0x90, 62, 120])
await midi([0x80, 62, 0])
await page.waitForSelector('[data-setup-touch]')
check((await page.textContent('[data-setup-touch]')).includes('çalışıyor'), 'Wizard: touch not recognised')
await page.screenshot({ path: `${out}/setup-touch.png` })
await page.click('[data-setup-next]')

// Pedal.
await midi([0xb0, 64, 127])
await midi([0xb0, 64, 0])
await page.waitForSelector('[data-setup-pedal]')
await page.click('[data-setup-next]')

// Sound: Do-Mi-Sol goes out to the piano.
await page.evaluate(() => (window.__sent.length = 0))
await page.click('[data-setup-play]')
await page.waitForTimeout(1400)
const sentOn = await page.evaluate(() => window.__sent.filter((m) => m.data[0] === 0x90).map((m) => m.data[1]))
check(sentOn.join() === '60,64,67', `Wizard: notes sent to the piano: ${sentOn.join()}`)
await page.getByText('Duydum', { exact: true }).click()
await page.click('[data-setup-next]')
await page.waitForSelector('[data-setup-latency]')
await page.click('[data-setup-next]')

// The report.
const report = await page.textContent('[data-setup-report]')
for (const want of [
  'Digital Piano (Yamaha Corporation)',
  'La0 – Do8 (88 tuş',
  'Sustain pedalı: evet',
  'piyanodan duyuldu: evet',
])
  check(report.includes(want), `Report lacks "${want}": ${report}`)
await page.screenshot({ path: `${out}/setup-report.png`, fullPage: true })
await page.click('[data-setup-done]')
await page.waitForSelector('.home')

/** Play the lesson with taps of `tapMs`, holding the sustain pedal down from start to end when `pedal`. */
async function playYanki(pedal) {
  await page.getByRole('button', { name: 'Yankı: Dörtlükler', exact: true }).click({ force: true })
  await page.locator('.lesson-peek-go').click()
  await page.waitForSelector('.beat-start')
  await page.evaluate(() => (window.__sent.length = 0))
  await page.click('.beat-start')
  await page.waitForFunction(() => window.__dpoBeat)
  const lengthMs = await page.evaluate((usePedal) => {
    const t = window.__dpoBeat
    const fake = window.__fakeMidi
    if (usePedal) fake([0xb0, 64, 127])
    for (const r of t.records) {
      if (r.rest || r.demo) continue
      window.setTimeout(() => {
        const el = document.querySelector(`.key[data-midi="${r.target}"]`)
        el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 5, isPrimary: true }))
        window.setTimeout(() => el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 5 })), 60)
      }, r.dueAt - performance.now())
    }
    const last = t.records.at(-1)
    if (usePedal) window.setTimeout(() => fake([0xb0, 64, 0]), last.dueAt + t.beatMs * 0.98 - performance.now())
    return t.endAt - performance.now()
  }, pedal)
  check((await page.evaluate(() => window.__wakeLocks)) > 0, 'No screen wake lock during the lesson')
  await page.waitForSelector('.results', { timeout: lengthMs + 10000 })
  await page.waitForTimeout(600)
  // A level-up or new badge may cover the results.
  if (await page.locator('.overlay .btn').count()) await page.locator('.overlay .btn').first().click()
  const card = await page.textContent('.results')
  const demo = await page.evaluate(() => window.__sent.filter((m) => m.data[0] === 0x90).length)
  return { card, demo }
}

// Yankı without the pedal: short taps are short.
const plain = await playYanki(false)
check(plain.demo >= 4, `Yankı: the app's notes did not go to the piano (${plain.demo} sent)`)
check(/erken bıraktın/.test(plain.card), 'Yankı without pedal: short taps were not called short')
await page.screenshot({ path: `${out}/results-no-pedal.png`, fullPage: true })
await page.getByText('Derslere dön').click()
await page.waitForSelector('.home')
// …and with the pedal down they are held.
const held = await playYanki(true)
check(!/erken bıraktın/.test(held.card), 'Yankı with pedal: taps held by the pedal were still called short')
check(/tanesini süresi kadar tuttun/.test(held.card), 'Yankı with pedal: no hold line on the results')
await page.screenshot({ path: `${out}/results-pedal.png`, fullPage: true })

// Offline: once the service worker controls the page, the app opens without network.
await page.goto(url)
await page.evaluate(() => navigator.serviceWorker.ready)
await page.reload()
await page.waitForFunction(() => navigator.serviceWorker.controller !== null)
await context.setOffline(true)
await page.reload()
await page.waitForSelector('.home')
await page.getByRole('button', { name: 'Piyanoyla Tanışma', exact: true }).click({ force: true })
await page.locator('.lesson-peek-go').click()
await page.waitForSelector('.theory', { timeout: 5000 }).catch(() => errors.push('Offline: a lesson did not open'))
await page.screenshot({ path: `${out}/offline-lesson.png` })
await context.setOffline(false)

await browser.close()
if (errors.length) {
  console.error('Piano checks failed:', [...new Set(errors)])
  process.exit(1)
}
console.log(`Piano checks passed. Screenshots in ${out}/`)
