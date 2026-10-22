// End-to-end smoke test in a real browser.
// Usage: npm run build && npx vite preview --port 4173 & npm run smoke [-- <screenshot dir>]
// In Claude Code cloud sessions set CHROMIUM_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome
import { mkdirSync, readFileSync } from 'node:fs'
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
// The welcome shows once per device; tests start on the map.
await page.addInitScript(() => {
  localStorage.setItem('dpo-welcomed', '1')
  // Oyun arası Notiş would cover every game the first time: the intro has its own check.
  if (localStorage.getItem('dpo-intros') === null) localStorage.setItem('dpo-intros', 'off')
})
page.setDefaultTimeout(10000)
const errors = []
page.on('pageerror', (e) => {
  console.error('Page error:', e.message)
  errors.push(e.message)
})
// Piano samples cannot load without network; ignore those.
page.on('console', (m) => m.type() === 'error' && !/ERR_FAILED|ERR_TUNNEL/.test(m.text()) && errors.push(m.text()))

/** Open a lesson from the map: tap its node, then Başla / Tekrar çal on the card that opens. */
async function openLesson(title, force = false) {
  await page.getByRole('button', { name: title, exact: true }).click({ force })
  await page.locator('.lesson-peek-go').click()
}

/** Play a lesson to the end. `wrongFirst` presses keys from the top until the right one. */
async function play(lessonTitle, { wrongFirst = false, shotAfter = 0, shotName = '' } = {}) {
  await openLesson(lessonTitle)
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
  await openLesson(lessonTitle)
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
  await openLesson(lessonTitle)
  await page.waitForSelector('.pixi-stage canvas')
  let shot = false
  for (let i = 0; i < 2000 && !(await page.$('.results')); i++) {
    const target = await page.evaluate(() => {
      const g = window.__dpoArcade
      if (!g) return null
      // Kurbağa Atlayışı: the floating lily pad.
      if ('pad' in g) return g.pad && g.pad.state === 'floating' && g.pad.since > 0.4 ? g.pad.record.target : null
      if ('wagons' in g) return g.front && g.front.x < 0.7 ? g.front.record.target : null
      // Kayıp Kuş Sesi: answer once the bird has sung.
      if ('nests' in g) return g.waiting && g.waiting.since > 0.3 ? g.waiting.record.target : null
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
 * that round of a tempo ladder 150 ms late. Keys are held for 85% of each
 * note's length, or `tapMs` when set. Returns the rounds played.
 */
async function playBeat(
  lessonTitle,
  shotName,
  { offsetMs = 0, shotAt = 0.5, slower = 0, faster = 0, lateRound = 0, tapMs = 0 } = {},
) {
  // The map may still be gliding to the lesson just left.
  await openLesson(lessonTitle, true)
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
      ([offset, tap]) => {
        const t = window.__dpoBeat
        const beats = { w: 4, h: 2, q: 1, e: 0.5, s: 0.25, qd: 1.5, ed: 0.75, hd: 3 }
        window.__dpoPrevBeat = t
        for (const r of t.records) {
          // Yankı: the app plays its own bars.
          if (r.rest || r.demo) continue
          // One pointer per key, so two hands can press at once.
          const pointerId = 100 + r.target
          window.setTimeout(
            () => {
              const el = document.querySelector(`.key[data-midi="${r.target}"]`)
              el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId, isPrimary: true }))
              window.setTimeout(
                () => el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId })),
                tap || beats[r.value] * t.beatMs * 0.85,
              )
            },
            r.dueAt + offset - performance.now(),
          )
        }
        return t.endAt - performance.now()
      },
      [offsetMs + (rounds === lateRound ? 150 : 0), tapMs],
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
 * Play Çift Kişilik Davul: echo rounds copy Notiş's call, free rounds answer with
 * a quarter on every beat (a rhythm of their own unless the call was all quarters).
 * The page presses the drum key on time itself.
 */
async function playDuet(lessonTitle, shotName) {
  await openLesson(lessonTitle, true)
  await page.waitForSelector('.duet-ready .beat-start')
  await page.click('.beat-start')
  await page.waitForFunction(() => window.__dpoDuet)
  const lengthMs = await page.evaluate(() => {
    const s = window.__dpoDuet
    const el = document.querySelector('.key[data-midi]')
    const press = (at) =>
      window.setTimeout(() => {
        el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 7, isPrimary: true }))
        window.setTimeout(() => el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 7 })), 80)
      }, at - performance.now())
    for (const r of s.rounds) {
      const beats = r.turn === 'echo' ? r.onsets : Array.from({ length: s.beatsPerBar }, (_, i) => i)
      for (const b of beats) press(r.answerStart + b * s.beatMs)
    }
    return s.endAt - performance.now()
  })
  if (shotName) {
    await page.waitForTimeout(lengthMs * 0.3)
    await page.screenshot({ path: `${out}/${shotName}.png` })
  }
  await page.waitForSelector('.results', { timeout: lengthMs + 10000 })
  await page.waitForTimeout(800)
}

/**
 * Play Melodi Hafızası: wait for each run to be played, then repeat it from
 * the game object. `wrongInRound` presses one wrong key in that round first.
 */
