// Layout suite: opens one lesson of every game type on a desktop, a phone held upright
// and a phone held sideways, plays a little, checks the layout and takes screenshots.
// Usage: npm run build && npx vite preview --port 4173 & npm run layout [-- <output dir>]
// In Claude Code cloud sessions set CHROMIUM_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome
// LAYOUT_ONLY=space,bird runs only those cases; LAYOUT_VIEWPORTS=phone runs only that viewport.
// Writes <out>/rapor.md (a table per game and viewport) and <out>/rapor.json; exits 1 on any error.
import { mkdirSync, writeFileSync } from 'node:fs'
import { chromium } from 'playwright'

const out = process.argv[2] ?? 'layout-screens'
const url = process.env.APP_URL ?? 'http://localhost:4173/'
mkdirSync(out, { recursive: true })

const VIEWPORTS = [
  // A laptop browser window: a 1366×768 screen minus the browser's own bars.
  { id: 'masaustu', name: 'Masaüstü 1366×700', viewport: { width: 1366, height: 700 } },
  { id: 'telefon', name: 'Telefon dikey 390×844', viewport: { width: 390, height: 844 }, mobile: true },
  { id: 'yatay', name: 'Telefon yatay 844×390', viewport: { width: 844, height: 390 }, mobile: true },
].filter((v) => !process.env.LAYOUT_VIEWPORTS || process.env.LAYOUT_VIEWPORTS.split(',').includes(v.id))

/**
 * One lesson per game type (plus the variants that stress the layout: a wide keyboard,
 * the grand staff, two-octave scales, games by ear). `area` is the play area that must
 * stay on screen next to the keyboard.
 */
const CASES = [
  { id: 'theory', name: 'Teori kartı ve quiz', title: 'Piyanoyla Tanışma', drive: 'theory', area: '.theory-card' },
  { id: 'intro', name: 'Nota tanıtımı', title: 'Do ve Sol', drive: 'drill', area: '.staff-wrap' },
  { id: 'drill', name: 'Nota alıştırması', title: 'İlk Adımlar', drive: 'drill', area: '.staff-wrap' },
  { id: 'drill-wide', name: 'Geniş klavyeli alıştırma', title: 'Porte Ustası', drive: 'drill', area: '.staff-wrap' },
  { id: 'grand', name: 'Büyük porte', title: 'Büyük Porte', drive: 'drill', area: '.staff-wrap' },
  { id: 'bird', name: 'Nota Kuşu', title: 'Nota Kuşu', drive: 'arcade', area: '.pixi-stage' },
  { id: 'balloon', name: 'Balon Patlatma', title: 'Balon Patlatma', drive: 'arcade', area: '.pixi-stage' },
  { id: 'bar', name: 'Nota Barmeni', title: 'Nota Barmeni', drive: 'arcade', area: '.pixi-stage' },
  { id: 'melody', name: 'İki el melodi', title: 'İki El Birlikte', drive: 'melody', area: '.melody-wrap' },
  { id: 'rhythm', name: 'Ritim (porte)', title: 'Dörtlükler', drive: 'beat', area: '.beat-field' },
  { id: 'dino', name: 'Dino Koşusu', title: 'Dino Koşusu', drive: 'beat', area: '.beat-field' },
  { id: 'drum', name: 'Ritim Davulcusu', title: 'Ritim Davulcusu', drive: 'beat', area: '.beat-field' },
  { id: 'scale', name: 'Gam', title: 'Do Majör', drive: 'melody', area: '.melody-wrap' },
  { id: 'scale-wide', name: 'İki oktav, iki el', title: 'İki Oktav: İki El', drive: 'melody', area: '.melody-wrap' },
  { id: 'ladder', name: 'Gam Merdiveni', title: 'Gam Merdiveni', drive: 'beat', area: '.beat-field' },
  // The memory and ear boards are status strips: no minimum height.
  {
    id: 'memory',
    name: 'Melodi Hafızası',
    title: 'Melodi Hafızası',
    drive: 'memory',
    area: '.memory-board',
    minShare: 0,
  },
  {
    id: 'memory-ear',
    name: 'Kulaktan Hafıza',
    title: 'Kulaktan Hafıza',
    drive: 'memory',
    area: '.memory-board',
    minShare: 0,
  },
  { id: 'chord', name: 'Akor dersi', title: 'Majör Üçlüler', drive: 'chord', area: '.chord-wrap' },
  { id: 'chord-ear', name: 'Kulaktan Akor', title: 'Kulaktan Akor', drive: 'ear', area: '.ear-board', minShare: 0 },
  { id: 'chef', name: 'Akor Aşçısı', title: 'Akor Aşçısı', drive: 'chordArcade', area: '.pixi-stage' },
  { id: 'space', name: 'Uzay Savunması', title: 'Uzay Savunması', drive: 'chordArcade', area: '.pixi-stage' },
  { id: 'chordbar', name: 'Akor Barmeni', title: 'Akor Barmeni', drive: 'chordArcade', area: '.pixi-stage' },
  { id: 'arpeggio', name: 'Arpej', title: 'Arpejler', drive: 'melody', area: '.melody-wrap' },
  { id: 'surf', name: 'Arpej Sörfü', title: 'Arpej Sörfü', drive: 'beat', area: '.beat-field' },
].filter((c) => !process.env.LAYOUT_ONLY || process.env.LAYOUT_ONLY.split(',').includes(c.id))

