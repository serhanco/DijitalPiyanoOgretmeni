// End-to-end smoke test in a real browser.
// Usage: npm run build && npx vite preview --port 4173 & npm run smoke [-- <screenshot dir>]
// In Claude Code cloud sessions set CHROMIUM_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome
import { mkdirSync } from 'node:fs'
import { chromium } from 'playwright'

const out = process.argv[2] ?? 'smoke-screens'
const url = process.env.APP_URL ?? 'http://localhost:4173/'
mkdirSync(out, { recursive: true })

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {})
const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
// A fake Akai MPK Mini MK3 behind Web MIDI, driven with window.__fakeMidi([status, note, velocity]).
await page.addInitScript(() => {
  const input = { id: 'akai', name: 'MPK mini 3', manufacturer: 'AKAI', state: 'connected', onmidimessage: null }
  const access = { inputs: new Map([['akai', input]]), outputs: new Map(), onstatechange: null }
  Object.defineProperty(navigator, 'requestMIDIAccess', { value: async () => access })
  window.__fakeMidi = (bytes) => input.onmidimessage?.({ data: new Uint8Array(bytes), timeStamp: performance.now() })
})
page.setDefaultTimeout(10000)
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
// Piano samples cannot load without network; ignore those.
page.on('console', (m) => m.type() === 'error' && !m.text().includes('ERR_FAILED') && errors.push(m.text()))

/** Play a lesson to the end. `wrongFirst` presses keys from the top until the right one. */
async function play(lessonTitle, { wrongFirst = false, shotAfter = 0, shotName = '' } = {}) {
  await page.getByRole('button', { name: lessonTitle, exact: true }).click()
  await page.waitForSelector('.staff svg')
  /** "clef:midi" of every prompt, to check which staff notes were written on. */
  const seen = new Set()
  const keys = await page.$$eval('.key.white', (els) => els.map((e) => e.dataset.midi))
  for (let i = 0; i < 80 && !(await page.$('.results')); i++) {
    if (wrongFirst) {
      for (const midi of [...keys].reverse()) {
        await page.click(`.key[data-midi="${midi}"]`)
        await page.waitForTimeout(40)
        if ((await page.$('.feedback.good')) || (await page.$('.results'))) break
      }
    } else {
      // The staff exposes the current note for tests.
      const target = await page.getAttribute('.staff-wrap', 'data-note')
      seen.add(`${await page.getAttribute('.staff-wrap', 'data-clef')}:${target}`)
      await page.click(`.key[data-midi="${target}"]`)
    }
    if (shotAfter && i + 1 === shotAfter) {
      await page.waitForTimeout(250)
      await page.screenshot({ path: `${out}/${shotName}.png` })
    }
    await page.waitForTimeout(520)
  }
  await page.waitForSelector('.results', { timeout: 3000 })
  await page.waitForTimeout(800)
  return seen
}

/**
 * Play a melody lesson: press the keys of the current step; two keys go
 * down `gapMs` apart (left hand first), from the page so the gap is exact.
 */
async function playMelody(lessonTitle, shotName, { gapMs = 20, shotAfter = 6 } = {}) {
  await page.getByRole('button', { name: lessonTitle, exact: true }).click()
  await page.waitForSelector('.melody-wrap .staff svg')
  for (let i = 0; i < 200 && !(await page.$('.results')); i++) {
    const pending = await page.getAttribute('.melody-wrap', 'data-pending')
    if (pending) {
      await page.evaluate(
        ({ keys, gap }) => {
          keys.forEach((midi, k) =>
            window.setTimeout(() => {
              const el = document.querySelector(`.key[data-midi="${midi}"]`)
              el.dispatchEvent(
                new PointerEvent('pointerdown', { bubbles: true, pointerId: 20 + k, isPrimary: k === 0 }),
              )
              window.setTimeout(
                () => el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 20 + k })),
                120,
              )
            }, k * gap),
          )
        },
        { keys: pending.split(' ').map(Number), gap: gapMs },
      )
    }
    if (shotName && i === shotAfter) await page.screenshot({ path: `${out}/${shotName}.png` })
    await page.waitForTimeout(260)
  }
  await page.waitForSelector('.results', { timeout: 3000 })
  await page.waitForTimeout(800)
}