async function playMemory(lessonTitle, shotName, { wrongInRound = -1 } = {}) {
  await openLesson(lessonTitle)
  await page.click('.memory-start')
  let round = 0
  let shot = false
  for (let i = 0; i < 1500 && !(await page.$('.results')); i++) {
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
async function playChords(lessonTitle, shotName, { gapMs = 25, shotAfter = 3, ear = false } = {}) {
  await openLesson(lessonTitle)
  const board = ear ? '.ear-board' : '.chord-wrap'
  if (ear) {
    await page.getByRole('button', { name: /Dinlemeye başla/ }).click()
    await page.waitForSelector('.ear-board[data-pending]:not([data-pending=""])')
  } else await page.waitForSelector('.chord-wrap .staff svg')
  for (let i = 0; i < 60 && !(await page.$('.results')); i++) {
    const pending = await page.getAttribute(board, 'data-pending').catch(() => null)
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
  await openLesson(lessonTitle)
  await page.waitForSelector('.pixi-stage canvas')
  let shot = false
  for (let i = 0; i < 600 && !(await page.$('.results')); i++) {
    const chord = await page.evaluate(() => {
      const g = window.__dpoChordArcade
      if (!g) return null
      const target =
        'invaders' in g
          ? g.urgent && g.urgent.y > 0.15
            ? g.urgent
            : null
          : 'customers' in g
            ? g.urgent && g.urgent.x > 0.15
              ? g.urgent
              : null
            : g.cooking
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
  await playChordArcade('Akor Barmeni', 'game-chord-bar')
  await dismissOverlay()
  await page.screenshot({ path: `${out}/results-chord-bar.png`, fullPage: true })
  await back()
  await playChords('Kulaktan Akor', 'chord-ear', { ear: true })
  await dismissOverlay()
  await page.screenshot({ path: `${out}/results-chord-ear.png`, fullPage: true })
  const earTopics = await page.textContent('.results')
  if (!earTopics?.includes('Minör akorlar') || !earTopics?.includes('Majör akorlar'))
    errors.push('Ear chord lesson has no major / minor topics')
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
  await playChords('Kulaktan Yedililer', 'chord-ear-7', { ear: true })
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
  await playChordArcade('Barmen: İki El', 'game-chord-bar-hands')
  await dismissOverlay()
  await back()
  await page.waitForTimeout(400)
  await page
    .locator('.unit')
    .nth(5)
    .screenshot({ path: `${out}/map-chords.png` })
}

/**
 * Test mode: every lesson opens, a note written in a locked lesson keeps its context and
 * copies out as Markdown, and the progress code moves everything to a fresh browser.
 */
async function testModeFlow() {
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'], { origin: new URL(url).origin })
  await page.getByLabel('Ayarlar', { exact: true }).click()
  await page.getByText('Test modu:').click()
  await page.getByLabel('Ayarları kapat').click()
  await page.waitForTimeout(300)
  const locked = await page.locator('.node.locked:not(.review)').count()
  if (locked) errors.push(`Test mode left ${locked} lessons locked`)
  // Some progress to carry over with the progress code, in a unit that test mode opened.
  await play('İlk Adımlar')
  await dismissOverlay()
  await page.getByText('Derslere dön').click()
  await page.waitForTimeout(300)
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.screenshot({ path: `${out}/test-map.png` })
  const xpStart = (await page.textContent('.chip.xp'))?.trim()

  // A lesson that is locked without test mode (it needs the one before it).
  await openLesson('Porte Ustası')
  await page.waitForSelector('.staff svg')
  await page.locator('.test-fab').first().click()
  await page.waitForSelector('.test-shot img', { timeout: 10000 })
  await page.locator('.test-panel textarea').fill('Tuşlar çok sıkışık, bir oktav yeter.')
  await page.screenshot({ path: `${out}/test-note.png` })
  await page.getByRole('button', { name: 'Kaydet' }).click()
  await page.waitForTimeout(300)
  if (await page.$('.test-panel')) errors.push('Saving a note did not close the panel')
  // Two notes in, then "Dersi bitir": the results show, nothing is saved.
  for (let i = 0; i < 2; i++) {
    await page.click(`.key[data-midi="${await page.getAttribute('.staff-wrap', 'data-note')}"]`)
    await page.waitForTimeout(600)
  }
  await page.getByLabel('Dersi bitir').click()
  await page.waitForSelector('.results')
  await page.waitForTimeout(800)
  const banner = await page.textContent('.results .test-banner')
  if (!banner?.includes('ilerlemeye yazılmadı')) errors.push(`Early finish banner: ${banner}`)
  const total = await page.textContent('.results')
  if (!total?.includes('Porte Ustası')) errors.push('Early finish did not show the lesson results')
  await page.screenshot({ path: `${out}/test-finish.png`, fullPage: true })
  await page.locator('.test-fab').first().click()
  await page.waitForSelector('.test-shot img', { timeout: 10000 })
  await page.getByText('Ekran görüntüsünü ekle').click() // this one goes without a picture
  await page.locator('.test-panel textarea').fill('İkinci not: sonuç ekranı.')
  await page.getByRole('button', { name: 'Kaydet' }).click()
  await page.getByText('Derslere dön').click()
  await page.waitForTimeout(400)
  const xpAfter = (await page.textContent('.chip.xp'))?.trim()
  if (xpAfter !== xpStart) errors.push(`Early finish changed XP from ${xpStart} to ${xpAfter}`)

  // The note panel pauses an arcade game: the balloons stand still while it is open.
  await openLesson('Balon Patlatma')
  await page.waitForSelector('.pixi-stage canvas')
  await page.waitForTimeout(1500)
  const balloons = () => page.evaluate(() => JSON.stringify(window.__dpoArcade.flying.map((b) => b.y)))
  await page.locator('.test-fab').first().click()
  const frozen = await balloons()
  await page.waitForTimeout(1500)
  if ((await balloons()) !== frozen) errors.push('The game kept running behind the note panel')
  await page.waitForSelector('.test-shot img', { timeout: 10000 })
  await page.screenshot({ path: `${out}/test-note-game.png` })
  await page.getByLabel('Kapat').click()
  await page.waitForTimeout(800)
  if ((await balloons()) === frozen) errors.push('The game did not resume after the note panel')
  await page.getByLabel('Dersi bitir').click()
  await page.waitForSelector('.results')
  await page.getByText('Derslere dön').click()

  // A rhythm lesson finished mid-round.
  await openLesson('Dörtlükler')
  await page.click('.beat-start')
  await page.waitForTimeout(3000)
  await page.getByLabel('Dersi bitir').click()
  await page.waitForSelector('.results')
  await page.getByText('Derslere dön').click()
  await page.waitForTimeout(300)

  await page.locator('.test-fab').first().click()
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${out}/test-notes.png` })
  await page.getByRole('button', { name: 'Hepsini kopyala' }).click()
  await page.waitForTimeout(300)
  const copied = await page.evaluate(() => navigator.clipboard.readText())
  for (const part of [
    '# Test notları (2)',
    'Ders · Ünite 1: Sol Anahtarı › Porte Ustası',
    'Sonuç · Ünite 1: Sol Anahtarı › Porte Ustası',
    'MIDI: MPK mini 3',
    'bir oktav yeter',
    '![Ekran görüntüsü](ekranlar/not-01.jpg)',
  ]) {
    if (!copied.includes(part)) errors.push(`Copied notes miss "${part}": ${copied}`)
  }
  if (copied.includes('not-02.jpg')) errors.push('A note saved without its picture still lists one')
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'İndir' }).click(),
  ])
  const zipPath = `${out}/test-notlari.zip`
  await download.saveAs(zipPath)
  const zip = readFileSync(zipPath)
  if (
    zip.subarray(0, 2).toString() !== 'PK' ||
    !zip.includes('ekranlar/not-01.jpg') ||
    !zip.includes('test-notlari.md')
  )
    errors.push('The notes download is not a zip with the notes and the screenshot')
  await page.getByLabel('Kapat').click()
  await page.waitForTimeout(300)
  const count = (await page.textContent('.test-fab-count'))?.trim()
  if (count !== '2') errors.push(`Note button counts ${count} notes`)

  // Progress code: take it here, load it in a fresh browser (another device).
  await page.getByLabel('Ayarlar', { exact: true }).click()
  await page.getByRole('button', { name: '📤 Kodu al' }).click()
  await page.waitForFunction(() => document.querySelector('.backup-code')?.value.startsWith('DPO'))
  const code = await page.inputValue('.backup-code')
  const fromClipboard = await page.evaluate(() => navigator.clipboard.readText())
  if (fromClipboard !== code) errors.push('The progress code was not copied')
  await page.locator('.backup').screenshot({ path: `${out}/test-backup.png` })
  const xpHere = (await page.textContent('.chip.xp'))?.trim()
  await page.getByLabel('Ayarları kapat').click()

  const other = await browser.newPage({ viewport: { width: 390, height: 844 } })
  await other.addInitScript(() => {
    localStorage.setItem('dpo-welcomed', '1')
    // Oyun arası Notiş would cover every game the first time: the intro has its own check.
    if (localStorage.getItem('dpo-intros') === null) localStorage.setItem('dpo-intros', 'off')
  })
  other.on('pageerror', (e) => errors.push(`Other device: ${e.message}`))
  other.on('dialog', (d) => d.accept())
  await other.goto(url)
  await other.waitForTimeout(800)
  await other.getByLabel('Ayarlar', { exact: true }).click()
  await other.locator('.backup-code').fill(code)
  await Promise.all([other.waitForEvent('load'), other.getByRole('button', { name: 'Kodu yükle' }).click()])
  await other.waitForTimeout(1000)
  const xpThere = (await other.textContent('.chip.xp'))?.trim()
  if (xpThere !== xpHere) errors.push(`Progress code moved ${xpThere} instead of ${xpHere}`)
  const stars = await other.locator('.node-stars .on').count()
  if (!stars) errors.push('Progress code moved no stars')
  await other.close()
}

/**
 * Play a theory lesson: read the cards (screenshots of `shots` card indices),
 * then answer the quiz from window.__dpoTheory; `wrongAt` answers that
 * question wrong once first.
 */
async function playTheory(lessonTitle, shotName, { shots = [], wrongAt = -1, quizShot = -1 } = {}) {
  await openLesson(lessonTitle)
  await page.waitForSelector('.theory-card')
  for (let i = 0; i < 20 && (await page.$('.theory-card')); i++) {
    await page.waitForTimeout(350)
    if (shots.includes(i)) await page.screenshot({ path: `${out}/${shotName}-card${i + 1}.png` })
    await page.click('.theory-next')
  }
  for (let i = 0; i < 30 && !(await page.$('.results')); i++) {
    await page.waitForSelector('.theory-quiz')
    const st = await page.evaluate(() => window.__dpoTheory)
    const keys = await page.$$eval('.key', (els) => els.map((e) => Number(e.dataset.midi)))
    const pick = async (right) => {
      if (st.type === 'choice') {
        const opts = await page.$$eval('.quiz-option', (els) => els.map((e) => Number(e.dataset.option)))
        await page.click(`.quiz-option[data-option="${right ? st.answer : opts.find((o) => o !== st.answer)}"]`)
      } else {
        const key = keys.find((m) => (((m % 12) + 12) % 12 === st.answer) === right)
        await page.click(`.key[data-midi="${key}"]`)
      }
    }
    if (st.question === wrongAt) {
      await pick(false)
      await page.waitForTimeout(300)
      await page.screenshot({ path: `${out}/${shotName}-wrong.png` })
    }
    if (st.question === quizShot) await page.screenshot({ path: `${out}/${shotName}-quiz.png` })
    await pick(true)
    await page.waitForTimeout(850)
  }
  await page.waitForSelector('.results', { timeout: 3000 })
  await page.waitForTimeout(800)
}

const backToMap = async () => {
  await dismissOverlay()
  await page.getByText('Derslere dön').click()
}
const scoreOf = async () => Number((await page.textContent('.stat-value'))?.replace(/\D/g, ''))

/** Play a Yankı: checks the listen / play turns and a perfect score. */
async function playEcho(title, shotName) {
  const turns = new Set()
  const watch = setInterval(
    () =>
      void page
        .getAttribute('.echo-turn', 'data-turn', { timeout: 100 })
        .then((t) => t && turns.add(t))
        .catch(() => undefined),
    250,
  )
  await playBeat(title, shotName, { shotAt: 0.2 })
  clearInterval(watch)
  if (!turns.has('listen') || !turns.has('play')) errors.push(`${title}: no listen / play turns (${[...turns]})`)
  const score = await scoreOf()
  if (score !== 100) errors.push(`${title} scored ${score}%`)
}

/** A song: the original title on the start card, the next key lit, a perfect score. */
async function playSong(title, original, shotName, opts = {}) {
  await openLesson(title)
  await page.waitForSelector('.beat-start')
  const shown = await page.getAttribute('.tune-info', 'data-tune').catch(() => null)
  if (shown !== original) errors.push(`${title}: start card shows "${shown}", not "${original}"`)
  await page.getByLabel('Dersten çık').click()
  const rounds = await playBeat(title, shotName, opts)
  const score = await scoreOf()
  if (score !== 100) errors.push(`${title} scored ${score}%`)
  return rounds
}

/** Units 2 and 4: every rhythm pattern is introduced, echoed, drilled, played in a game and in songs. */
async function rhythmUnits() {
  // Ritim 1: quarters.
  await playTheory('Vuruş ve Dörtlük', 'theory-rhythm-quarter', { shots: [0, 1], quizShot: 0 })
  await backToMap()
  await playEcho('Yankı: Dörtlükler', 'rhythm-echo-quarters')
  await backToMap()
  await playBeat('Dörtlükler', 'rhythm-quarters')
  await dismissOverlay()
  await page.screenshot({ path: `${out}/results-rhythm.png`, fullPage: true })
  const rhythmScore = await scoreOf()
  if (rhythmScore !== 100) errors.push(`Perfectly timed rhythm lesson scored ${rhythmScore}%`)
  await page.getByText('Derslere dön').click()
  await playBeat('Dino: İlk Adımlar')
  await backToMap()
  await playBeat('Ritmi: Uyuyor musun? (ilk cümle)')
  await backToMap()
  await playSong('Uyuyor musun? (ilk cümle)', 'Frère Jacques', 'song-frere-opening')
  await backToMap()

  // Halves.
  await playTheory('İkilik Nota', 'theory-rhythm-half', { shots: [1] })
  await backToMap()
  await playEcho('Yankı: İkilikler')
  await backToMap()
  // Halves tapped on the beat but let go at once: on time, yet only partly held.
  await playBeat('İkilikler', 'rhythm-halves-tapped', { tapMs: 60 })
  await dismissOverlay()
  await page.screenshot({ path: `${out}/results-halves-tapped.png`, fullPage: true })
  const tappedScore = await scoreOf()
  if (!(tappedScore < 90)) errors.push(`Tapped halves scored ${tappedScore}%, the hold did not count`)
  if (!(await page.getByText(/erken bıraktın/).count())) errors.push('Results do not say the notes were let go early')
  await page.getByText('Derslere dön').click()
  await playBeat('Dino Koşusu', 'game-dino', { offsetMs: 60 }) // "İyi" timing, a little late
  await dismissOverlay()
  await page.screenshot({ path: `${out}/results-dino.png`, fullPage: true })
  await page.getByText('Derslere dön').click()
  await playBeat('Ritmi: Küçük Yıldız', 'song-rhythm-twinkle')
  await backToMap()
  await playSong('Küçük Yıldız', 'Ah ! vous dirai-je, maman', 'song-twinkle')
  await dismissOverlay()
  await page.screenshot({ path: `${out}/results-song.png`, fullPage: true })
  await page.getByText('Derslere dön').click()
  await playSong('Neşeye Övgü', 'An die Freude')
  await backToMap()

  // Wholes.
  await playTheory('Birlik Nota', 'theory-rhythm-whole', { shots: [0] })
  await backToMap()
  await playEcho('Yankı: Birlikler', 'rhythm-echo-wholes')
  await backToMap()
  await playBeat('Birlikler', 'rhythm-wholes')
  await backToMap()
  await playBeat('Davulcu: Uzun Notalar')
  await backToMap()
  await playBeat('Ritmi: Ay Işığında')
  await backToMap()
  await playSong('Ay Işığında', 'Au clair de la lune', 'song-au-clair')
  await backToMap()
  await playSong('Ufak Kuzu', 'Mary Had a Little Lamb')
  await backToMap()

  // Rests.
  await playTheory('Dörtlük Es', 'theory-rhythm-rest', { shots: [0] })
  await backToMap()
  await playEcho('Yankı: Esler')
  await backToMap()
  await playBeat('Esler', 'rhythm-rests')
  await backToMap()
  await playBeat('Ritim Davulcusu', 'game-drum')
  await dismissOverlay()
  await page.screenshot({ path: `${out}/results-drum.png`, fullPage: true })
  if (!(await page.getByText('Vuruşunda çalınan notalar').count())) errors.push('Rhythm XP line has the drill label')
  await page.getByText('Derslere dön').click()
  await playBeat('Ritmi: Sıcak Çörekler (esli)')
  await backToMap()
  await playSong('Küçük Yıldız (esli)', 'Ah ! vous dirai-je, maman', 'song-twinkle-rests')
  await backToMap()
  await playBeat('Dino Koşusu: Notalı')
  await backToMap()
  await playDuet('Çift Kişilik Davul', 'rhythm-duet')
  const duetText = (await page.textContent('.duet-card')) ?? ''
  if (!/Kendi ritminle verdiğin cevap: [1-9]/.test(duetText)) errors.push(`Duet card: ${duetText}`)
  await page.screenshot({ path: `${out}/results-duet.png`, fullPage: true })
  await backToMap()
  const reviewRounds = await playBeat('Büyük Tekrar')
  if (reviewRounds !== 3) errors.push(`Büyük Tekrar played ${reviewRounds} rounds, not 3`)
  await backToMap()
  await page.screenshot({ path: `${out}/map-rhythm.png`, fullPage: true })

  // Ritim 2: eighths.
  await playTheory('Sekizlik Nota', 'theory-rhythm-eighth', { shots: [0] })
  await backToMap()
  await playEcho('Yankı: Sekizlikler', 'rhythm-echo-eighths')
  await backToMap()
  await playBeat('Sekizlikler', 'rhythm-eighths')
  await backToMap()
  await playBeat('Davulcu: Sekizlikler')
  await backToMap()
  await playBeat('Ritmi: Sıcak Çörekler')
  await backToMap()
  await playSong('Sıcak Çörekler', 'Hot Cross Buns')
  await backToMap()
  await playSong('Uyuyor musun?', 'Frère Jacques', 'song-frere')
  await backToMap()

  // 3/4 and dotted halves; the chosen tempo is remembered, and three stars raise it a little.
  await playTheory('Vals Ölçüsü', 'theory-rhythm-waltz', { shots: [1] })
  await backToMap()
  await playEcho('Yankı: Üç Dörtlük')
  await backToMap()
  await playBeat('Üç Dörtlük', 'rhythm-waltz', { slower: 1 })
  await dismissOverlay()
  await page.screenshot({ path: `${out}/results-waltz.png`, fullPage: true })
  const adapt = await page.textContent('[data-adapt="tempo"]').catch(() => null)
  if (!adapt?.includes('79 → 83')) errors.push(`Three stars should raise the tempo: ${adapt}`)
  await page.getByText('Derslere dön').click()
  await openLesson('Üç Dörtlük')
  const tempo = (await page.textContent('.tempo-value'))?.trim()
  if (tempo !== '83 BPM') errors.push(`Tempo was not remembered: ${tempo}`)
  await page.getByLabel('Dersten çık').click()
  await playBeat('Dino Valsi', 'game-dino-waltz')
  await backToMap()
  await playBeat('Ritmi: Mavi Tuna')
  await backToMap()
  await playSong('Mavi Tuna', 'An der schönen blauen Donau', 'song-danube')
  await backToMap()
  await playSong('Menüet', 'Menuet in G, BWV Anh. 114', 'song-minuet')
  await backToMap()

  // Dotted quarters.
  await playTheory('Nokta Ne Yapar?', 'theory-rhythm-dotted', { shots: [0] })
  await backToMap()
  await playEcho('Yankı: Noktalılar')
  await backToMap()
  await playBeat('Noktalı Dörtlük', 'rhythm-dotted', { shotAt: 0.3 })
  await dismissOverlay()
  await page.screenshot({ path: `${out}/results-dotted.png`, fullPage: true })
  const dottedScore = await scoreOf()
  if (dottedScore !== 100) errors.push(`Perfectly timed dotted lesson scored ${dottedScore}%`)
  await page.getByText('Derslere dön').click()
  await playBeat('Davulcu: Noktalılar', 'game-drum-dotted')
  await backToMap()
  await playBeat('Ritmi: Londra Köprüsü')
  await backToMap()
  await playSong('Londra Köprüsü', 'London Bridge Is Falling Down', 'song-london')
  await backToMap()
  await playSong('Neşeye Övgü (aslı gibi)', 'An die Freude')
  await backToMap()

  // Review: mixed rhythm, a song, a song with a tempo ladder, everything mixed.
  await playDuet('Davul Düeti: Sekizlikler')
  await backToMap()
  await playBeat('Karışık Ritim')
  await backToMap()
  await playSong('Çanlar Çalıyor', 'Jingle Bells', 'song-jingle')
  await backToMap()
  const ladderRounds = await playSong('Şarkı Merdiveni', 'Frère Jacques')
  if (ladderRounds !== 3) errors.push(`Şarkı Merdiveni played ${ladderRounds} rounds, not 3`)
  await backToMap()
  await playBeat('Ritim Ustası')
  await backToMap()
  await page.screenshot({ path: `${out}/map-rhythm2.png`, fullPage: true })
}

/** Play a drill that first introduces new notes (the lit key), then the drill itself. */
async function playIntro(lessonTitle, shotName) {
  await openLesson(lessonTitle)
  await page.waitForSelector('.staff svg')
  let intros = 0
  for (let i = 0; i < 80 && !(await page.$('.results')); i++) {
    const intro = await page.getAttribute('.intro', 'data-intro', { timeout: 300 }).catch(() => null)
    if (intro) {
      if (intros === 0) {
        await page.waitForTimeout(300)
        await page.screenshot({ path: `${out}/${shotName}-intro.png` })
      }
      intros++
      await page.click(`.key[data-midi="${intro}"]`)
      await page.waitForTimeout(800)
      continue
    }
    const target = await page.getAttribute('.staff-wrap', 'data-note')
    await page.click(`.key[data-midi="${target}"]`)
    if (i === intros + 3) {
      await page.waitForTimeout(250)
      await page.screenshot({ path: `${out}/${shotName}.png` })
    }
    await page.waitForTimeout(520)
  }
  await page.waitForSelector('.results', { timeout: 3000 })
  await page.waitForTimeout(800)
  return intros
}

/** The Başlangıç unit: theory with quizzes, then the octave two notes at a time. */
async function basicsUnit() {
  const back = () => page.getByText('Derslere dön').click()
  // Every other unit waits for Başlangıç.
  const locked = await page.getAttribute('.node[aria-label="Sol El: İlk Adımlar (kilitli)"]', 'aria-label')
  if (!locked) throw new Error('Units after Başlangıç should start locked')
  await playTheory('Piyanoyla Tanışma', 'theory-piano', { shots: [0, 1, 2], wrongAt: 2, quizShot: 1 })
  await dismissOverlay()
  await page.screenshot({ path: `${out}/results-theory.png`, fullPage: true })
  const report = await page.textContent('.results')
  if (!report.includes('Tuşlar ve gruplar') || !report.includes('Bir daha göz at') || !report.includes('cevaplar'))
    throw new Error('Theory report lacks topics or the review card')
  await back()
  await playTheory('Parmak Numaraları', 'theory-fingers', { shots: [0, 1, 2], quizShot: 1 })
  await dismissOverlay()
  await back()
  await playTheory('Porte ve Sol Anahtarı', 'theory-staff', { shots: [0, 1, 2, 3, 4], quizShot: 2 })
  await dismissOverlay()
  await back()
  const intros = await playIntro('Do ve Sol', 'notes-do-sol')
  if (intros !== 2) throw new Error(`Expected 2 introduced notes, got ${intros}`)
  await dismissOverlay()
  await page.screenshot({ path: `${out}/results-do-sol.png`, fullPage: true })
  await back()
  await playIntro('Re ve Mi', 'notes-re-mi')
  await dismissOverlay()
  await back()
  await playArcade('Balonlar: Do Re Mi Sol', 'game-balloon-basics')
  await dismissOverlay()
  await back()
  await playIntro('Fa ve La', 'notes-fa-la')
  await dismissOverlay()
  await back()
  await playIntro('Si ve İnce Do', 'notes-si-do')
  await dismissOverlay()
  await back()
  await playTheory('Klavyesiz Okuma', 'theory-read', { quizShot: 0, wrongAt: 3 })
  await dismissOverlay()
  await page.screenshot({ path: `${out}/results-read.png`, fullPage: true })
  await back()
  await playArcade('Nota Kuşu: İlk Oktav', 'game-bird-basics')
  await dismissOverlay()
  await back()
  await playTheory('Nota Süreleri', 'theory-durations', { shots: [1], quizShot: 0 })
  await dismissOverlay()
  await back()
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${out}/map-basics.png`, fullPage: true })
}

/**
 * Play a Kulak Dedektifi lesson from window.__dpoEar: wait until each case has been heard,
 * then answer it on its button or key. `wrongAt` answers that case wrong once first.
 */
async function playEar(lessonTitle, shotName, { wrongAt = -1, shotAt = 1 } = {}) {
  await openLesson(lessonTitle)
  await page.click('.ear-start')
  for (let i = 0; i < 60 && !(await page.$('.results')); i++) {
    await page.waitForFunction(() => window.__dpoEar?.heard() || document.querySelector('.results'), null, {
      timeout: 15000,
    })
    if (await page.$('.results')) break
    const c = await page.evaluate(() => {
      const s = window.__dpoEar.session
      const p = s.current
      return {
        index: s.position,
        answer: p.answer,
        shown: String(p.shown),
        keys: !p.options,
        options: p.options?.map((o) => o.id) ?? [],
      }
    })
    const click = (id) => page.click(c.keys ? `.key[data-midi="${id}"]` : `[data-option="${id}"]`)
    if (c.index === wrongAt) {
      const keys = await page.$$eval('.key.white', (els) => els.map((e) => e.dataset.midi))
      await click(c.keys ? keys.find((k) => k !== c.answer && k !== c.shown) : c.options.find((o) => o !== c.answer))
      // The chosen answer and the right one are played: wait for the contrast to finish.
      await page.waitForTimeout(400)
      if (shotName) await page.screenshot({ path: `${out}/${shotName}-wrong.png` })
      await page.waitForFunction(() => !document.querySelector('.listen-btn[disabled]'), null, { timeout: 15000 })
    }
    await click(c.answer)
    if (shotName && c.index === shotAt) {
      await page.waitForTimeout(250)
      await page.screenshot({ path: `${out}/${shotName}.png` })
    }
    await page.waitForTimeout(200)
  }
  await page.waitForSelector('.results', { timeout: 5000 })
  await page.waitForTimeout(800)
}

/** Unit 8: ear training. Every lesson in turn, some with a mistake, and checks on the reports. */
async function earUnit() {
  const done = async (shot) => {
    await dismissOverlay()
    if (shot) await page.screenshot({ path: `${out}/${shot}.png`, fullPage: true })
    await page.getByText('Derslere dön').click()
    await page.waitForTimeout(300)
  }
  const expectText = async (sel, re, what) => {
    const text = (await page.textContent(sel).catch(() => '')) ?? ''
    if (!re.test(text)) errors.push(`${what}: ${text.slice(0, 200)}`)
  }
  await playTheory('Kulağa Giriş', 'theory-ear', { shots: [1, 3], quizShot: 2 })
  await done()
  await playEar('Yüksek mi Alçak mı?', 'ear-direction')
  await done()
  await playEar('Dedektif: Do ve Sol', 'ear-pitch', { wrongAt: 2 })
  await expectText('.ear-card', /sandın/, 'Ear card shows no confusion')
  await done('results-ear-pitch')
  await playEar('Dedektif: Do, Mi, Sol')
  await done()
  await playMemory('Atlamalı Hafıza', 'memory-leaps')
  await expectText('.results', /akor notasına sıçrama/, 'Leap memory report')
  await done()
  await playArcade('Kayıp Kuş Sesi', 'game-chirp')
  await expectText('.results h1', /tamamlandı/, 'Kayıp Kuş Sesi finished')
  await done('results-chirp')
  await playEar('Dedektif: Do Pozisyonu')
  await done()
  await playEar('Dedektif: Bütün Oktav', 'ear-pitch-octave', { shotAt: 4 })
  await done()
  await playArcade('Kayıp Kuş Sesi: Bütün Oktav', 'game-chirp-octave')
  await done()
  await playMemory('Şarkı Hafızası: Küçük Yıldız', 'memory-song', { wrongInRound: 2 })
  await expectText('.memory-card', /Küçük Yıldız.*3 dizinin 2 tanesini/s, 'Song memory card')
  await done('results-memory-song')
  await playTheory('Aralıklar ve Şarkıları', 'theory-intervals', { shots: [1, 2, 5], wrongAt: 0 })
  await done()
  await playArcade('Kurbağa Atlayışı', 'game-frog')
  await expectText('.results', /3'lü/, 'Frog report names the jumps')
  await done('results-frog')
  await playEar('İkili mi Üçlü mü?', 'ear-interval')
  await done()
  await playEar('Büyük mü Küçük mü?', '', { wrongAt: 0 })
  await expectText('.ear-card', /şarkısının başıyla hatırla/, 'Interval tip')
  await done('results-ear-interval')
  await playEar('Dörtlü, Beşli, Oktav')
  await done()
  await playArcade('Kurbağa: Büyük Zıplamalar')
  await done()
  await playEar('Aralık Avı', 'ear-sing', { wrongAt: 1 })
  await expectText('.ear-card', /sandın/, 'Aralık Avı counts the wrong key')
  await done()
  await playMemory('Şarkı Hafızası: Neşeye Övgü', 'memory-song-ode')
  await expectText('.memory-card', /şarkı ezberinde/, 'Ode memory card')
  await done()
  await playEar('İnen Aralıklar')
  await done()
  await playEar('Aynı Anda', 'ear-together')
  await done()
  await playEar('Bütün Aralıklar', 'ear-all')
  await done()
  await playMemory('Ters Hafıza', 'memory-reverse', { wrongInRound: 1 })
  await expectText('.results', /Tersten çalma/, 'Reverse memory report')
  await done()
  await playTheory('Akorların Renkleri', 'theory-chord-colours', { shots: [4] })
  await done()
  await playEar('Majör mü Minör mü?', 'ear-chord', { wrongAt: 3 })
  await expectText('.ear-card', /Majör|Minör/, 'Chord colour confusion')
  await done('results-ear-chord')
  await playEar('Eksik ve Artık')
  await done()
  await playEar('Yedili Akorlar', 'ear-sevenths')
  await done()
  await playMemory('Kulaktan Şarkı: Ufak Kuzu', 'memory-song-ear')
  await done()
  await playEar('Büyük Vaka', 'ear-final', { shotAt: 6 })
  await expectText('.results', /Baş Dedektif/, 'Baş Dedektif badge')
  await done('results-ear-final')
  await page.waitForTimeout(400)
  await page.screenshot({ path: `${out}/map-ear.png`, fullPage: true })
}

/**
 * Nota Şelalesi in the waiting mode: press the keys of each step. With `wait` the
 * script waits for the notes to reach the line; otherwise it plays ahead (allowed).
 * `wrongAt` presses a wrong key at that step the first time, so its section falls again.
 */
async function playWaterfall(lessonTitle, shotName, { wait = false, wrongAt = -1, shotAt = 6 } = {}) {
  await openLesson(lessonTitle, true)
  await page.waitForSelector('.song-start')
  if (shotName) await page.screenshot({ path: `${out}/${shotName}-ready.png` })
  for (let i = 0; i < 4 && (await page.getByLabel('Hızlandır').isEnabled()); i++)
    await page.getByLabel('Hızlandır').click()
  await page.click('.song-start')
  await page.waitForFunction(() => window.__dpoSong?.session)
  for (let i = 0; i < 400 && !(await page.$('.results')); i++) {
    const st = await page.evaluate(() => {
      const s = window.__dpoSong.session
      return s.done ? null : { step: s.index, waiting: s.waiting, pending: s.pending, records: s.records.length }
    })
    if (!st) break
    if (wait && !st.waiting) {
      await page.waitForTimeout(60)
      continue
    }
    if (st.records === wrongAt) {
      wrongAt = -1
      const wrong = st.pending[0] + 1
      await pressTogether([wrong], 0, 60)
      if (shotName) await page.screenshot({ path: `${out}/${shotName}-wrong.png` })
    }
    if (shotName && st.records === shotAt) await page.screenshot({ path: `${out}/${shotName}.png` })
    await pressTogether(st.pending, 15, 60)
  }
  await page.waitForSelector('.results', { timeout: 5000 })
  await page.waitForTimeout(800)
}

async function songsUnit() {
  const done = async (shot) => {
    await dismissOverlay()
    if (shot) await page.screenshot({ path: `${out}/${shot}.png`, fullPage: true })
    await page.getByText('Derslere dön').click()
    await page.waitForTimeout(300)
  }
  const expectText = async (sel, re, what) => {
    const text = (await page.textContent(sel).catch(() => '')) ?? ''
    if (!re.test(text)) errors.push(`${what}: ${text.slice(0, 200)}`)
  }
  await playTheory('Nota Şelalesi', 'theory-song', { shots: [0, 2], quizShot: 1 })
  await done()
  await playWaterfall('Ufak Kuzu: Öğren', 'song-wait', { wait: true, wrongAt: 3 })
  await expectText('.song-card', /1 bölüm tekrarı.*tekrarda düzeldi/s, 'Section repeat in the song card')
  await expectText('.results', /İlk Şarkım/, 'İlk Şarkım badge')
  await done('results-song-wait')
  await playBeat('Ufak Kuzu: Ritimli', 'song-tempo', { faster: 4 })
  await expectText('.song-card', /ritimli mod/, 'Tempo song card')
  await done('results-song-tempo')
  await playWaterfall('Küçük Yıldız: Öğren', '')
  await done()
  await playBeat('Küçük Yıldız: Ritimli', '', { faster: 4 })
  await done()
  await playWaterfall('Küçük Hans: Öğren', '')
  await done()
  await playBeat('Küçük Hans: Ritimli', '', { faster: 4 })
  await done()
  await playBeat('Neşeye Övgü: Sağ El', '', { faster: 4 })
  await done()
  await playWaterfall('Neşeye Övgü: Sol El', 'song-left', { wait: true })
  await done()
  await playWaterfall('Neşeye Övgü: İki El', 'song-both-wait', { wrongAt: 5 })
  await expectText('.results', /İki el birlikte/, 'Two-hand topic')
  await done('results-song-both-wait')
  await playBeat('Neşeye Övgü: İki El Ritimli', 'song-both-tempo', { faster: 4 })
  await expectText('.results', /İki Elle Şarkı/, 'İki Elle Şarkı badge')
  await done('results-song-both-tempo')
  await playBeat('Yankee Doodle: Sağ El', '', { faster: 4 })
  await done()
  await playWaterfall('Yankee Doodle: İki El', '')
  await done()
  await playWaterfall('Azizler Yürürken: 1. Yarı', '')
  await done()
  await playWaterfall('Azizler Yürürken: 2. Yarı', '')
  await expectText('.song-card', /ölçü 9–12/, 'Second half keeps the song’s bar numbers')
  await done()
  await playBeat('Azizler Yürürken', 'song-saints', { faster: 4 })
  await done()
  await playBeat('Kanon: Bas', '', { faster: 4 })
  await done()
  const rounds = await playBeat('Kanon', 'song-canon', { faster: 4 })
  if (rounds !== 3) errors.push(`Kanon tempo ladder played ${rounds} rounds instead of 3`)
  await done()
  await playWaterfall('Çanlar Çalıyor: Öğren', '')
  await done()
  await playBeat('Çanlar Çalıyor: Ritimli', '', { faster: 4 })
  await done()
  await playWaterfall('Menüet: Öğren', 'song-minuet')
  await done()
  await playBeat('Menüet: Ritimli', '', { faster: 4 })
  await done()
  await playBeat('Konser', 'song-concert', { faster: 8, shotAt: 0.2 })
  await expectText('.song-card', /Azizler Yürürken/, 'Concert sections')
  await expectText('.results', /Konser Piyanisti/, 'Konser Piyanisti badge')
  await done('results-song-concert')
  await page.waitForTimeout(400)
  await page.screenshot({ path: `${out}/map-songs.png`, fullPage: true })
}

/**
 * A unit boss fight: plays every phase on its own screen (note drills and the arcade games of
 * Başlangıç) and steps through the boss stage between them. `lose` presses wrong keys in the
 * first phase until the hearts run out.
 */
async function bossFight(title, shotName, { lose = false } = {}) {
  await openLesson(title)
  await page.waitForSelector('.boss-arena .boss-go')
  await page.waitForTimeout(400)
  await page.screenshot({ path: `${out}/${shotName}-intro.png` })
  await page.click('.boss-go')
  let between = 0
  for (let i = 0; i < 3000 && !(await page.$('.results')); i++) {
    if (await page.$('.game.boss[data-stage="between"]')) {
      await page.waitForTimeout(1300)
      await page.screenshot({ path: `${out}/${shotName}-hit-${++between}.png` })
      await page.click('.boss-go')
      await page.waitForTimeout(300)
      continue
    }
    const target = await page.getAttribute('.staff-wrap', 'data-note', { timeout: 100 }).catch(() => null)
    if (target) {
      const midi = Number(target)
      const key = lose ? (midi === 60 ? 62 : 60) : midi
      await page.click(`.key[data-midi="${key}"]`, { timeout: 1500 }).catch(() => undefined)
      await page.waitForTimeout(lose ? 150 : 520)
      continue
    }
    // Scale and chord phases: the keys still to press are on the board.
    const pending = await page
      .getAttribute('.melody-wrap, .chord-wrap', 'data-pending', { timeout: 100 })
      .catch(() => null)
    if (pending) {
      await pressTogether(pending.split(' ').map(Number), 20)
      await page.waitForTimeout(150)
      continue
    }
    const cooking = await page.evaluate(() => window.__dpoChordArcade?.cooking?.record.chord.notes.map((n) => n.midi))
    if (cooking) {
      await pressTogether(cooking, 20)
      await page.waitForTimeout(150)
      continue
    }
    const arcade = await page.evaluate(() => {
      const g = window.__dpoArcade
      if (!g) return null
      if ('pipes' in g) {
        const cur = g.current
        return cur && cur.record.answeredAt === null ? cur.record.target : null
      }
      const up = g.flying?.sort((a, b) => a.y - b.y)[0]
      return up && up.y < 0.4 ? up.record.target : null
    })
    if (arcade !== null) await page.click(`.key[data-midi="${arcade}"]`, { timeout: 1500 }).catch(() => undefined)
    await page.waitForTimeout(120)
  }
  await page.waitForSelector('.results', { timeout: 5000 })
  await page.waitForTimeout(900)
  await dismissOverlay()
  await page.screenshot({ path: `${out}/${shotName}-results.png`, fullPage: true })
  return between
}

/**
 * Tonlar yolculuğu: with test mode on (the key units open after the chords
 * unit), every lesson of Sol Majör ve Mi Minör in order, its boss, the key
 * circle on the profile, and the double sharps of Sol# minör on the staff.
 */
async function keysUnit() {
  await page.evaluate(() =>
    localStorage.setItem('dpo-settings', JSON.stringify({ state: { testMode: true }, version: 0 })),
  )
  await page.reload()
  await page.waitForSelector('.home')
  await page.locator('[data-unit="key-g"]').scrollIntoViewIfNeeded()
  await page.screenshot({ path: `${out}/keys-map.png` })
  const back = async () => {
    await dismissOverlay()
    await page.getByText('Derslere dön').click()
    await page.waitForSelector('.home')
    await page.waitForTimeout(500)
  }
  await playTheory('Sol Majör ve Mi Minör', 'keys-intro', { shots: [0, 2, 3], wrongAt: 3, quizShot: 0 })
  await back()
  await playMelody('Sol Majör Gamı', 'keys-scale')
  await back()
  await playBeat('Merdiven: Sol Majör', 'keys-ladder', { shotAt: 0.3 })
  await back()
  await playMelody('Sol Majör: Sol El ve İki El', 'keys-hands', { gapMs: 25, shotAfter: 20 })
  await back()
  // Hanon's second exercise carried into G: the score has F sharp in its key signature.
  await playWaterfall('Hanon 2: Sol Majör', 'keys-hanon', { shotAt: 12 })
  await back()
  await playChords('Sol Majör Akorları', 'keys-chords', { shotAfter: 6 })
  const numerals = await page.textContent('.results')
  if (!numerals.includes('vii°')) throw new Error('Scale chords report lacks the vii° degree')
  await back()
  await playChordArcade('Aşçı: Sol Majör', 'keys-chef')
  await back()
  await playChords('Sol Majör: Çevrimler', 'keys-inversions')
  await back()
  await playChordArcade('Uzay: Sol Majör', 'keys-space')
  await back()
  await playChords('Çevrim Merdiveni: Sol', 'keys-inv-ladder', { shotAfter: 2 })
  await back()
  await playChords('Sol Majör: Kadanslar', 'keys-cadence', { shotAfter: 4 })
  await back()
  await playMelody('Sol Majör: Arpejler', 'keys-arpeggio')
  await back()
  await playMelody('Mi Minör Gamı', 'keys-minor', { shotAfter: 22 })
  await back()
  await playChords('Mi Minör: Akorlar', 'keys-minor-chords', { shotAfter: 2 })
  await back()
  await playChordArcade('Barmen: Sol Majör ve Mi Minör', 'keys-bar')
  await back()
  await playMemory('Hafıza: Sol Majör', 'keys-memory')
  await back()
  await playMelody('Ufak Kuzu (Sol Majör)', 'keys-piece', { shotAfter: 3 })
  await back()
  const hits = await bossFight('Boss: Fa Diyez Faresi', 'keys-boss')
  if (hits !== 3) throw new Error(`Key boss: expected 3 phase breaks, saw ${hits}`)
  if (!(await page.textContent('h1')).includes('Fa Diyez Faresi yenildi')) throw new Error('Key boss should be beaten')
  await back()

  // The key circle fills Sol and mi.
  await page.getByLabel('Profil').click()
  await page.waitForSelector('.key-circle')
  const share = (key) => page.getAttribute(`[data-key="${key}"]`, 'data-share')
  if (Number(await share('key-g-major')) < 90 || Number(await share('key-g-minor')) < 90)
    throw new Error(`Key circle: Sol ${await share('key-g-major')}%, mi ${await share('key-g-minor')}%`)
  if (Number(await share('key-d-major')) !== 0) throw new Error('Key circle: Re should be empty')
  await page.locator('.key-circle-card').screenshot({ path: `${out}/keys-circle.png` })
  await page.getByLabel('Geri').click()
  await page.waitForSelector('.home')

  // Double sharps: Sol# minör's harmonic seventh is Fa𝄪, drawn with its sign.
  await openLesson('Sol# Minör Gamı')
  await page.waitForSelector('.melody-wrap .staff svg')
  // The natural minor up and down (15 notes), then the harmonic one up to its seventh.
  for (let i = 0; i < 21; i++) {
    const pending = await page.getAttribute('.melody-wrap', 'data-pending')
    await pressTogether(pending.split(' ').map(Number), 20)
    await page.waitForTimeout(200)
  }
  await page.screenshot({ path: `${out}/keys-double-sharp.png` })
  await page.getByLabel('Dersten çık').click()
  await page.waitForSelector('.home')
  await openLesson('Fa# Majör Akorları')
  await page.waitForSelector('.chord-wrap .staff svg')
  await page.screenshot({ path: `${out}/keys-fsharp-chords.png` })
  await page.getByLabel('Dersten çık').click()
  await page.waitForSelector('.home')
}

/**
 * Etüt Kitaplığı (after Başlangıç): the theory card, a first étude read from the score with a
 * mistake, the next lessons and level opening, the switch to the falling notes, an étude in
 * two hands, and one on the metronome (test mode opens it).
 */
async function etudesUnit() {
  const back = async () => {
    await dismissOverlay()
    await page.getByText('Derslere dön').click()
    await page.waitForSelector('.etudes')
    await page.waitForTimeout(300)
  }
  const isOpen = (id) => page.locator(`[data-etude="${id}"]`).isEnabled()
  await page.locator('[data-node="etudes"] button').click()
  await page.waitForSelector('.etudes')
  await page.screenshot({ path: `${out}/etudes-library.png`, fullPage: true })
  if (await isOpen('etude-five-c-steps-right')) throw new Error('Études: the second lesson should wait for the first')
  if (await isOpen('etude-menuet-g-right')) throw new Error('Études: level 2 should be locked')

  await playTheory('Partisyonu Okumak', 'etude-theory', { shots: [0, 2] })
  await back()
  if (!(await page.$('[data-etude="etude-intro"].back')))
    throw new Error('Études: the library should mark the lesson played')
  if (!(await isOpen('etude-five-c-steps-right'))) throw new Error('Études: a star should open the next lesson')
  if (!(await isOpen('etude-menuet-g-right'))) throw new Error('Études: a star in level 1 should open level 2')
  if (await isOpen('etude-menuet-g-both')) throw new Error('Études: level 3 should be locked')

  // Five-finger position, written by rule: the right hand alone, then both hands mirrored.
  await playWaterfall('Basamaklar: Sağ El', 'etude-five', { shotAt: 4 })
  await back()
  await playWaterfall('Sol Majör Menüet: Sağ El', 'etude-wait', { wrongAt: 3, shotAt: 8 })
  const results = await page.textContent('.results')
  if (!/Sol Majör Menüet/.test(results)) throw new Error(`Étude results: ${results.slice(0, 200)}`)
  await back()
  if (!(await isOpen('etude-menuet-g-both'))) throw new Error('Études: a star in level 2 should open level 3')

  // The score is the default view; the chip switches to the falling notes and back.
  await openLesson('Sol Majör Menüet: Sol El')
  await page.waitForSelector('.score-view svg')
  const bass = await page.$$eval('.score-view svg', (svgs) => svgs.length)
  if (bass !== 1) throw new Error(`Études: expected one score, saw ${bass}`)
  await page.click('.view-toggle')
  await page.waitForSelector('.waterfall canvas')
  await page.screenshot({ path: `${out}/etude-waterfall.png` })
  await page.click('.view-toggle')
  await page.waitForSelector('.score-view svg')
  await page.getByLabel('Dersten çık').click()
  await page.waitForSelector('.etudes')

  await playWaterfall('Sol Majör Menüet: İki El', 'etude-both', { shotAt: 10 })
  if (!/İki el birlikte/.test(await page.textContent('.results'))) throw new Error('Two-hand étude lacks its topic')
  await back()

  // On the metronome: sixteenths in 2/4 (Musette's right hand), opened by test mode.
  await page.getByLabel('Haritaya dön').click()
  await page.waitForSelector('.home')
  await page.evaluate(() =>
    localStorage.setItem('dpo-settings', JSON.stringify({ state: { testMode: true }, version: 0 })),
  )
  await page.reload()
  await page.locator('[data-node="etudes"] button').click()
  await playBeat('Musette: Metronomla', 'etude-tempo', { slower: 4 })
  await back()
  await playWaterfall('Ayna: Ters Yönde İki El', 'etude-mirror', { shotAt: 6 })
  await back()
  // Hanon in sixteenths on the metronome, Burgmüller in the waiting mode, a 6/8 piece and Tchaikovsky.
  await playBeat('Hanon 1: Metronomla', 'etude-hanon')
  await back()
  await playWaterfall('Saflık: İki El', 'etude-burgmuller', { shotAt: 10 })
  if (!/Saflık/.test(await page.textContent('.results'))) throw new Error('Burgmüller results lack the piece')
  await back()
  await playWaterfall('Kır Şarkısı: İki El', 'etude-pastorale', { shotAt: 10 })
  await back()
  await playWaterfall('Sabah Duası: İki El', 'etude-tchaikovsky', { shotAt: 10 })
  await back()
  await page.getByLabel('Haritaya dön').click()
  await page.waitForSelector('.home')
}

/** Başlangıç's boss beaten, then lost to; the day's quests moved on by the unit's lessons. */
async function bossesAndQuests() {
  const back = () => page.getByText('Derslere dön').click()
  await page.locator('[data-shortcut="quests"]').click()
  const board = await page.textContent('.quest-board')
  if (!board.includes('Bugünün görevleri') || !board.includes('Haftalık meydan okuma'))
    throw new Error(`Quest board missing: ${board}`)
  const doneQuests = await page.locator('.quest-board .quest.done').count()
  if (doneQuests < 1) throw new Error('No quest done after the whole Başlangıç unit')
  await page.locator('.quest-board').screenshot({ path: `${out}/quests-map.png` })
  await page.keyboard.press('Escape')

  const hits = await bossFight('Boss: Karışık Kedi', 'boss-win')
  if (hits !== 3) throw new Error(`Expected the boss stage after each of 3 phases, saw ${hits}`)
  const win = await page.textContent('.results')
  if (!(await page.textContent('h1')).includes('Karışık Kedi yenildi')) throw new Error('Boss should be beaten')
  if (!(await page.$('.boss-card[data-defeated]'))) throw new Error('Boss card should say the boss fell')
  for (const want of ['Boss yenildi', 'Boss Avcısı', '1. aşama: Nota okuma', '3. aşama: Nota Kuşu'])
    if (!win.includes(want)) throw new Error(`Boss results lack "${want}"`)
  await back()
  await page.waitForTimeout(400)
  const stars = await page.getAttribute('[data-node="boss-basics"] .node-stars', 'aria-label')
  if (stars === '0 yıldız') throw new Error('Beaten boss should have stars on the map')

  await bossFight('Boss: Karışık Kedi', 'boss-lose', { lose: true })
  if (!(await page.textContent('h1')).includes('Karışık Kedi kazandı')) throw new Error('Boss should win')
  const lost = await page.textContent('.boss-card')
  if (!lost.includes('canlar bitti') || !lost.includes('oynanmadı'))
    throw new Error(`Lost boss card should say where the hearts ran out: ${lost}`)
  await back()
  await page.waitForTimeout(400)
  if ((await page.getAttribute('[data-node="boss-basics"] .node-stars', 'aria-label')) !== stars)
    throw new Error('A lost fight must keep the boss stars')
}

/** Runs a function on the app's IndexedDB (Dexie 'dijital-piyano') inside the page. */
async function idb(fn, arg) {
  return page.evaluate(
    ([src, a]) =>
      new Promise((resolve, reject) => {
        const open = indexedDB.open('dijital-piyano')
        open.onerror = () => reject(open.error)
        open.onsuccess = () => {
          const tx = open.result.transaction(['review', 'sessions', 'kv'], 'readwrite')
          let result
          Promise.resolve(new Function('tx', 'a', `return (${src})(tx, a)`)(tx, a)).then((r) => (result = r))
          tx.oncomplete = () => {
            open.result.close()
            resolve(result)
          }
          tx.onerror = () => reject(tx.error)
        }
      }),
    [fn.toString(), arg],
  )
}

const allCards = () =>
  idb(
    (tx) =>
      new Promise((resolve) => {
        const req = tx.objectStore('review').getAll()
        req.onsuccess = () => resolve(req.result)
      }),
  )

/**
 * Phase 12: Başlangıç leaves note cards behind; made due (and with a chord and a scale card
 * added) they become Günün Karışımı, played through its three phases. Then the arcade pace
 * after a perfect Nota Kuşu, and the weekly summaries on the profile and the map.
 */
async function smartLearning() {
  const back = async () => {
    await page.getByText('Derslere dön').click()
    await page.waitForTimeout(500)
  }
  let cards = await allCards()
  const notes = cards.filter((c) => c.kind === 'note')
  if (notes.length < 8) throw new Error(`Başlangıç should leave note cards, found ${notes.length}`)
  if (!notes.every((c) => c.box >= 1 && c.due > '2026')) throw new Error('Cards need a box and a date')
  if ((await page.getAttribute('.mix-card', 'data-due')) !== 'no')
    throw new Error('Right after the lessons nothing should be due yet')

  // A few days later: every card is due; a chord and a scale were played earlier too.
  await idb((tx) => {
    const store = tx.objectStore('review')
    const req = store.getAll()
    req.onsuccess = () => {
      for (const c of req.result) store.put({ ...c, due: '2000-01-01' })
      const base = { lastSeen: 0, shown: 4, firstTry: 2, last: 0.5, due: '2000-01-01', box: 2 }
      store.put({
        ...base,
        key: 'chord:c0:major:0:right',
        kind: 'chord',
        label: 'Do Majör',
        data: { kind: 'chord', root: { letter: 'c', acc: 0 }, quality: 'major', inversion: 0, hands: 'right' },
      })
      store.put({
        ...base,
        key: 'chord:g0:major:0:right',
        kind: 'chord',
        label: 'Sol Majör',
        data: { kind: 'chord', root: { letter: 'g', acc: 0 }, quality: 'major', inversion: 0, hands: 'right' },
      })
      store.put({
        ...base,
        key: 'scale:C:major:right:1',
        kind: 'scale',
        label: 'Do Majör · sağ el',
        data: { kind: 'scale', part: { tonic: 'C', type: 'major', hands: 'right' } },
      })
    }
  })
  await page.reload()
  await page.waitForSelector('.mix-card[data-due="yes"]')
  const card = await page.textContent('.mix-card')
  if (!/\d+ nota, 2 akor, 1 gam/.test(card) || !card.includes('+15 XP')) throw new Error(`Mix card: ${card}`)
  await page.locator('.mix-card').screenshot({ path: `${out}/mix-card.png` })

  await page.getByLabel('Günün Karışımı’nı başlat').click()
  await page.waitForSelector('.game.mix .boss-go')
  await page.screenshot({ path: `${out}/mix-intro.png` })
  await page.click('.boss-go')
  let between = 0
  for (let i = 0; i < 600 && !(await page.$('.results')); i++) {
    if (await page.$('.game.mix[data-stage="between"]')) {
      await page.waitForTimeout(500)
      await page.screenshot({ path: `${out}/mix-between-${++between}.png` })
      await page.click('.boss-go')
      await page.waitForTimeout(300)
      continue
    }
    const note = await page.getAttribute('.staff-wrap', 'data-note', { timeout: 100 }).catch(() => null)
    if (note) {
      await page.click(`.key[data-midi="${note}"]`)
      await page.waitForTimeout(520)
      continue
    }
    const pending =
      (await page.getAttribute('.chord-wrap', 'data-pending', { timeout: 100 }).catch(() => null)) ||
      (await page.getAttribute('.melody-wrap', 'data-pending', { timeout: 100 }).catch(() => null))
    if (pending) await pressTogether(pending.split(' ').map(Number), 20)
    await page.waitForTimeout(200)
  }
  await page.waitForSelector('.results', { timeout: 5000 })
  if (between !== 3) throw new Error(`Expected Notiş after each of 3 mix phases, saw ${between}`)
  await page.waitForTimeout(900)
  await dismissOverlay()
  await page.waitForSelector('.review-card')
  await page.screenshot({ path: `${out}/mix-results.png`, fullPage: true })
  const results = await page.textContent('.results')
  for (const want of ['Günün Karışımı tamamlandı', 'Günün karışımı', 'Aralıklı tekrar', 'kutu 2 → 3', 'Do Majör'])
    if (!results.includes(want)) throw new Error(`Mix results lack "${want}"`)
  await back()
  // The card is drawn from the cards read last time, then refreshed.
  if (!(await page.waitForSelector('.mix-card[data-due="no"]', { timeout: 3000 }).catch(() => null)))
    throw new Error('After the mix nothing is due')
  cards = await allCards()
  const moved = cards.filter((c) => c.kind === 'note' && c.box === 3).length
  if (moved < 4) throw new Error(`Played well when due, note cards should reach box 3 (${moved})`)
  if (!cards.find((c) => c.key === 'scale:C:major:right:1' && c.box === 3))
    throw new Error('Scale card did not move up')

  // Adaptive pace: Başlangıç already played this Nota Kuşu perfectly (×1,1); another perfect game makes it ×1,2.
  await playArcade('Nota Kuşu: İlk Oktav', 'smart-bird')
  await dismissOverlay()
  const pace = await page.textContent('[data-adapt="pace"]').catch(() => null)
  if (!pace?.includes('×1,2')) throw new Error(`Perfect game should speed up: ${pace}`)
  if (!(await page.textContent('.review-line'))?.includes('Tekrar kartları')) throw new Error('No review line')
  await back()
  await openLesson('Nota Kuşu: İlk Oktav')
  await page.waitForSelector('.pace-chip')
  if ((await page.textContent('.pace-chip')) !== 'Hız ×1,2') throw new Error('No pace chip in the game')
  await page.waitForTimeout(1500)
  await page.screenshot({ path: `${out}/smart-bird-pace.png` })
  await page.getByLabel('Oyundan çık').click()
  await page.waitForTimeout(500)

  // Weekly summary: this week on the profile, last week on the map until closed.
  await page.getByLabel('Profil').click()
  await page.waitForSelector('.week-card[data-week="this"] .week-stats')
  await page.locator('.week-card').screenshot({ path: `${out}/week-profile.png` })
  await page.getByLabel('Geri').click()
  await idb((tx) => {
    const at = Date.now() - 7 * 86_400_000
    for (const [i, lessonId] of ['basics-notes-1', 'basics-notes-2'].entries())
      tx.objectStore('sessions').add({
        lessonId,
        at: at + i,
        total: 10,
        firstTry: 7,
        accuracy: 0.7,
        avgReactionMs: 1500,
        stars: 1,
        xp: 15,
        failed: false,
      })
  })
  await page.reload()
  await page.waitForSelector('.week-card[data-week="last"]')
  await page.locator('.week-card').screenshot({ path: `${out}/week-map.png` })
  await page.getByLabel('Haftalık özeti kapat').click()
  // The profile is saved to IndexedDB in the background.
  await page.waitForTimeout(500)
  await page.reload()
  await page.waitForSelector('.mix-card')
  await page.waitForTimeout(800)
  if (await page.$('.week-card')) throw new Error('A closed weekly summary should stay closed this week')
}

async function finish() {
  await browser.close()
  if (errors.length) {
    console.error('Smoke test failed:', [...new Set(errors)])
    process.exit(1)
  }
}

await page.goto(url)

// SMOKE_ONLY=test checks test mode (all lessons open, notes, early finish) and the progress code.
if (process.env.SMOKE_ONLY === 'test') {
  await page.waitForTimeout(800)
  await testModeFlow()
  await finish()
  console.log(`Smoke test (test mode) passed. Screenshots in ${out}/`)
  process.exit(0)
}

// SMOKE_ONLY=chords plays Başlangıç (it opens the other units), then unit 6.
if (process.env.SMOKE_ONLY === 'chords') {
  await page.waitForTimeout(800)
  await basicsUnit()
  await chordsUnit()
  await finish()
  console.log(`Smoke test (chords) passed. Screenshots in ${out}/`)
  process.exit(0)
}
// SMOKE_ONLY=rhythm plays Başlangıç (it opens the other units), then both rhythm units.
if (process.env.SMOKE_ONLY === 'rhythm') {
  await page.waitForTimeout(800)
  await basicsUnit()
  await rhythmUnits()
  await finish()
  console.log(`Smoke test (rhythm) passed. Screenshots in ${out}/`)
  process.exit(0)
}
// SMOKE_ONLY=ear plays Başlangıç (it opens the other units), then unit 8.
if (process.env.SMOKE_ONLY === 'ear') {
  await page.waitForTimeout(800)
  await basicsUnit()
  await earUnit()
  await finish()
  console.log(`Smoke test (ear) passed. Screenshots in ${out}/`)
  process.exit(0)
}
// SMOKE_ONLY=songs plays Başlangıç (it opens the other units), then unit 9.
if (process.env.SMOKE_ONLY === 'songs') {
  await page.waitForTimeout(800)
  await basicsUnit()
  await songsUnit()
  await finish()
  console.log(`Smoke test (songs) passed. Screenshots in ${out}/`)
  process.exit(0)
}
// SMOKE_ONLY=boss plays Başlangıç, checks the quests, beats its boss and loses to it.
if (process.env.SMOKE_ONLY === 'boss') {
  await page.waitForTimeout(800)
  await basicsUnit()
  await bossesAndQuests()
  await finish()
  console.log(`Smoke test (boss) passed. Screenshots in ${out}/`)
  process.exit(0)
}
// SMOKE_ONLY=smart plays Başlangıç, then Günün Karışımı, the adaptive pace and the weekly summaries.
if (process.env.SMOKE_ONLY === 'smart') {
  await page.waitForTimeout(800)
  await basicsUnit()
  await smartLearning()
  await finish()
  console.log(`Smoke test (smart learning) passed. Screenshots in ${out}/`)
  process.exit(0)
}
/**
 * Nota Treni (each song named as its first wagon comes up) and the Oyun Salonu: an endless
 * Nota Kuşu with bass notes is not open yet, the treble one is; a first game sets a record,
 * a weaker one does not beat it.
 */
async function gamesRound() {
  for (const t of ['İlk Adımlar', 'Bir Oktav']) {
    await play(t)
    await dismissOverlay()
    await page.getByText('Derslere dön').click()
  }
  // Oyun arası Notiş: the first Nota Treni starts with its rule, and the game waits behind it.
  await page.evaluate(() => localStorage.setItem('dpo-intros', '[]'))
  await openLesson('Nota Treni')
  await page.waitForSelector('.game-intro .game-intro-steps li.on')
  await page.waitForSelector('.pixi-stage canvas')
  const frontAt = () => page.evaluate(() => window.__dpoArcade.front?.x ?? null)
  const before = await frontAt()
  await page.waitForTimeout(1500)
  if ((await frontAt()) !== before) errors.push('Oyun arası Notiş: the train moved behind the intro')
  await page.screenshot({ path: `${out}/game-intro.png` })
  await page.getByText('Hadi oynayalım!').click()
  if (await page.$('.game-intro')) errors.push('Oyun arası Notiş: the intro did not close')
  await page.evaluate(() => localStorage.setItem('dpo-intros', 'off'))
  const titles = new Set()
  for (let i = 0; i < 3000 && !(await page.$('.results')); i++) {
    const target = await page.evaluate(() => {
      const g = window.__dpoArcade
      return g.front && g.front.x < 0.7 ? g.front.record.target : null
    })
    const msg = (await page.textContent('.arcade-message').catch(() => '')) ?? ''
    if (msg.startsWith('🎵')) titles.add(msg)
    if (target !== null) await page.click(`.key[data-midi="${target}"]`)
    if (i === 30) await page.screenshot({ path: `${out}/game-train.png` })
    await page.waitForTimeout(90)
  }
  for (const original of ['Goin’ Home', 'Row, Row, Row Your Boat', 'Old MacDonald Had a Farm'])
    if (![...titles].some((t) => t.includes(original)))
      errors.push(`Nota Treni never named ${original}: ${[...titles]}`)
  if (!(await page.textContent('.results h1'))?.includes('tamamlandı')) errors.push('Nota Treni did not finish')
  await page.screenshot({ path: `${out}/results-train.png`, fullPage: true })
  await dismissOverlay()
  await page.getByText('Derslere dön').click()
  await page.waitForTimeout(500)

  await page.getByRole('button', { name: 'Oyun Salonu’na gir', exact: true }).click()
  await page.waitForSelector('.salon-game')
  if (!(await page.$('.salon-game[data-game="bird"]:not([disabled])'))) errors.push('Salon: Nota Kuşu is not open')
  if (!(await page.$('.salon-game[data-game="space"][disabled]'))) errors.push('Salon: Uzay Savunması should be locked')
  await page.click('.salon-game[data-game="bird"]')
  if (!(await page.$('.salon-skill[data-skill="fa"][disabled]'))) errors.push('Salon: bass notes should be locked')
  await page.screenshot({ path: `${out}/salon.png`, fullPage: true })

  /** An endless Nota Kuşu: `right` pipes played, then the hearts run out. Returns the record card text. */
  const endless = async (right, skill = 'oktav', during = async () => undefined) => {
    await page.click(`.salon-skill[data-skill="${skill}"]`)
    await page.click('.salon-play')
    await page.waitForSelector('.pixi-stage canvas')
    if (!(await page.$('.endless-bar'))) errors.push('Salon: no endless bar')
    let played = 0
    for (let i = 0; i < 3000 && !(await page.$('.results')); i++) {
      if (i === 25) await during()
      if (played < right) {
        const target = await page.evaluate(() => {
          const cur = window.__dpoArcade.current
          return cur && cur.record.answeredAt === null ? cur.record.target : null
        })
        if (target !== null) {
          await page.click(`.key[data-midi="${target}"]`)
          played++
        }
      }
      await page.waitForTimeout(100)
    }
    await page.waitForSelector('.results .record-card')
    await page.waitForTimeout(900)
    return page.textContent('.record-card')
  }
  const first = await endless(6)
  if (!/Yeni rekor/.test(first)) errors.push(`Salon: no new record: ${first}`)
  // Hayalet: the first run becomes the ghost; Ses katmanları: the notes played come back as a melody.
  if (!(await page.$('[data-ghost="new"]'))) errors.push('Hayalet: the first run did not become the ghost')
  if (!(await page.$('.melody-card .melody-play'))) errors.push('Ses katmanları: no melody to listen to')
  await page.screenshot({ path: `${out}/results-salon.png`, fullPage: true })
  await dismissOverlay()
  await page.getByText('Salona dön').click()
  await page.waitForSelector('.salon-game[data-game="bird"].on')
  let chip = null
  const second = await endless(2, 'oktav', async () => {
    chip = await page.textContent('.ghost-chip').catch(() => null)
  })
  if (/Yeni rekor/.test(second) || !/önceki rekor/.test(second)) errors.push(`Salon: second game: ${second}`)
  if (!chip || !/👻 \d+ · sen \d+/.test(chip)) errors.push(`Hayalet: no ghost chip in the second game: ${chip}`)
  if (!(await page.$('[data-ghost="false"]'))) errors.push('Hayalet: the weaker run should not beat the ghost')
  await page.getByText('Salona dön').click()

  // Bilinen şarkılar (opened by Nota Treni): Nota Kuşu plays songs, named as they come.
  await page.click('.salon-game[data-game="bird"]')
  let song = null
  await endless(8, 'sarki', async () => {
    song = await page.textContent('.arcade-message')
  })
  if (!song?.startsWith('🎵')) errors.push(`Bilinen şarkılar: no song named: ${song}`)
  const melody = await page.textContent('.melody-card').catch(() => '')
  if (!/🎵 .+ · /.test(melody)) errors.push(`Bilinen şarkılar: the results name no song: ${melody}`)
  await page.screenshot({ path: `${out}/results-salon-songs.png`, fullPage: true })
  await dismissOverlay()
  await page.getByText('Salona dön').click()
  const card = await page.textContent('.salon-game[data-game="bird"]')
  if (!/🏆 [1-9]/.test(card)) errors.push(`Salon: the game card shows no record: ${card}`)
  await page.getByLabel('Haritaya dön').click()
  await page.waitForSelector('.home')
}

// SMOKE_ONLY=games plays Başlangıç, Nota Treni and the Oyun Salonu.
if (process.env.SMOKE_ONLY === 'games') {
  await page.waitForTimeout(800)
  await basicsUnit()
  await gamesRound()
  await finish()
  console.log(`Smoke test (games) passed. Screenshots in ${out}/`)
  process.exit(0)
}
// SMOKE_ONLY=etudes plays Başlangıç (it opens the Etüt Kitaplığı), then études.
if (process.env.SMOKE_ONLY === 'etudes') {
  await page.waitForTimeout(800)
  await basicsUnit()
  await etudesUnit()
  await finish()
  console.log(`Smoke test (etudes) passed. Screenshots in ${out}/`)
  process.exit(0)
}
// SMOKE_ONLY=keys plays the second key unit (Sol Majör ve Mi Minör) in test mode.
if (process.env.SMOKE_ONLY === 'keys') {
  await keysUnit()
  await finish()
  console.log(`Smoke test (keys) passed. Screenshots in ${out}/`)
  process.exit(0)
}
// SMOKE_ONLY=basics plays only the Başlangıç unit.
if (process.env.SMOKE_ONLY === 'basics') {
  await page.waitForTimeout(800)
  await page.screenshot({ path: `${out}/map-empty.png` })
  await basicsUnit()
  await finish()
  console.log(`Smoke test (basics) passed. Screenshots in ${out}/`)
  process.exit(0)
}
await page.waitForTimeout(800)
await page.screenshot({ path: `${out}/map-empty.png` })
await basicsUnit()

await play('İlk Adımlar', { shotAfter: 5, shotName: 'game-combo' })
await dismissOverlay()
await page.screenshot({ path: `${out}/results.png`, fullPage: true })
await page.getByText('Derslere dön').click()

await play('Bir Oktav')
await dismissOverlay()
await page.getByText('Derslere dön').click()

await playArcade('Nota Treni', 'game-train')
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

await rhythmUnits()

// Phase 6, unit 3: the bass clef with the left hand, starting with the clef and the notes two at a time.
await playTheory('Fa Anahtarı', 'theory-bass', { shots: [0, 2], quizShot: 5 })
await dismissOverlay()
await page.getByText('Derslere dön').click()
for (const [title, shot] of [
  ['Sol El: Do ve Sol', 'notes-bass-do-sol'],
  ['Sol El: Re ve Mi', 'notes-bass-re-mi'],
  ['Sol El: Fa ve La', 'notes-bass-fa-la'],
  ['Sol El: Si ve Orta Do', 'notes-bass-si-do'],
]) {
  await playIntro(title, shot)
  await dismissOverlay()
  await page.getByText('Derslere dön').click()
}
await playTheory('Fa: Klavyesiz Okuma', 'theory-bass-read', { quizShot: 0 })
await dismissOverlay()
await page.getByText('Derslere dön').click()
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
// Notes around middle C are written on either staff at random, every other note on its own staff.
// Checked as a group: with ~13 middle notes in 24 prompts, all on one staff has odds of ~1 in 4000
// (asking two notes to show up on both staves each failed about one run in ten).
const MIDDLE = [57, 59, 60, 62, 64]
const middleOn = (clef) => MIDDLE.some((m) => bridge.has(`${clef}:${m}`))
if (!middleOn('treble') || !middleOn('bass'))
  errors.push(`Middle C notes were not written on both staves: ${[...bridge].join(' ')}`)
const misplaced = [...bridge].filter((s) => {
  const [clef, midi] = [s.split(':')[0], Number(s.split(':')[1])]
  return !MIDDLE.includes(midi) && clef !== (midi >= 60 ? 'treble' : 'bass')
})
if (misplaced.length) errors.push(`Notes away from middle C on the wrong staff: ${misplaced.join(' ')}`)
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
await openLesson('Tempo Merdiveni')
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
await earUnit()
await songsUnit()

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
await page.locator('[data-shortcut="midi"]').click()
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