/** Smallest white key the keyboard may draw (MIN_WHITE_KEY_PX in PianoKeyboard). */
const MIN_WHITE_KEY_PX = 28
/** Smallest height of the play area, as a share of the viewport height. */
const MIN_AREA_SHARE = 0.25

/**
 * Problems already known and reported to the owner: listed as "bilinen" (🟠) in the report but
 * they do not fail the run. Remove an entry when its fix lands, so the problem fails the run if
 * it comes back. `viewports` / `cases` limit an entry; `match` is tested against the error.
 */
const KNOWN = [
  {
    viewports: ['masaustu'],
    match: /Klavye ekranın altında kalıyor|Ders ekranı kaydırma istiyor/,
    note: 'masaüstünde porte ve klavye sabit yükseklikte, kısa pencereye sığmıyor (2026-10-08)',
  },
]

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {})

/**
 * Layout facts measured in the page: what sticks out sideways, what overlaps, whether the
 * play area and the keyboard are both on screen without scrolling, key sizes, clipped text.
 */
function measure({ area, play, minKey, minShare, keyboard = true }) {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const box = (el) => {
    const r = el.getBoundingClientRect()
    return {
      top: r.top + window.scrollY,
      bottom: r.bottom + window.scrollY,
      left: r.left,
      right: r.right,
      w: r.width,
      h: r.height,
    }
  }
  const visible = (el) => {
    const s = getComputedStyle(el)
    const r = el.getBoundingClientRect()
    return s.visibility !== 'hidden' && s.display !== 'none' && r.width > 0 && r.height > 0
  }
  const errors = []
  const warnings = []
  const facts = { vw, vh, pageHeight: document.documentElement.scrollHeight }

  if (document.documentElement.scrollWidth > vw + 1)
    errors.push(`Sayfa yana taşıyor: ${document.documentElement.scrollWidth} px genişlik, ekran ${vw} px`)

  // Elements sticking out of the screen sideways (inside a scroller is fine).
  const scrolls = (el) => {
    for (let p = el.parentElement; p; p = p.parentElement) {
      const o = getComputedStyle(p).overflowX
      if (o === 'auto' || o === 'scroll' || o === 'hidden' || o === 'clip') return true
    }
    return false
  }
  const outside = []
  for (const el of document.querySelectorAll('.app *')) {
    if (el.closest('.test-tools') || !visible(el)) continue
    const r = el.getBoundingClientRect()
    if ((r.right > vw + 1 || r.left < -1) && !scrolls(el)) outside.push(el)
  }
  // Report the outermost ones only.
  for (const el of outside.filter((e) => !outside.some((o) => o !== e && o.contains(e))).slice(0, 4)) {
    const r = el.getBoundingClientRect()
    errors.push(
      `Ekran dışına taşan öğe: .${[...el.classList].join('.') || el.tagName.toLowerCase()} (${Math.round(r.left)}…${Math.round(r.right)} px)`,
    )
  }

  // Text cut off by its own box.
  for (const el of document.querySelectorAll(
    '.app button, .app .prompt, .app .btn, .app h1, .app h2, .app h3, .app .node-title',
  )) {
    if (el.closest('.test-tools') || !visible(el)) continue
    const s = getComputedStyle(el)
    const clips = ['hidden', 'clip'].includes(s.overflowX) || s.textOverflow === 'ellipsis'
    if (clips && el.scrollWidth > el.clientWidth + 1)
      warnings.push(`Yazı kırpılıyor: "${el.textContent.trim().slice(0, 40)}"`)
  }

  // Start buttons (rhythm, memory, ear lessons) are on screen without scrolling.
  for (const el of document.querySelectorAll('.beat-start, .memory-start')) {
    if (!visible(el)) continue
    const r = el.getBoundingClientRect()
    if (r.bottom > vh + 1 || r.top < 0) errors.push(`Başla düğmesi ekranın dışında (${Math.round(r.top)} px)`)
  }

  if (!play) return { errors, warnings, facts }

  // The play screen: the play area and the keyboard are on screen together, without scrolling.
  const areaEl = [...document.querySelectorAll(area)].find(visible)
  const kb = document.querySelector('.keyboard-scroll')
  if (!areaEl) errors.push(`Oyun alanı (${area}) görünmüyor`)
  if (keyboard && (!kb || !visible(kb))) errors.push('Klavye görünmüyor')
  if (areaEl && kb && visible(kb)) {
    const a = box(areaEl)
    const k = box(kb)
    facts.area = { top: Math.round(a.top), height: Math.round(a.h), width: Math.round(a.w) }
    facts.keyboard = { top: Math.round(k.top), height: Math.round(k.h) }
    if (k.bottom > vh + 1)
      errors.push(`Klavye ekranın altında kalıyor: alt kenarı ${Math.round(k.bottom)} px, ekran ${vh} px`)
    if (a.top < -1) errors.push('Oyun alanının üstü ekranın dışında')
    if (a.bottom > k.top + 1) errors.push(`Oyun alanı klavyenin üstüne biniyor (${Math.round(a.bottom - k.top)} px)`)
    if (a.h < vh * minShare)
      warnings.push(`Oyun alanı küçük: ${Math.round(a.h)} px, ekran yüksekliğinin %${Math.round((a.h / vh) * 100)}'i`)
    if (k.h < 80) warnings.push(`Klavye alçak: ${Math.round(k.h)} px`)
  }
  if (facts.pageHeight > vh + 1)
    errors.push(`Ders ekranı kaydırma istiyor: sayfa ${facts.pageHeight} px, ekran ${vh} px`)

  // Header, prompt, play area and keyboard must not cover one another. The header and the
  // prompt are compared by what they show (their children): sideways they share one line.
  const contentRects = (sel, el) =>
    sel === '.game-top' || sel === '.prompt-row'
      ? [...el.children].filter(visible).map((c) => c.getBoundingClientRect())
      : [el.getBoundingClientRect()]
  const blocks = ['.game-top', '.prompt-row', area, '.beat-ready', '.keyboard-scroll']
    .map((sel) => [sel, [...document.querySelectorAll(sel)].find(visible)])
    .filter(([, el]) => el)
  for (let i = 0; i < blocks.length; i++)
    for (let j = i + 1; j < blocks.length; j++) {
      const [sa, ea] = blocks[i]
      const [sb, eb] = blocks[j]
      if (ea.contains(eb) || eb.contains(ea)) continue
      for (const p of contentRects(sa, ea))
        for (const q of contentRects(sb, eb)) {
          const w = Math.min(p.right, q.right) - Math.max(p.left, q.left)
          const h = Math.min(p.bottom, q.bottom) - Math.max(p.top, q.top)
          if (w > 2 && h > 2) errors.push(`${sa} ile ${sb} üst üste biniyor (${Math.round(w)}×${Math.round(h)} px)`)
        }
    }

  // Keys: wide enough, and the keys of the current prompt are in the visible part of the scroller.
  if (kb && visible(kb)) {
    const whites = [...kb.querySelectorAll('.key.white')]
    const narrow = Math.min(...whites.map((k) => k.getBoundingClientRect().width))
    facts.whiteKey = Math.round(narrow * 10) / 10
    facts.keys = whites.length
    facts.keyboardScrolls = kb.scrollWidth > kb.clientWidth + 1
    if (narrow < minKey - 0.5) errors.push(`Beyaz tuş çok dar: ${facts.whiteKey} px (en az ${minKey})`)
    const view = kb.getBoundingClientRect()
    const wanted = (
      document.querySelector('[data-pending]')?.getAttribute('data-pending') ??
      document.querySelector('.staff-wrap[data-note]')?.getAttribute('data-note') ??
      document.querySelector('.intro[data-intro]')?.getAttribute('data-intro') ??
      ''
    )
      .split(' ')
      .filter(Boolean)
    const keys = wanted.map((midi) => [midi, kb.querySelector(`.key[data-midi="${midi}"]`)])
    for (const [midi, key] of keys) if (!key) errors.push(`İstenen tuş klavyede yok: ${midi}`)
    const rects = keys.filter(([, k]) => k).map(([midi, k]) => [midi, k.getBoundingClientRect()])
    const hidden = rects.filter(([, r]) => r.left < view.left - 1 || r.right > view.right + 1).map(([m]) => m)
    if (hidden.length) {
      // Keys further apart than the visible part (two hands two octaves apart) cannot all show.
      const span = Math.max(...rects.map(([, r]) => r.right)) - Math.min(...rects.map(([, r]) => r.left))
      if (span > view.width + 1)
        warnings.push(
          `İstenen tuşlar (${wanted.join(' ')}) birlikte görünmüyor: ${Math.round(span)} px aralık, klavye ${Math.round(view.width)} px; kaydırmak gerekiyor`,
        )
      else errors.push(`İstenen tuş (${hidden.join(' ')}) klavyenin görünen kısmının dışında`)
    }
  }

  // A Pixi canvas fills its stage (it follows resizes).
  const canvas = areaEl?.querySelector('canvas')
  if (canvas) {
    const c = canvas.getBoundingClientRect()
    // The stage's inner size (without its border).
    const stage = canvas.parentElement
    const s = { width: stage.clientWidth, height: stage.clientHeight }
    if (Math.abs(c.width - s.width) > 2 || Math.abs(c.height - s.height) > 2)
      errors.push(
        `Oyun tuvali alanını doldurmuyor: ${Math.round(c.width)}×${Math.round(c.height)}, alan ${s.width}×${s.height}`,
      )
  }
  return { errors, warnings, facts }
}