/** Play an arcade lesson perfectly, reading the target from the game object. */
async function playArcade(lessonTitle, shotName) {
  await page.getByRole('button', { name: lessonTitle, exact: true }).click()
  await page.waitForSelector('.pixi-stage canvas')
  let shot = false
  for (let i = 0; i < 2000 && !(await page.$('.results')); i++) {
    const target = await page.evaluate(() => {
      const g = window.__dpoArcade
      if (!g) return null
      if ('customers' in g) {
        const next = g.waiting.sort((a, b) => b.x - a.x)[0]
        return next && next.x > 0.3 ? next.record.target : null
      }
      if ('pipes' in g) {
        const cur = g.current
        return cur && cur.record.answeredAt === null ? cur.record.target : null
      }
      const up = g.flying.sort((a, b) => a.y - b.y)[0]
      return up && up.y < 0.4 ? up.record.target : null
    })
    if (target !== null) {
      await page.click(`.key[data-midi="${target}"]`)
      if (!shot && i > 20) {
        await page.waitForTimeout(400)
        await page.screenshot({ path: `${out}/${shotName}.png` })
        shot = true
      }
    }
    await page.waitForTimeout(120)
  }
  await page.waitForSelector('.results', { timeout: 5000 })
  await page.waitForTimeout(800)
}

/**
 * Play a rhythm lesson: press Başla, then let the page itself press every
 * note's key on its beat (setTimeout in the page is far more precise than
 * round trips from here). `offsetMs` shifts every press.
 */
async function playBeat(lessonTitle, shotName, { offsetMs = 0, shotAt = 0.5, slower = 0 } = {}) {
  await page.getByRole('button', { name: lessonTitle, exact: true }).click()
  await page.waitForSelector('.beat-start')
  for (let i = 0; i < slower; i++) await page.getByLabel('Yavaşlat').click()
  if (shotName) await page.screenshot({ path: `${out}/${shotName}-ready.png` })
  await page.click('.beat-start')
  await page.waitForFunction(() => window.__dpoBeat && window.__dpoBeat !== window.__dpoPrevBeat)
  const lengthMs = await page.evaluate((offset) => {
    const t = window.__dpoBeat
    window.__dpoPrevBeat = t
    for (const r of t.records) {
      if (r.rest) continue
      window.setTimeout(
        () => {
          const el = document.querySelector(`.key[data-midi="${r.target}"]`)
          el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 7, isPrimary: true }))
          window.setTimeout(() => el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 7 })), 40)
        },
        r.dueAt + offset - performance.now(),
      )
    }
    return t.endAt - performance.now()
  }, offsetMs)
  if (shotName) {
    await page.waitForTimeout(lengthMs * shotAt)
    await page.screenshot({ path: `${out}/${shotName}.png` })
  }
  await page.waitForSelector('.results', { timeout: lengthMs + 10000 })
  await page.waitForTimeout(800)
}

/** Close the level-up overlay if it is showing. */
async function dismissOverlay() {
  const btn = page.locator('.overlay .btn')
  if (await btn.count()) {
    await page.screenshot({ path: `${out}/level-up.png` })
    await btn.click()
    await page.waitForTimeout(400)
  }
}

await page.goto(url)
await page.waitForTimeout(800)
await page.screenshot({ path: `${out}/map-empty.png` })

await play('İlk Adımlar', { shotAfter: 5, shotName: 'game-combo' })
await dismissOverlay()
await page.screenshot({ path: `${out}/results.png`, fullPage: true })
await page.getByText('Derslere dön').click()

await play('Bir Oktav')
await dismissOverlay()
await page.getByText('Derslere dön').click()

await playArcade('Nota Kuşu', 'game-bird')
await dismissOverlay()
await page.screenshot({ path: `${out}/results-bird.png` })
await page.getByText('Derslere dön').click()

await play('Çizgiler')
await dismissOverlay()
await page.getByText('Derslere dön').click()
await play('Aralar')
await dismissOverlay()
await page.getByText('Derslere dön').click()

await playArcade('Balon Patlatma', 'game-balloon')
await dismissOverlay()
await page.screenshot({ path: `${out}/results-balloon.png` })
await page.getByText('Derslere dön').click()

