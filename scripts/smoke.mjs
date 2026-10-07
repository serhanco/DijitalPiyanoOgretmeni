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
page.on('pageerror', (e) => {
  console.error('Page error:', e.message)
  errors.push(e.message)
})
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
        // The results may replace the keyboard mid-loop when the hearts run out.
        await page.click(`.key[data-midi="${midi}"]`, { timeout: 1500 }).catch(() => undefined)
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
    const wrap = await page.$('.melody-wrap')
    if (!wrap) {
      await page.waitForTimeout(200)
      continue
    }
    const pending = await wrap.getAttribute('data-pending')
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
 * round trips from here). `offsetMs` shifts every press; `lateRound` plays
 * that round of a tempo ladder 150 ms late. Returns the rounds played.
 */
async function playBeat(
  lessonTitle,
  shotName,
  { offsetMs = 0, shotAt = 0.5, slower = 0, faster = 0, lateRound = 0 } = {},
) {
  await page.getByRole('button', { name: lessonTitle, exact: true }).click()
  await page.waitForSelector('.beat-start')
  for (let i = 0; i < slower; i++) await page.getByLabel('Yavaşlat').click()
  for (let i = 0; i < faster; i++) await page.getByLabel('Hızlandır').click()
  if (shotName) await page.screenshot({ path: `${out}/${shotName}-ready.png` })
  await page.click('.beat-start')
  let rounds = 0
  for (;;) {
    await page.waitForFunction(() => window.__dpoBeat && window.__dpoBeat !== window.__dpoPrevBeat)
    rounds++
    const lengthMs = await page.evaluate(
      (offset) => {
        const t = window.__dpoBeat
        window.__dpoPrevBeat = t
        for (const r of t.records) {
          if (r.rest) continue
          // One pointer per key, so two hands can press at once.
          const pointerId = 100 + r.target
          window.setTimeout(
            () => {
              const el = document.querySelector(`.key[data-midi="${r.target}"]`)
              el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId, isPrimary: true }))
              window.setTimeout(() => el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId })), 40)
            },
            r.dueAt + offset - performance.now(),
          )
        }
        return t.endAt - performance.now()
      },
      offsetMs + (rounds === lateRound ? 150 : 0),
    )
    if (shotName && rounds === 1) {
      await page.waitForTimeout(lengthMs * shotAt)
      await page.screenshot({ path: `${out}/${shotName}.png` })
    }
    // A tempo ladder goes on with a new, faster track; anything else ends with the results.
    const next = await page.waitForFunction(
      () => (document.querySelector('.results') ? 'done' : window.__dpoBeat !== window.__dpoPrevBeat ? 'next' : null),
      null,
      { timeout: lengthMs + 10000 },
    )
    if ((await next.jsonValue()) === 'done') break
  }
  await page.waitForTimeout(800)
  return rounds
}

/**
 * Play Melodi Hafızası: wait for each run to be played, then repeat it from
 * the game object. `wrongInRound` presses one wrong key in that round first.
 */
async function playMemory(lessonTitle, shotName, { wrongInRound = -1 } = {}) {
  await page.getByRole('button', { name: lessonTitle, exact: true }).click()
  await page.click('.memory-start')
  let round = 0
  let shot = false
  for (let i = 0; i < 400 && !(await page.$('.results')); i++) {
    const state = await page.evaluate(() => {
      const g = window.__dpoMemory
      return g ? { phase: g.phase, expected: g.expected, length: g.length, played: g.played } : null
    })
    if (state?.phase === 'listen' && shotName && !shot && state.length >= 5) {
      await page.waitForTimeout(700)
      await page.screenshot({ path: `${out}/${shotName}-listen.png` })
      shot = true
    }
    if (state?.phase === 'play' && state.expected !== null) {
      if (state.played === 0) round++
      if (round === wrongInRound + 1 && state.played === 1) {
        const wrong = state.expected === 60 ? 62 : 60
        await page.click(`.key[data-midi="${wrong}"]`)
        wrongInRound = -1
        await page.waitForTimeout(150)
        if (shotName) await page.screenshot({ path: `${out}/${shotName}-wrong.png` })
      }
      await page.click(`.key[data-midi="${state.expected}"]`)
      await page.waitForTimeout(150)
    } else {
      await page.waitForTimeout(120)
    }
  }
  await page.waitForSelector('.results', { timeout: 5000 })
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

/** Press keys from the page, `gapMs` apart, each released `holdMs` after it went down. */
async function pressTogether(keys, gapMs, holdMs = 150) {
  await page.evaluate(
    ({ keys, gap, hold }) => {
      keys.forEach((midi, k) =>
        window.setTimeout(() => {
          const el = document.querySelector(`.key[data-midi="${midi}"]`)
          el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 40 + k, isPrimary: k === 0 }))
          window.setTimeout(
            () => el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 40 + k })),
            hold,
          )
        }, k * gap),
      )
    },
    { keys, gap: gapMs, hold: holdMs },
  )
  await page.waitForTimeout(keys.length * gapMs + holdMs + 60)
}