/** Press keys from the page `gapMs` apart (two hands at once need separate pointers). */
async function press(page, keys, gapMs = 20, holdMs = 120) {
  await page.evaluate(
    ({ keys, gap, hold }) =>
      keys.forEach((midi, k) =>
        window.setTimeout(() => {
          const el = document.querySelector(`.key[data-midi="${midi}"]`)
          if (!el) return
          el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 60 + k, isPrimary: k === 0 }))
          window.setTimeout(
            () => el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 60 + k })),
            hold,
          )
        }, k * gap),
      ),
    { keys, gap: gapMs, hold: holdMs },
  )
  await page.waitForTimeout(keys.length * gapMs + holdMs + 80)
}

/**
 * Play a little of the lesson the way a learner would, then leave it at a moment worth a
 * screenshot. Returns extra findings (like invaders whose card is cut off at the top).
 */
const DRIVERS = {
  async theory(page, shot) {
    await page.waitForSelector('.theory-card')
    await page.waitForTimeout(300)
    const checks = [await shot('kart')]
    for (let i = 0; i < 20 && (await page.$('.theory-card')); i++) await page.click('.theory-next')
    await page.waitForSelector('.theory-quiz')
    await page.waitForTimeout(300)
    checks.push(await shot('quiz', '.theory-quiz'))
    return checks
  },
  async drill(page, shot) {
    await page.waitForSelector('.staff svg')
    for (let i = 0; i < 3; i++) {
      const intro = await page.getAttribute('.intro', 'data-intro', { timeout: 200 }).catch(() => null)
      const target = intro ?? (await page.getAttribute('.staff-wrap', 'data-note'))
      await page.click(`.key[data-midi="${target}"]`)
      await page.waitForTimeout(intro ? 800 : 550)
    }
    return [await shot()]
  },
  async melody(page, shot) {
    await page.waitForSelector('.melody-wrap .staff svg')
    for (let i = 0; i < 5; i++) {
      const pending = await page.getAttribute('.melody-wrap', 'data-pending')
      if (pending) await press(page, pending.split(' ').map(Number), 25)
      await page.waitForTimeout(200)
    }
    return [await shot()]
  },
  async chord(page, shot) {
    await page.waitForSelector('.chord-wrap .staff svg')
    for (let i = 0; i < 2; i++) {
      const pending = await page.getAttribute('.chord-wrap', 'data-pending')
      if (pending) await press(page, pending.split(' ').map(Number))
      await page.waitForTimeout(250)
    }
    return [await shot()]
  },
  async ear(page, shot) {
    const checks = [await shot('hazir', '.card, .ear-board')]
    await page.getByRole('button', { name: /Dinlemeye başla/ }).click()
    await page.waitForSelector('.ear-board[data-pending]:not([data-pending=""])')
    await press(page, (await page.getAttribute('.ear-board', 'data-pending')).split(' ').map(Number))
    await page.waitForTimeout(400)
    checks.push(await shot())
    return checks
  },
  async memory(page, shot) {
    const checks = [await shot('hazir')]
    await page.click('.memory-start')
    await page.waitForFunction(() => window.__dpoMemory?.phase === 'play', null, { timeout: 15000 })
    for (let i = 0; i < 3; i++) {
      const expected = await page.evaluate(() => window.__dpoMemory?.expected)
      if (expected == null) break
      await page.click(`.key[data-midi="${expected}"]`)
      await page.waitForTimeout(150)
    }
    await page.waitForTimeout(500)
    checks.push(await shot())
    return checks
  },
  async arcade(page, shot) {
    await page.waitForSelector('.pixi-stage canvas')
    const until = Date.now() + 6000
    while (Date.now() < until) {
      const target = await page.evaluate(() => {
        const g = window.__dpoArcade
        if (!g) return null
        if ('customers' in g) {
          const next = g.waiting.sort((a, b) => b.x - a.x)[0]
          return next && next.x > 0.3 ? next.record.target : null
        }
        if ('pipes' in g) return g.current?.record.answeredAt === null ? g.current.record.target : null
        const up = g.flying.sort((a, b) => a.y - b.y)[0]
        return up && up.y < 0.4 ? up.record.target : null
      })
      if (target !== null) await page.click(`.key[data-midi="${target}"]`)
      await page.waitForTimeout(150)
    }
    return [await shot()]
  },
  async chordArcade(page, shot) {
    await page.waitForSelector('.pixi-stage canvas')
    const extra = []
    // Uzay Savunması: how long each invader's card is cut off by the top edge after it appears.
    const space = await page.evaluate(() => 'invaders' in (window.__dpoChordArcade ?? {}))
    if (space) extra.push(await spaceEntry(page))
    const until = Date.now() + 7000
    while (Date.now() < until) {
      const notes = await page.evaluate(() => {
        const g = window.__dpoChordArcade
        if (!g) return null
        const t =
          'invaders' in g
            ? g.urgent && g.urgent.y > 0.15
              ? g.urgent
              : null
            : 'customers' in g
              ? g.urgent && g.urgent.x > 0.15
                ? g.urgent
                : null
              : g.cooking
        return t ? t.record.chord.notes.map((n) => n.midi) : null
      })
      if (notes) await press(page, notes)
      await page.waitForTimeout(200)
    }
    return [await shot(), ...extra]
  },
  async beat(page, shot) {
    await page.waitForSelector('.beat-start')
    const checks = [await shot('hazir')]
    await page.click('.beat-start')
    await page.waitForFunction(() => window.__dpoBeat)
    const lengthMs = await page.evaluate(() => {
      const t = window.__dpoBeat
      // Kept so the presses still due are cancelled when the lesson ends early.
      window.__layoutTimers = []
      for (const r of t.records) {
        if (r.rest) continue
        const timer = window.setTimeout(() => {
          const el = document.querySelector(`.key[data-midi="${r.target}"]`)
          if (!el) return
          const pointerId = 100 + r.target
          el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId, isPrimary: true }))
          window.setTimeout(() => el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId })), 40)
        }, r.dueAt - performance.now())
        window.__layoutTimers.push(timer)
      }
      return t.endAt - performance.now()
    })
    await page.waitForTimeout(Math.min(lengthMs * 0.35, 9000))
    checks.push(await shot())
    await page.evaluate(() => window.__layoutTimers.forEach((t) => window.clearTimeout(t)))
    return checks
  },
}