await play('Porte Ustası', { wrongFirst: true }) // runs out of hearts
await dismissOverlay()
await page.screenshot({ path: `${out}/results-failed.png`, fullPage: true })
await page.getByText('Derslere dön').click()
await page.waitForTimeout(500)
await page.screenshot({ path: `${out}/map-after.png`, fullPage: true })

// Unit 2: rhythm. Its first lesson is open from the start.
await playBeat('Dörtlükler', 'rhythm-quarters')
await dismissOverlay()
await page.screenshot({ path: `${out}/results-rhythm.png`, fullPage: true })
const rhythmScore = (await page.textContent('.stat-value'))?.trim()
if (rhythmScore !== '%100') errors.push(`Perfectly timed rhythm lesson scored ${rhythmScore}`)
await page.getByText('Derslere dön').click()
await playBeat('İkilikler')
await dismissOverlay()
await page.getByText('Derslere dön').click()
await playBeat('Dino Koşusu', 'game-dino', { offsetMs: 60 }) // "İyi" timing, a little late
await dismissOverlay()
await page.screenshot({ path: `${out}/results-dino.png`, fullPage: true })
await page.getByText('Derslere dön').click()
await playBeat('Sekizlikler', 'rhythm-eighths')
await dismissOverlay()
await page.getByText('Derslere dön').click()
await playBeat('Esler', 'rhythm-rests')
await dismissOverlay()
await page.getByText('Derslere dön').click()
await playBeat('Ritim Davulcusu', 'game-drum')
await dismissOverlay()
await page.screenshot({ path: `${out}/results-drum.png`, fullPage: true })
if (!(await page.getByText('Vuruşunda çalınan notalar').count())) errors.push('Rhythm XP line has the drill label')
await page.getByText('Derslere dön').click()
await playBeat('Dino Koşusu: Notalı')
await dismissOverlay()
await page.getByText('Derslere dön').click()
await playBeat('Karışık Ritim')
await dismissOverlay()
await page.getByText('Derslere dön').click()
await playBeat('Davulcu: Sekizlikler')
await dismissOverlay()
await page.getByText('Derslere dön').click()

// Polish round: 3/4 and dotted notes; the chosen tempo is remembered.
await playBeat('Üç Dörtlük', 'rhythm-waltz', { slower: 1 })
await dismissOverlay()
await page.screenshot({ path: `${out}/results-waltz.png`, fullPage: true })
await page.getByText('Derslere dön').click()
await page.getByRole('button', { name: 'Üç Dörtlük', exact: true }).click()
const tempo = (await page.textContent('.tempo-value'))?.trim()
if (tempo !== '79 BPM') errors.push(`Tempo was not remembered: ${tempo}`)
await page.getByLabel('Dersten çık').click()
await playBeat('Dino Valsi', 'game-dino-waltz')
await dismissOverlay()
await page.getByText('Derslere dön').click()
await playBeat('Noktalı Dörtlük', 'rhythm-dotted', { shotAt: 0.3 })
await dismissOverlay()
await page.screenshot({ path: `${out}/results-dotted.png`, fullPage: true })
const dottedScore = (await page.textContent('.stat-value'))?.trim()
if (dottedScore !== '%100') errors.push(`Perfectly timed dotted lesson scored ${dottedScore}`)
await page.getByText('Derslere dön').click()
await playBeat('Davulcu: Noktalılar', 'game-drum-dotted')
await dismissOverlay()
await page.getByText('Derslere dön').click()

// Phase 6, unit 3: the bass clef with the left hand.
await play('Sol El: İlk Adımlar', { shotAfter: 3, shotName: 'game-bass' })
await dismissOverlay()
await page.getByText('Derslere dön').click()
await play("Orta Do'ya Kadar")
await dismissOverlay()
await page.getByText('Derslere dön').click()
await playArcade('Nota Kuşu: Fa Anahtarı', 'game-bird-bass')
await dismissOverlay()
await page.getByText('Derslere dön').click()
await playMelody('Sol El Melodileri', 'melody-bass')
await dismissOverlay()
await page.screenshot({ path: `${out}/results-melody-bass.png`, fullPage: true })
await page.getByText('Derslere dön').click()
await play('Fa Çizgileri')
await dismissOverlay()
await page.getByText('Derslere dön').click()
await play('Fa Araları')
await dismissOverlay()
await page.getByText('Derslere dön').click()
await playArcade('Balon: Fa Anahtarı', 'game-balloon-bass')
await dismissOverlay()
await page.getByText('Derslere dön').click()