/** Play a chord drill: every note of the current chord, `gapMs` apart. */
async function playChords(lessonTitle, shotName, { gapMs = 25, shotAfter = 3 } = {}) {
  await page.getByRole('button', { name: lessonTitle, exact: true }).click()
  await page.waitForSelector('.chord-wrap .staff svg')
  for (let i = 0; i < 60 && !(await page.$('.results')); i++) {
    const pending = await page.getAttribute('.chord-wrap', 'data-pending').catch(() => null)
    if (pending) await pressTogether(pending.split(' ').map(Number), gapMs)
    if (shotName && i === shotAfter) await page.screenshot({ path: `${out}/${shotName}.png` })
    await page.waitForTimeout(120)
  }
  await page.waitForSelector('.results', { timeout: 3000 })
  await page.waitForTimeout(800)
}

/**
 * Play Akor Aşçısı or Uzay Savunması from the game object. `wrongInversion`
 * first plays one inverted chord in another inversion.
 */
async function playChordArcade(lessonTitle, shotName, { wrongInversion = false } = {}) {
  await page.getByRole('button', { name: lessonTitle, exact: true }).click()
  await page.waitForSelector('.pixi-stage canvas')
  let shot = false
  for (let i = 0; i < 600 && !(await page.$('.results')); i++) {
    const chord = await page.evaluate(() => {
      const g = window.__dpoChordArcade
      if (!g) return null
      const target = 'invaders' in g ? (g.urgent && g.urgent.y > 0.15 ? g.urgent : null) : g.cooking
      return target
        ? { notes: target.record.chord.notes.map((n) => n.midi), inversion: target.record.chord.inversion }
        : null
    })
    if (chord) {
      if (wrongInversion && chord.inversion > 0) {
        // The same notes with the bottom one moved up an octave: another inversion.
        const [bottom, ...rest] = chord.notes
        const top = rest.pop()
        const up = [...rest, top, bottom + 12]
        const down = [top - 12, bottom, ...rest]
        const onKeyboard = async (keys) =>
          (await Promise.all(keys.map((m) => page.$(`.key[data-midi="${m}"]`)))).every(Boolean)
        await pressTogether((await onKeyboard(up)) ? up : down, 20)
        wrongInversion = false
        await page.waitForTimeout(400)
      }
      if (!shot && i > 4) {
        await page.screenshot({ path: `${out}/${shotName}.png` })
        shot = true
      }
      await pressTogether(chord.notes, 20)
    }
    await page.waitForTimeout(150)
  }
  await page.waitForSelector('.results', { timeout: 5000 })
  await page.waitForTimeout(800)
}