/**
 * Uzay Savunması: follow the first invader from the moment it appears and measure, with the
 * scene's own geometry (scene.ts: unit, card at y + 0.28 unit, name 0.52 unit above), how
 * long the card and the name stay cut off by the top of the stage.
 */
async function spaceEntry(page) {
  const samples = await page.evaluate(async () => {
    const g = window.__dpoChordArcade
    const stage = document.querySelector('.pixi-stage').getBoundingClientRect()
    const unit = Math.min((stage.width / 3) * 0.42, stage.height * 0.14)
    const seen = []
    const start = performance.now()
    while (performance.now() - start < 6000) {
      const inv = g.invaders.find((i) => i.index === 0)
      if (inv && inv.state === 'flying')
        seen.push({
          t: performance.now(),
          card: inv.y * stage.height + unit * 0.28,
          name: inv.y * stage.height - unit * 0.9,
        })
      if (seen.length && (!inv || inv.state !== 'flying' || seen.at(-1).name >= 0)) break
      await new Promise((r) => setTimeout(r, 50))
    }
    return seen
  })
  if (!samples.length) return { name: 'giriş', errors: [], warnings: ['Uzay Savunması: ilk istilacı görülemedi'] }
  const first = samples[0].t
  const cardIn = samples.find((s) => s.card >= 0)
  const nameIn = samples.find((s) => s.name >= 0)
  const cardS = cardIn ? (cardIn.t - first) / 1000 : null
  const nameS = nameIn ? (nameIn.t - first) / 1000 : null
  const warnings = []
  if (cardS === null || cardS > 0.3)
    warnings.push(
      `Uzay Savunması: akor kartı ekrana girerken üstte kırpılıyor; tamamı ${cardS === null ? '6 sn içinde' : `${cardS.toFixed(1)} sn sonra`} görünüyor (akor adı ${nameS === null ? '6 sn’den sonra' : `${nameS.toFixed(1)} sn sonra`})`,
    )
  return {
    name: 'giriş',
    errors: [],
    warnings,
    facts: { spaceCardVisibleAfterS: cardS, spaceNameVisibleAfterS: nameS },
  }
}

