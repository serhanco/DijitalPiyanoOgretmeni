// Faz 17 checks in a real browser against the fake cloud (localStorage `dpo-cloud` = `fake`, see
// src/cloud/fakeBackend.ts): two devices with their own progress sign in to one account and end up with
// both; an e-mail code (wrong, then right); an invite link adds a friend; the league, the shared quest's
// chest, a cheer; a Salon duel against a friend's ghost; deleting the account.
// Usage: npm run build && npx vite preview --port 4173 & npm run cloud [-- <screenshot dir>]

import { mkdirSync } from 'node:fs'
import { chromium } from 'playwright'

const out = process.argv[2] ?? 'cloud-screens'
const url = process.env.APP_URL ?? 'http://localhost:4173/'
mkdirSync(out, { recursive: true })

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {})
const errors = []
const fail = (m) => errors.push(m)

async function device(name) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  await context.addInitScript(() => {
    localStorage.setItem('dpo-welcomed', '1')
    localStorage.setItem('dpo-intro', 'off')
    localStorage.setItem('dpo-intros', 'off')
    localStorage.setItem('dpo-cloud', 'fake')
  })
  const page = await context.newPage()
  page.setDefaultTimeout(10000)
  page.on('pageerror', (e) => fail(`${name}: ${e.message}`))
  page.on(
    'console',
    (m) =>
      m.type() === 'error' &&
      !/ERR_FAILED|ERR_TUNNEL|ERR_INTERNET|ERR_NAME/.test(m.text()) &&
      fail(`${name}: ${m.text()}`),
  )
  await page.goto(url)
  await page.waitForTimeout(600)
  return page
}

/** Put a profile and lessons into this device's database, as if they were played here, then reload. */
async function seed(page, lessons, sessions, xp) {
  // The page open before may still write its empty profile once: seed again until the reloaded app has it.
  for (let i = 0; i < 3; i++) {
    await write(page, lessons, sessions, xp)
    await page.reload()
    await page.waitForTimeout(600)
    if ((await profileOf(page))?.totalXp === xp) return
  }
  fail('seed: the progress could not be put on the device')
}

const write = (page, lessons, sessions, xp) =>
  page.evaluate(
    ([lessons, sessions, xp]) =>
      new Promise((resolve, reject) => {
        const open = indexedDB.open('dijital-piyano')
        open.onerror = () => reject(open.error)
        open.onsuccess = () => {
          const tx = open.result.transaction(['kv', 'sessions'], 'readwrite')
          const state = { totalXp: xp, lessonsCompleted: sessions.length, lessons }
          tx.objectStore('kv').put({ key: 'profile', value: JSON.stringify({ state, version: 0 }) })
          const store = tx.objectStore('sessions')
          store.clear()
          for (const s of sessions) store.add(s)
          tx.oncomplete = () => resolve()
          tx.onerror = () => reject(tx.error)
        }
      }),
    [lessons, sessions, xp],
  )

const profileOf = (page) =>
  page.evaluate(
    () =>
      new Promise((resolve) => {
        const open = indexedDB.open('dijital-piyano')
        open.onsuccess = () => {
          const get = open.result.transaction('kv').objectStore('kv').get('profile')
          get.onsuccess = () => resolve(JSON.parse(get.result?.value ?? 'null')?.state ?? null)
        }
      }),
  )

const session = (lessonId, at, xp) => ({
  lessonId,
  at,
  total: 10,
  firstTry: 9,
  accuracy: 0.9,
  avgReactionMs: 900,
  stars: 2,
  xp,
  failed: false,
})

const openSettings = (page) => page.getByLabel('Ayarlar', { exact: true }).click()
const closeSettings = (page) => page.getByLabel('Ayarları kapat').click()
const synced = (page) => page.waitForSelector('[data-account="in"][data-sync="ok"]')

