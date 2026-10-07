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
page.setDefaultTimeout(10000)
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
// Piano samples cannot load without network; ignore those.
page.on('console', (m) => m.type() === 'error' && !m.text().includes('ERR_FAILED') && errors.push(m.text()))

/** Play a lesson to the end. `wrongFirst` presses keys from the top until the right one. */
async function play(lessonTitle, { wrongFirst = false, shotAfter = 0, shotName = '' } = {}) {
  await page.getByRole('button', { name: lessonTitle, exact: true }).click()
  await page.waitForSelector('.staff svg')
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

await page.getByLabel('Profil').click()
await page.waitForTimeout(500)
await page.screenshot({ path: `${out}/profile.png`, fullPage: true })

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