/** Run every case in one viewport, in its own browser context. */
async function runViewport(vp) {
  const context = await browser.newContext({
    viewport: vp.viewport,
    isMobile: !!vp.mobile,
    hasTouch: !!vp.mobile,
    deviceScaleFactor: 1,
  })
  const page = await context.newPage()
  page.setDefaultTimeout(10000)
  const pageErrors = []
  page.on('pageerror', (e) => pageErrors.push(e.message))
  // Piano samples and speech voices cannot load without network; ignore those.
  page.on(
    'console',
    (m) =>
      m.type() === 'error' &&
      !/ERR_FAILED|ERR_TUNNEL|ERR_INTERNET|ERR_NAME/.test(m.text()) &&
      pageErrors.push(m.text()),
  )
  const results = []
  const check = async (name, opts) => {
    const r = await page.evaluate(measure, { minKey: MIN_WHITE_KEY_PX, minShare: MIN_AREA_SHARE, ...opts })
    return { name, ...r }
  }
  const snap = (file, fullPage = false) => page.screenshot({ path: `${out}/${vp.id}-${file}.png`, fullPage })

  await page.goto(url)
  await page.waitForTimeout(800)
  // Test mode opens every lesson and gives "Dersi bitir".
  await page.locator('.settings summary').click()
  await page.getByText('Test modu:').click()
  await page.locator('.settings summary').click()
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(300)
  await snap('harita')
  results.push({ id: 'harita', name: 'Ders haritası', checks: [await check('harita', { play: false })] })

  for (const c of CASES) {
    const before = pageErrors.length
    const entry = { id: c.id, name: c.name, title: c.title, checks: [] }
    results.push(entry)
    try {
      await page.getByRole('button', { name: c.title, exact: true }).click()
      await page.waitForTimeout(400)
      const shot = async (suffix = '', area = c.area) => {
        const file = `${c.id}${suffix ? `-${suffix}` : ''}`
        await snap(file)
        // Before the lesson starts (ready cards) only the page itself is checked.
        const play = suffix !== 'hazir'
        // Theory cards have no keyboard; the quiz has one only for "press the key" questions.
        const keyboard = c.drive !== 'theory'
        const minShare = c.minShare ?? MIN_AREA_SHARE
        return { ...(await check(file, { area, play, keyboard, minShare })), shot: `${vp.id}-${file}.png` }
      }
      entry.checks.push(...(await DRIVERS[c.drive](page, shot)))
      await page.getByLabel('Dersi bitir').click()
      await page.waitForSelector('.results')
      await page.waitForTimeout(900)
      await snap(`${c.id}-sonuc`, true)
      entry.checks.push({ ...(await check(`${c.id}-sonuc`, { play: false })), shot: `${vp.id}-${c.id}-sonuc.png` })
      await page.getByText('Derslere dön').click()
      await page.waitForTimeout(400)
    } catch (e) {
      entry.checks.push({ name: 'çalıştırma', errors: [`Ders oynanamadı: ${e.message.split('\n')[0]}`], warnings: [] })
      await snap(`${c.id}-hata`)
      // Back to the map for the next case.
      await page.goto(url)
      await page.waitForTimeout(800)
    }
    if (pageErrors.length > before)
      entry.checks.push({
        name: 'konsol',
        errors: pageErrors.slice(before).map((e) => `Sayfa hatası: ${e}`),
        warnings: [],
      })
  }

  await page.getByLabel('Profil').click()
  await page.waitForTimeout(500)
  await snap('profil', true)
  results.push({ id: 'profil', name: 'Profil', checks: [await check('profil', { play: false })] })
  await context.close()
  return { viewport: vp, results }
}