// Device A: two lessons played here, then Google sign-in from the map's card.
const a = await device('A')
const day = Date.now() - 3600_000
await seed(a, { 'treble-1': { bestStars: 3, bestAccuracy: 0.95, plays: 1 } }, [session('treble-1', day, 20)], 20)
await a.waitForSelector('[data-node="account"]')
await a.screenshot({ path: `${out}/a-kart.png` })
await a.locator('[data-node="account"] .btn').click()
await a.locator('[data-signin="google"]').click()
await a.waitForSelector('[data-node="friends"]')
await openSettings(a)
await synced(a)
await a.screenshot({ path: `${out}/a-hesap.png` })
await closeSettings(a)
const cloud = await a.evaluate(() => localStorage.getItem('dpo-fake-cloud'))

// Device B: its own lesson, then the same account: both lessons, the XP of both.
const b = await device('B')
await seed(b, { 'treble-2': { bestStars: 2, bestAccuracy: 0.8, plays: 1 } }, [session('treble-2', day + 1000, 30)], 30)
await b.evaluate((c) => {
  const s = JSON.parse(c)
  s.session = null
  localStorage.setItem('dpo-fake-cloud', JSON.stringify(s))
}, cloud)
await b.reload()
await b.waitForTimeout(600)
await openSettings(b)
await b.locator('[data-signin="google"]').click()
await synced(b)
const merged = await profileOf(b)
if (!merged?.lessons?.['treble-1'] || !merged?.lessons?.['treble-2'])
  fail(`B: iki cihazın dersleri birleşmedi (${Object.keys(merged?.lessons ?? {}).join(', ')})`)
if (merged?.totalXp !== 50) fail(`B: XP iki cihazın toplamı olmalı (50), ${merged?.totalXp}`)
const live = await b.evaluate(() => document.querySelector('[data-account="in"] .account-sync')?.textContent)
if (!/bulutta/.test(live ?? '')) fail(`B: eşitleme durumu yazmıyor (${live})`)
await closeSettings(b)
// Back on A (the fake cloud lives in each browser: B's copy is carried over), the next sync brings B's lesson.
const cloudB = await b.evaluate(() => JSON.parse(localStorage.getItem('dpo-fake-cloud')))
await a.evaluate((c) => {
  const s = JSON.parse(localStorage.getItem('dpo-fake-cloud'))
  localStorage.setItem('dpo-fake-cloud', JSON.stringify({ ...c, session: s.session }))
}, cloudB)
await openSettings(a)
await a.locator('[data-sync-now]').click()
await synced(a)
let back = await profileOf(a)
for (let i = 0; i < 20 && !back?.lessons?.['treble-2']; i++) {
  await a.waitForTimeout(250)
  back = await profileOf(a)
}
if (!back?.lessons?.['treble-2'] || back.totalXp !== 50)
  fail(`A: B'nin dersi gelmedi (${Object.keys(back?.lessons ?? {}).join(', ')}, ${back?.totalXp} XP)`)
await closeSettings(a)

// An invite link adds Ayşe once signed in; the league, the shared quest's chest, a cheer.
const week = await b.evaluate(() => {
  const d = new Date()
  const u = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const wd = u.getUTCDay() || 7
  u.setUTCDate(u.getUTCDate() + 4 - wd)
  const w = Math.ceil(((u.getTime() - Date.UTC(u.getUTCFullYear(), 0, 1)) / 86400000 + 1) / 7)
  return `${u.getUTCFullYear()}-W${String(w).padStart(2, '0')}`
})
const me = await b.evaluate(() => window.__dpoFakeCloud.state().session.id)
const ghost = { by: 'second', points: Array.from({ length: 60 }, (_, i) => i * 2), score: 120 }
const code = await b.evaluate(
  ([week, me, ghost]) =>
    window.__dpoFakeCloud.addPlayer({
      id: 'ayse',
      name: 'Ayşe',
      week,
      weekXp: 80,
      weekLessons: 25,
      streak: 6,
      partner: me,
      records: { 'salon-bird-oktav': 120 },
      ghosts: { 'salon-bird-oktav': ghost },
    }),
  [week, me, ghost],
)
await b.goto(`${url}?arkadas=${code}`)
const toast = await b.waitForSelector('.toast').then((t) => t.textContent())
if (!/Ayşe artık arkadaşın/.test(toast ?? '')) fail(`B: davet bağlantısı arkadaş eklemedi (${toast})`)
if (/arkadas=/.test(b.url())) fail('B: davet kodu adres çubuğunda kaldı')
await b.locator('[data-node="friends"] .btn').click()
await b.waitForSelector('[data-league-row="ayse"][data-place="1"]')
await b.locator('[data-partner="ayse"]').click()
const chest = await b
  .waitForFunction(() => /ortak görev/.test(document.querySelector('.toast')?.textContent ?? ''))
  .then(() => b.locator('.toast').textContent())
  .catch(() =>
    b
      .locator('.toast')
      .textContent()
      .catch(() => 'yok'),
  )