/** Unit 6: chords, inversions, progressions, arpeggios and their games, in order. */
async function chordsUnit() {
  const back = () => page.getByText('Derslere dön').click()
  await page.locator('.unit').nth(5).scrollIntoViewIfNeeded()
  await playChords('Majör Üçlüler', 'chord-major')
  await dismissOverlay()
  await page.screenshot({ path: `${out}/results-chords.png`, fullPage: true })
  const majorCard = await page.textContent('.chord-card')
  if (!majorCard?.includes('12 akorun 12 tanesinde')) errors.push(`Chord card: ${majorCard}`)
  if (!(await page.getByText('İlk denemede doğru akorlar').count())) errors.push('Chord XP line has the note label')
  await back()
  await playChordArcade('Akor Aşçısı', 'game-chef')
  await dismissOverlay()
  await page.screenshot({ path: `${out}/results-chef.png`, fullPage: true })
  await back()
  // Spread out: right notes, but never together.
  await playChords('Minör Üçlüler', 'chord-minor', { gapMs: 140 })
  await dismissOverlay()
  await page.screenshot({ path: `${out}/results-chords-spread.png`, fullPage: true })
  const spreadCard = await page.textContent('.chord-card')
  if (!spreadCard?.includes('12 akorun 0 tanesinde')) errors.push(`Spread chord card: ${spreadCard}`)
  await back()
  await playChords('Sol Elle Akorlar', 'chord-left')
  await dismissOverlay()
  await back()
  await playChordArcade('Uzay Savunması', 'game-space')
  await dismissOverlay()
  await page.screenshot({ path: `${out}/results-space.png`, fullPage: true })
  await back()
  await playChords('Akor Çevrimleri', 'chord-inversions', { shotAfter: 4 })
  await dismissOverlay()
  await page.screenshot({ path: `${out}/results-inversions.png`, fullPage: true })
  const inversionTopics = await page.textContent('.results')
  if (!inversionTopics?.includes('2. çevrim')) errors.push('Inversion lesson has no per-inversion topics')
  await back()
  await playChords('Çevrimleri Oku', 'chord-inversions-read')
  await dismissOverlay()
  await back()
  await playChordArcade('Aşçı: Çevrimler', 'game-chef-inversions', { wrongInversion: true })
  await dismissOverlay()
  const chefCard = await page.textContent('.chord-card')
  if (!chefCard?.includes('1 kez yanlış çevrim')) errors.push(`Wrong inversion not reported: ${chefCard}`)
  await back()
  await playChordArcade('Uzay: Çevrimler', 'game-space-inversions')
  await dismissOverlay()
  await back()
  await playMelody('Arpejler', 'arpeggio', { shotAfter: 3 })
  await dismissOverlay()
  await page.screenshot({ path: `${out}/results-arpeggio.png`, fullPage: true })
  const arpCard = await page.textContent('.scale-card')
  if (!arpCard?.includes('Arpej tekniği')) errors.push(`Arpeggio card: ${arpCard}`)
  await back()
  await playBeat('Arpej Sörfü', 'game-surf', { shotAt: 0.35 })
  await dismissOverlay()
  await page.screenshot({ path: `${out}/results-surf.png`, fullPage: true })
  const surfTopics = await page.textContent('.results')
  if (!surfTopics?.includes('Eşit aralık')) errors.push('Surf report has no evenness topic')
  if (!surfTopics?.includes('Sol Majör arpej · sağ el')) errors.push('Surf report has no per-arpeggio topics')
  await back()
  await playChords('I – IV – V – I', 'progression', { shotAfter: 2 })
  await dismissOverlay()
  await page.screenshot({ path: `${out}/results-progression.png`, fullPage: true })
  const progTopics = await page.textContent('.results')
  if (!progTopics?.includes('IV (Fa Majör)')) errors.push('Progression report has no per-degree topics')
  await back()
  await playChords('İki El: I – IV – V – I', 'progression-hands', { gapMs: 30, shotAfter: 5 })
  await dismissOverlay()
  await page.screenshot({ path: `${out}/results-progression-hands.png`, fullPage: true })
  await back()
  await playMelody('İki Elle Arpej', 'arpeggio-hands', { gapMs: 30, shotAfter: 4 })
  await dismissOverlay()
  const arpSync = await page.textContent('.sync')
  if (!arpSync?.includes('14 tanesinde')) errors.push(`Two-hand arpeggio sync: ${arpSync}`)
  await back()
  await playChords('I – V – vi – IV', 'progression-pop', { gapMs: 30, shotAfter: 3 })
  await dismissOverlay()
  await back()
  await playChords('Yedili Akorlar', 'chord-sevenths', { shotAfter: 4 })
  await dismissOverlay()
  await back()
  await playChords('I – IV – V7 – I', 'progression-v7', { gapMs: 30, shotAfter: 2 })
  await dismissOverlay()
  await back()
  await playChordArcade('Aşçı: Yedililer', 'game-chef-sevenths')
  await dismissOverlay()
  await back()
  const surfRounds = await playBeat('Sörf: Tempo Merdiveni', 'game-surf-tempo', { shotAt: 0.5 })
  if (surfRounds !== 3) errors.push(`Surf tempo ladder played ${surfRounds} rounds instead of 3`)
  await dismissOverlay()
  await back()
  await playBeat('Sörf: İki El', 'game-surf-hands', { shotAt: 0.4 })
  await dismissOverlay()
  await page.screenshot({ path: `${out}/results-surf-hands.png`, fullPage: true })
  const surfSync = await page.textContent('.sync')
  if (!surfSync?.includes('14 tanesinde')) errors.push(`Two-hand surf sync: ${surfSync}`)
  await back()
  await page.waitForTimeout(400)
  await page
    .locator('.unit')
    .nth(5)
    .screenshot({ path: `${out}/map-chords.png` })
}