const runs = await Promise.all(VIEWPORTS.map(runViewport))
await browser.close()

// Known problems become "bilinen" entries: reported, but they do not fail the run.
for (const run of runs)
  for (const r of run.results)
    for (const c of r.checks) {
      c.known = []
      c.errors = c.errors.filter((e) => {
        const k = KNOWN.find(
          (k) =>
            (!k.viewports || k.viewports.includes(run.viewport.id)) &&
            (!k.cases || k.cases.includes(r.id)) &&
            k.match.test(e),
        )
        if (k) c.known.push(`${e} (bilinen: ${k.note})`)
        return !k
      })
    }

// Report: one row per game, one column per viewport.
const count = (r, key) => r.checks.reduce((n, c) => n + c[key].length, 0)
const ids = runs[0].results.map((r) => r.id)
const lines = [
  '# Görünüm testi raporu',
  '',
  '✅ sorun yok · ⚠️ uyarı (bakılmalı, testi düşürmez) · 🟠 bilinen sorun (raporlandı, testi düşürmez) · ❌ hata',
  '',
  `Uygulama: ${url} · ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC`,
  '',
  `| Ekran | ${runs.map((r) => r.viewport.name).join(' | ')} |`,
  `| --- | ${runs.map(() => '---').join(' | ')} |`,
]
for (const id of ids) {
  const cells = runs.map((run) => {
    const r = run.results.find((x) => x.id === id)
    const e = count(r, 'errors')
    const k = count(r, 'known')
    const w = count(r, 'warnings')
    return e ? `❌ ${e} hata` : k ? `🟠 ${k} bilinen` : w ? `⚠️ ${w} uyarı` : '✅'
  })
  lines.push(`| ${runs[0].results.find((x) => x.id === id).name} | ${cells.join(' | ')} |`)
}
lines.push('', '## Ayrıntılar', '')
for (const run of runs) {
  const bad = run.results.filter((r) => count(r, 'errors') + count(r, 'known') + count(r, 'warnings'))
  if (!bad.length) continue
  lines.push(`### ${run.viewport.name}`, '')
  for (const r of bad)
    for (const c of r.checks)
      for (const [mark, list] of [
        ['❌', c.errors],
        ['🟠', c.known],
        ['⚠️', c.warnings],
      ])
        for (const msg of list)
          lines.push(`- ${mark} **${r.name}** (${c.name}${c.shot ? `, \`${c.shot}\`` : ''}): ${msg}`)
  lines.push('')
}
writeFileSync(`${out}/rapor.md`, lines.join('\n'))
writeFileSync(`${out}/rapor.json`, JSON.stringify(runs, null, 2))

const errors = runs.flatMap((run) =>
  run.results.flatMap((r) => r.checks.flatMap((c) => c.errors.map((e) => `${run.viewport.id} ${r.id}: ${e}`))),
)
console.log(lines.join('\n'))
if (errors.length) {
  console.error(`\nLayout suite failed with ${errors.length} errors.`)
  process.exit(1)
}
console.log(`\nLayout suite passed. Screenshots and report in ${out}/`)