if (!/ortak görevi bitirdiniz/.test(chest ?? '')) fail(`B: ortak görevin sandığı açılmadı (${chest})`)
const after = await profileOf(b)
if (after?.social?.pairWeek !== week || !after?.badges?.['team-player'] || !after?.badges?.['first-friend'])
  fail(`B: ortak görev ödülü ya da rozetler kaydedilmedi (${JSON.stringify(after?.social)})`)
await b.screenshot({ path: `${out}/b-arkadaslar.png`, fullPage: true })
await b.getByLabel('Ayşe: alkışla').first().click()
await b.waitForTimeout(400)
const cheered = await b.evaluate(() => window.__dpoFakeCloud.state().events.filter((e) => e.kind === 'cheer').length)
if (cheered !== 1) fail(`B: alkış gönderilmedi (${cheered})`)
await b.getByLabel('Haritaya dön').click()

// A Salon duel: Ayşe's ghost races in Nota Kuşu with the first skill.
await b.evaluate(() => {
  const s = JSON.parse(localStorage.getItem('dpo-settings') ?? '{"state":{},"version":0}')
  s.state.testMode = true
  localStorage.setItem('dpo-settings', JSON.stringify(s))
})
await b.reload()
await b.waitForSelector('[data-node="friends"]')
await b.locator('[data-node="salon"] .btn').click()
await b.locator('[data-game="bird"]').click()
const skill = await b.locator('.salon-skill.on').first().getAttribute('data-skill')
if (skill !== 'oktav') fail(`B: Nota Kuşu'nun ilk becerisi beklenen değil (${skill}); düello denenemedi`)
else {
  await b.locator('[data-duel="ayse"]').click()
  await b.waitForSelector('.ghost-chip[data-duel]')
  const chip = await b.locator('.ghost-chip').textContent()
  if (!/Ayşe/.test(chip ?? '')) fail(`B: düelloda hayalet Ayşe'nin değil (${chip})`)
  await b.screenshot({ path: `${out}/b-duello.png` })
  await b.getByLabel('Dersi bitir').click()
  await b.waitForSelector('.results [data-duel]')
  await b.screenshot({ path: `${out}/b-duello-sonuc.png`, fullPage: true })
}

// E-mail sign-in on A: a wrong code, then the right one (a new account), then delete it.
await openSettings(a)
await a.locator('[data-signout]').click()
await a.getByLabel('E-posta adresin').fill('ali@example.com')
await a.locator('[data-signin="email"]').click()
await a.getByLabel('E-postana gelen kod').fill('111111')
await a.locator('[data-signin="code"]').click()
await a.waitForSelector('.account-error')
await a.getByLabel('E-postana gelen kod').fill('123456')
await a.locator('[data-signin="code"]').click()
await synced(a)
await a.locator('.account-delete').first().click()
await a.locator('[data-delete-account]').click()
await a.waitForSelector('[data-account="out"]')
const left = await a.evaluate(() => Object.keys(window.__dpoFakeCloud.state().progress))
if (left.some((id) => id.includes('ali'))) fail('A: silinen hesabın ilerlemesi bulutta kaldı')
const kept = await profileOf(a)
if (!kept?.lessons?.['treble-1']) fail('A: hesap silinince cihazdaki ilerleme de gitti')
await a.screenshot({ path: `${out}/a-silindi.png` })

await browser.close()
if (errors.length) {
  console.error(errors.map((e) => `❌ ${e}`).join('\n'))
  process.exit(1)
}
console.log(`Cloud checks passed. Screenshots in ${out}/`)