async function finish() {
  await browser.close()
  if (errors.length) {
    console.error('Smoke test failed:', [...new Set(errors)])
    process.exit(1)
  }
}

await page.goto(url)

// SMOKE_ONLY=chords plays only unit 6 (its first lesson is open from the start).
if (process.env.SMOKE_ONLY === 'chords') {
  await page.waitForTimeout(800)
  await chordsUnit()
  await finish()
  console.log(`Smoke test (chords) passed. Screenshots in ${out}/`)
  process.exit(0)
}
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

// Unit 5: scales, ladders and memory, in order (each lesson opens the next).
const back = () => page.getByText('Derslere dön').click()
await playMelody('Do Majör', 'scale-c', { shotAfter: 3 })
await dismissOverlay()
await page.screenshot({ path: `${out}/results-scale.png`, fullPage: true })
const scaleCard = await page.textContent('.scale-card')
if (!scaleCard?.includes('2 geçişin 2 tanesinde')) errors.push(`Scale card: ${scaleCard}`)
await back()
await playMelody('Sol Majör', 'scale-g', { shotAfter: 6 })
await dismissOverlay()
await back()
await playBeat('Gam Merdiveni', 'game-ladder', { faster: 8, shotAt: 0.3 })
await dismissOverlay()
await page.screenshot({ path: `${out}/results-ladder.png`, fullPage: true })
const ladderTopics = await page.textContent('.results')
if (!ladderTopics?.includes('Sol Majör · sağ el')) errors.push('Ladder report has no per-scale topics')
await back()
await playMelody('Sol Elle Gam', 'scale-left', { shotAfter: 10 })
await dismissOverlay()
await back()
await playMemory('Melodi Hafızası', 'game-memory', { wrongInRound: 1 })
await dismissOverlay()
await page.screenshot({ path: `${out}/results-memory.png`, fullPage: true })
const memoryCard = await page.textContent('.memory-card')
if (!memoryCard?.includes('En uzun hatasız dizi: 7')) errors.push(`Memory card: ${memoryCard}`)
await back()
await playMelody('Fa Majör', 'scale-f', { shotAfter: 4 })
await dismissOverlay()
await back()
await playMelody('Re ve La Majör', 'scale-d-a', { shotAfter: 20 })
await dismissOverlay()
await back()
await playBeat('Merdiven: Sol El', '', { faster: 8 })
await dismissOverlay()
await back()
await playMelody('İki El Eş Zamanlı', 'scale-parallel', { gapMs: 30, shotAfter: 4 })
await dismissOverlay()
await page.screenshot({ path: `${out}/results-scale-hands.png`, fullPage: true })
const scaleSync = await page.textContent('.sync')
if (!scaleSync?.includes('15 tanesinde')) errors.push(`Scale sync report: ${scaleSync}`)
await back()
await playMelody('Zıt Hareket', 'scale-contrary', { gapMs: 30, shotAfter: 11 })
await dismissOverlay()
await back()
await playBeat('Merdiven: İki El', 'game-ladder-hands', { faster: 8, shotAt: 0.6 })
await dismissOverlay()
const ladderSync = await page.textContent('.sync')
if (!ladderSync?.includes('15 tanesinde')) errors.push(`Ladder sync report: ${ladderSync}`)
await back()
await playMelody('Mi ve Si♭ Majör', 'scale-bb', { shotAfter: 18 })
await dismissOverlay()
await back()
await playMelody('La Minör', '', {})
await dismissOverlay()
await back()
await playMelody('Armonik ve Melodik', 'scale-melodic', { shotAfter: 24 })
await dismissOverlay()
await back()
await playMemory('Hafıza: La Minör', '')
await dismissOverlay()
await back()
await playMelody('Mi ve Re Minör', '', {})
await dismissOverlay()
await back()
await playMelody('İki El: La Minör', 'scale-minor-contrary', { gapMs: 30, shotAfter: 18 })
await dismissOverlay()
await back()
await playBeat('Merdiven: Minörler', '', { faster: 8 })
await dismissOverlay()
await page.screenshot({ path: `${out}/results-ladder-minor.png`, fullPage: true })
await back()