// Unit 4: the grand staff and both hands.
await play('Büyük Porte', { shotAfter: 4, shotName: 'game-grand' })
await dismissOverlay()
await page.screenshot({ path: `${out}/results-grand.png`, fullPage: true })
if (!(await page.locator('.hands-card').count())) errors.push('Grand staff results have no hands report')
await page.getByText('Derslere dön').click()
const bridge = await play('Orta Do Köprüsü', { shotAfter: 6, shotName: 'game-middle-c' })
// Notes around middle C must show up on both staves.
const onBoth = [57, 59, 60, 62, 64].filter((m) => bridge.has(`treble:${m}`) && bridge.has(`bass:${m}`))
if (onBoth.length < 2) errors.push(`Middle C notes were not written on both staves: ${[...bridge].join(' ')}`)
await dismissOverlay()
await page.getByText('Derslere dön').click()
await playArcade('Nota Barmeni', 'game-bar')
await dismissOverlay()
await page.screenshot({ path: `${out}/results-bar.png`, fullPage: true })
await page.getByText('Derslere dön').click()
await playMelody('Eller Sırayla', 'melody-alternate', { shotAfter: 8 })
await dismissOverlay()
await page.getByText('Derslere dön').click()
await playMelody('İki El Birlikte', 'melody-hands', { gapMs: 30 })
await dismissOverlay()
await page.screenshot({ path: `${out}/results-hands.png`, fullPage: true })
const sync = await page.textContent('.sync')
if (!sync?.includes('18 tanesinde')) errors.push(`Two-hand sync report: ${sync}`)
await page.getByText('Derslere dön').click()

// Latency calibration: taps 30 ms after every click should measure 30 ms.
await page.locator('.calib-tip').click()
await page.getByText('Ölçmeye başla').click()
await page.waitForFunction(() => window.__dpoCalibration)
await page.evaluate(() => {
  const { startAt, beatMs } = window.__dpoCalibration
  for (let b = 0; b < 16; b++) {
    window.setTimeout(
      () => {
        const el = document.querySelector('.key[data-midi="60"]')
        el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 8, isPrimary: true }))
        window.setTimeout(() => el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 8 })), 40)
      },
      startAt + b * beatMs + 30 - performance.now(),
    )
  }
})
await page.waitForSelector('.calib-big', { timeout: 20000 })
const latency = Number(await page.getAttribute('.calib-big', 'data-latency'))
if (Math.abs(latency - 30) > 8) errors.push(`Calibration measured ${latency} ms instead of about 30 ms`)
await page.screenshot({ path: `${out}/calibration.png`, fullPage: true })
await page.getByLabel('Geri').click()
await page.waitForTimeout(400)

await page.getByLabel('Profil').click()
await page.waitForTimeout(500)
await page.screenshot({ path: `${out}/profile.png`, fullPage: true })
const bars = await page.locator('.rhythm-chart .bar').count()
if (bars < 10) errors.push(`Rhythm chart shows ${bars} sessions`)
await page.getByLabel('Geri').click()
await page.waitForTimeout(400)

// The Akai is recognised and the octave hint answers its leftmost key.
const panel = await page.textContent('.midi-panel')
if (!panel?.includes('Akai MPK Mini MK3')) errors.push(`MIDI panel did not recognise the Akai: ${panel}`)
await page.evaluate(() => window.__fakeMidi([0x90, 48, 100]))
await page.waitForTimeout(200)
const hint = await page.textContent('.octave-check')
if (!hint?.includes('OCTAVE + düğmesine 1 kez')) errors.push(`Octave hint: ${hint}`)
await page.evaluate(() => window.__fakeMidi([0x80, 48, 0]))
await page.getByText('Klavyemi nasıl bağlarım?').click()
await page.locator('.midi-panel').screenshot({ path: `${out}/midi-panel.png` })

await page.reload()
await page.waitForTimeout(1000)
const xp = (await page.textContent('.chip.xp'))?.trim()
await browser.close()

if (xp === '⚡ 0') errors.push('Progress was not persisted across a reload')
if (errors.length) {
  console.error('Smoke test failed:', [...new Set(errors)])
  process.exit(1)
}
console.log(`Smoke test passed (XP after reload: ${xp}). Screenshots in ${out}/`)