// Beyond phase 7: tempo ladders, B and E♭ fingerings, two octaves, memory by ear.
const tempoRounds = await playBeat('Tempo Merdiveni', 'game-tempo', { faster: 4, shotAt: 0.4 })
if (tempoRounds !== 3) errors.push(`Tempo ladder played ${tempoRounds} rounds instead of 3`)
await dismissOverlay()
await page.screenshot({ path: `${out}/results-tempo.png`, fullPage: true })
const tempoCard = await page.textContent('.tempo-card')
if (!tempoCard?.includes('92 BPM’den başlıyorsun')) errors.push(`Tempo card: ${tempoCard}`)
const tempoTopics = await page.textContent('.results')
if (!tempoTopics?.includes('104 BPM')) errors.push('Tempo ladder report has no per-tempo topics')
await back()
// The raised tempo is remembered.
await page.getByRole('button', { name: 'Tempo Merdiveni', exact: true }).click()
const ladderLine = await page.textContent('.tempo-ladder')
if (!ladderLine?.includes('92 → 104 → 116')) errors.push(`Raised tempo ladder: ${ladderLine}`)
await page.getByLabel('Dersten çık').click()
await page.waitForTimeout(400)
await playMelody('Si ve Mi♭ Majör', 'scale-b-left', { shotAfter: 18 })
await dismissOverlay()
await back()
await playMelody('İki Oktav', 'scale-two-octaves', { shotAfter: 10 })
await dismissOverlay()
await page.screenshot({ path: `${out}/results-two-octaves.png`, fullPage: true })
const twoOctaves = await page.textContent('.results')
if (!twoOctaves?.includes('Do Majör · sol el · 2 oktav')) errors.push('Two-octave report has no per-scale topics')
await back()
await playMemory('Kulaktan Hafıza', 'game-memory-ear')
const firstNotes = await page.evaluate(() => window.__dpoMemory.rounds.map((r) => r[0].target))
if (firstNotes.some((m) => m !== 60)) errors.push(`Ear memory runs start on ${firstNotes}`)
await dismissOverlay()
await back()
await playMelody('İki Oktav: İki El', 'scale-two-octaves-hands', { gapMs: 30, shotAfter: 20 })
await dismissOverlay()
const twoOctaveSync = await page.textContent('.sync')
if (!twoOctaveSync?.includes('58 tanesinde')) errors.push(`Two-octave sync report: ${twoOctaveSync}`)
await back()
const failedRounds = await playBeat('Tempo Merdiveni: İki El', 'game-tempo-hands', { faster: 4, lateRound: 2 })
if (failedRounds !== 2) errors.push(`Tempo ladder with a late round played ${failedRounds} rounds instead of 2`)
await dismissOverlay()
await page.screenshot({ path: `${out}/results-tempo-failed.png`, fullPage: true })
const failedCard = await page.textContent('.tempo-card')
if (!failedCard?.includes('Tempo şimdilik aynı kalıyor')) errors.push(`Failed tempo card: ${failedCard}`)
await back()
await page.waitForTimeout(400)
await page
  .locator('.unit')
  .nth(4)
  .screenshot({ path: `${out}/map-scales.png` })

await chordsUnit()

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
