// Imports a piece from the Mutopia Project (www.mutopiaproject.org) into the
// app's score format (src/games/etudes/data/<id>.ts). Only pieces whose
// LilyPond header and catalogue entry say "Public Domain" are accepted.
// LilyPond itself reads the source (scripts/etudes/listener.ly dumps every
// note with its spelling, finger, slur and tie, repeats unfolded), so no note
// is typed by hand. The result is checked bar by bar and against Mutopia's
// own MIDI file before it is written.
//
//   LILYPOND=/path/to/lilypond node scripts/etudes/import.mjs <id> <mutopia ftp dir> [<id> <dir> ...]
//   e.g. node scripts/etudes/import.mjs bach-anh114 BachJS/BWVAnh114/anna-magdalena-04
//
// Needs LilyPond 2.24 (https://lilypond.org, or LILYPOND pointing at the
// binary of the release tarball) and network access to www.mutopiaproject.org.
// Downloads go to a temporary folder that is removed afterwards.

import { execFileSync } from 'node:child_process'
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../..')
const OUT_DIR = join(ROOT, 'src/games/etudes/data')
const MUTOPIA = 'https://www.mutopiaproject.org/ftp/'
const LILYPOND = process.env.LILYPOND || 'lilypond'

// ---- Fractions of a whole note -------------------------------------------

const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a))
class Frac {
  constructor(n, d = 1) {
    if (d < 0) [n, d] = [-n, -d]
    const g = gcd(n, d) || 1
    this.n = n / g
    this.d = d / g
  }
  static parse(s) {
    const [n, d] = s.split('/').map(Number)
    return new Frac(n, d ?? 1)
  }
  add(o) {
    return new Frac(this.n * o.d + o.n * this.d, this.d * o.d)
  }
  sub(o) {
    return new Frac(this.n * o.d - o.n * this.d, this.d * o.d)
  }
  mul(o) {
    return new Frac(this.n * o.n, this.d * o.d)
  }
  cmp(o) {
    return this.n * o.d - o.n * this.d
  }
  eq(o) {
    return this.cmp(o) === 0
  }
  get zero() {
    return this.n === 0
  }
  get value() {
    return this.n / this.d
  }
  toString() {
    return `${this.n}/${this.d}`
  }
}
const ZERO = new Frac(0)

// ---- Download --------------------------------------------------------------

async function fetchOk(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`)
  return res
}

/** Every file of a Mutopia folder (the .ly sources unzipped), into `dest`. */
async function download(dir, dest) {
  const index = await (await fetchOk(MUTOPIA + dir + '/')).text()
  const files = [...index.matchAll(/href="([^"?/]+\.(?:ly|ily|zip|mid|rdf))"/g)].map((m) => m[1])
  if (!files.length) throw new Error(`${dir}: no files`)
  for (const f of files) {
    if (f.endsWith('.zip') && !f.endsWith('-lys.zip')) continue
    if (f.endsWith('.mid') && files.some((x) => x.endsWith('-mids.zip'))) continue
    const buf = Buffer.from(await (await fetchOk(MUTOPIA + dir + '/' + f)).arrayBuffer())
    writeFileSync(join(dest, f), buf)
    if (f.endsWith('.zip')) {
      execFileSync('unzip', ['-qo', f], { cwd: dest })
      rmSync(join(dest, f))
    }
  }
}

function walk(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f)
    return statSync(p).isDirectory() ? walk(p) : [p]
  })
}

// ---- Licence ---------------------------------------------------------------

const headerField = (text, key) => text.match(new RegExp(`\\b${key}\\s*=\\s*"([^"]*)"`))?.[1] ?? null

/** Header facts of the main file; throws unless it is Public Domain. */
function checkLicence(main, files) {
  const text = readFileSync(main, 'utf8')
  const licence = headerField(text, 'license') ?? headerField(text, 'copyright')
  if (!licence || !/^public domain$/i.test(licence.trim()))
    throw new Error(`${basename(main)}: licence is "${licence ?? 'not given'}", only Public Domain is imported`)
  const rdf = files.find((f) => f.endsWith('.rdf'))
  if (rdf) {
    const r = readFileSync(rdf, 'utf8')
    const l = r.match(/<mp:licence>([^<]*)<\/mp:licence>/)?.[1]
    if (l && !/public domain/i.test(l)) throw new Error(`${basename(rdf)}: catalogue licence is "${l}"`)
  }
  const field = (k) => headerField(text, k)
  return {
    title: field('title') ?? field('mutopiatitle'),
    composer: field('mutopiacomposer') ?? field('composer'),
    opus: field('mutopiaopus') ?? field('opus'),
    source: field('source'),
    typesetter: field('maintainer') ?? field('enteredby'),
    licence: 'Public Domain',
  }
}

// ---- LilyPond --------------------------------------------------------------

/** Puts `\unfoldRepeats` in front of the music of every `\score` (after its own `\header`). */
function unfoldScores(text) {
  let out = ''
  let i = 0
  for (;;) {
    const m = /\\score\s*\{/g
    m.lastIndex = i
    const hit = m.exec(text)
    if (!hit) return out + text.slice(i)
    let at = hit.index + hit[0].length
    const header = /^\s*\\header\s*\{/.exec(text.slice(at))
    if (header) {
      let depth = 1
      at += header[0].length
      for (; depth && at < text.length; at++) depth += text[at] === '{' ? 1 : text[at] === '}' ? -1 : 0
    }
    out += text.slice(i, at) + ' \\unfoldRepeats '
    i = at
  }
}

/** Runs LilyPond on `main` with the listener; returns the event lines. */
function lilypondEvents(main, work) {
  const wrap = join(work, 'dpo-wrap.ly')
  writeFileSync(wrap, `\\include "${join(HERE, 'listener.ly')}"\n\\include "${main}"\n`)
  try {
    execFileSync(LILYPOND, ['-I', dirname(main), '-dno-print-pages', '-o', join(work, 'dpo'), wrap], {
      cwd: dirname(main),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
  } catch (e) {
    throw new Error(`LilyPond failed on ${basename(main)}:\n${e.stderr ?? e.message}`)
  }
  return readFileSync(join(work, 'dpo.events'), 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const c = line.split('\t')
      return {
        staff: +c[0],
        voice: +c[1],
        mom: Frac.parse(c[2]),
        grace: Frac.parse(c[3]),
        pos: Frac.parse(c[5]),
        clef: c[6],
        time: c[7],
        type: c[8],
        f: c.slice(9),
      }
    })
}

// ---- MIDI (for the cross-check) ----------------------------------------------

/** Note-on (pitch, tick) pairs of a standard MIDI file. */
function midiNotes(buf) {
  const notes = []
  let p = 14
  const tracks = buf.readUInt16BE(10)
  for (let t = 0; t < tracks; t++) {
    if (buf.toString('latin1', p, p + 4) !== 'MTrk') break
    const end = p + 8 + buf.readUInt32BE(p + 4)
    p += 8
    let tick = 0
    let status = 0
    const varlen = () => {
      let v = 0
      for (;;) {
        const b = buf[p++]
        v = (v << 7) | (b & 0x7f)
        if (!(b & 0x80)) return v
      }
    }
    while (p < end) {
      tick += varlen()
      let b = buf[p]
      if (b & 0x80) {
        status = b
        p++
      }
      const type = status & 0xf0
      if (status === 0xff) {
        p++
        const skip = varlen()
        p += skip
      } else if (status === 0xf0 || status === 0xf7) {
        const skip = varlen()
        p += skip
      } else if (type === 0xc0 || type === 0xd0) {
        p += 1
      } else {
        const [a, v] = [buf[p], buf[p + 1]]
        p += 2
        if (type === 0x90 && v > 0) notes.push({ pitch: a, tick })
      }
    }
    p = end
  }
  return notes
}

// ---- Conversion ------------------------------------------------------------

const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B']
const LENGTH = { 0: 'w', 1: 'h', 2: 'q', 3: '8', 4: '16', 5: '32' }
const accText = (alt) => ({ '-1': 'bb', '-1/2': 'b', 0: '', '1/2': '#', 1: '##' })[alt]

/** Written length of `log` and `dots`, in wholes. */
const nominal = (log, dots) => new Frac(2 ** (dots + 1) - 1, 2 ** (log + dots))

/** Lengths that write `len` (a gap or a note split at a bar line), longest first. */
function splitLength(len) {
  const out = []
  let left = len
  const options = []
  for (let log = 0; log <= 5; log++) for (const dots of [1, 0]) options.push({ log, dots, len: nominal(log, dots) })
  while (!left.zero) {
    const o = options.find((x) => x.len.cmp(left) <= 0)
    if (!o) throw new Error(`cannot write a length of ${left}`)
    out.push(o)
    left = left.sub(o.len)
  }
  return out
}

const durText = ({ log, dots }) => LENGTH[log] + '.'.repeat(dots)

function keyOf(events) {
  const key = events.find((e) => e.type === 'key')
  if (!key) return { name: 'C', fifths: 0 }
  const [step, alt, alist] = key.f
  const pairs = alist.split(' ').map((s) => s.split(':'))
  const sharps = pairs.filter(([, a]) => a === '1/2').length
  const flats = pairs.filter(([, a]) => a === '-1/2').length
  const fifths = sharps - flats
  // Major when the tonic's own scale has this signature, else minor.
  const MAJOR = { C: 0, G: 1, D: 2, A: 3, E: 4, B: 5, 'F#': 6, 'C#': 7, F: -1, Bb: -2, Eb: -3, Ab: -4, Db: -5, Gb: -6 }
  const tonic = LETTERS[+step] + accText(alt)
  return { name: MAJOR[tonic] === fifths ? tonic : `${tonic}m`, fifths }
}

/** The chords and rests of one voice, by moment, with their loose post-events merged. */
function voiceEvents(lines) {
  const byMom = new Map()
  for (const l of lines) {
    const k = l.mom.toString()
    if (!byMom.has(k))
      byMom.set(k, { mom: l.mom, notes: [], rest: null, fingers: [], slur: [], tie: false, scripts: [], clef: l.clef })
    const e = byMom.get(k)
    if (l.type === 'note') {
      const [midi, oct, name, alt, log, dots, len, arts] = l.f
      const a = (arts ?? '').split(',').filter(Boolean)
      e.notes.push({
        midi: +midi,
        letter: LETTERS[+name],
        acc: accText(alt),
        octave: +oct + 4,
        log: +log,
        dots: +dots,
        len: Frac.parse(len),
        finger: a.find((x) => x.startsWith('finger:'))?.slice(7) ?? null,
        tie: a.includes('tie'),
        slur: a.filter((x) => x.startsWith('slur:')).map((x) => +x.slice(5)),
        scripts: a.filter((x) => x.startsWith('script:')).map((x) => x.slice(7)),
      })
      e.clef = l.clef
    } else if (l.type === 'rest' || l.type === 'skip' || l.type === 'mrest') {
      const [log, dots, len] = l.f
      e.rest = { log: +log, dots: +dots, len: Frac.parse(len), kind: l.type }
    } else if (l.type === 'finger') e.fingers.push(l.f[0])
    else if (l.type === 'slur') e.slur.push(+l.f[0])
    else if (l.type === 'tie') e.tie = true
    else if (l.type === 'script') e.scripts.push(l.f[0])
  }
  const out = []
  for (const e of [...byMom.values()].sort((a, b) => a.mom.cmp(b.mom))) {
    if (!e.notes.length && !e.rest) continue
    if (e.notes.length) {
      const len = e.notes[0].len
      if (e.notes.some((n) => !n.len.eq(len))) throw new Error(`notes of one chord with different lengths at ${e.mom}`)
      const n0 = e.notes[0]
      if (!nominal(n0.log, n0.dots).eq(len)) throw new Error(`tuplet at ${e.mom}: not supported yet`)
      if (e.fingers.length && e.notes.length === 1 && !n0.finger) n0.finger = e.fingers[0]
      if (e.tie) for (const n of e.notes) n.tie = true
      out.push({
        mom: e.mom,
        len,
        log: n0.log,
        dots: n0.dots,
        notes: e.notes.sort((a, b) => a.midi - b.midi),
        slurStart: e.slur.includes(-1) || e.notes.some((n) => n.slur.includes(-1)),
        slurEnd: e.slur.includes(1) || e.notes.some((n) => n.slur.includes(1)),
        staccato: [...e.scripts, ...e.notes.flatMap((n) => n.scripts)].includes('staccato'),
        scripts: [...e.scripts, ...e.notes.flatMap((n) => n.scripts)].filter((s) => s !== 'staccato'),
        clef: e.clef,
      })
    } else {
      const r = e.rest
      out.push({ mom: e.mom, len: r.len, log: r.log, dots: r.dots, notes: [], rest: r.kind, clef: e.clef })
    }
  }
  return out
}

const CLEF = { 'clefs.G': 'treble', 'clefs.F': 'bass' }

function noteText(n) {
  return `${n.letter}${n.acc}${n.octave}${n.finger ? ':' + n.finger : ''}${n.tie ? '~' : ''}`
}

/**
 * One staff's voices as lanes of bar tokens: lane 0 the upper voice, lane 1
 * the lower one where the staff splits; gaps are spacers (`s`).
 */
function staffLanes(voices, barStarts, end, what) {
  const bars = barStarts.length
  const barOf = (m) => {
    let b = 0
    while (b + 1 < bars && barStarts[b + 1].cmp(m) <= 0) b++
    return b
  }
  const barEnd = (b) => (b + 1 < bars ? barStarts[b + 1] : end)
  // Split events at bar lines (notes tied over, rests in two).
  const pieces = voices.map((events) =>
    events.flatMap((e) => {
      const out = []
      let at = e.mom
      let left = e.len
      while (!left.zero) {
        const b = barOf(at)
        const room = barEnd(b).sub(at)
        const take = left.cmp(room) <= 0 ? left : room
        const last = take.eq(left)
        const parts = take.eq(e.len) && e.mom.eq(at) ? [{ log: e.log, dots: e.dots, len: e.len }] : splitLength(take)
        parts.forEach((p, i) => {
          const final = last && i === parts.length - 1
          out.push({
            ...e,
            mom: at,
            len: p.len,
            log: p.log,
            dots: p.dots,
            bar: b,
            notes: e.notes.map((n) => ({ ...n, tie: final ? n.tie : true })),
            slurStart: e.slurStart && out.length === 0,
            slurEnd: e.slurEnd && final,
            staccato: e.staccato && out.length === 0,
            first: out.length === 0,
          })
          at = at.add(p.len)
        })
        left = left.sub(take)
      }
      return out
    }),
  )
  // Clef changes, written in the upper lane before the first event at or after them.
  const changes = []
  for (const e of pieces
    .flat()
    .filter((x) => x.notes.length && CLEF[x.clef])
    .sort((x, y) => x.mom.cmp(y.mom)))
    if (changes.at(-1)?.clef !== CLEF[e.clef]) changes.push({ mom: e.mom, clef: CLEF[e.clef] })
  let nextChange = 1
  const lanes = [[], []]
  for (let b = 0; b < bars; b++) {
    const inBar = pieces
      .map((evs) => evs.filter((e) => e.bar === b))
      .filter((evs) => evs.some((e) => e.notes.length || e.rest === 'rest' || e.rest === 'mrest'))
    // Higher voices first.
    const pitch = (evs) => {
      const ns = evs.flatMap((e) => e.notes.map((n) => n.midi))
      return ns.length ? ns.reduce((a, x) => a + x, 0) / ns.length : -1
    }
    inBar.sort((a, b2) => pitch(b2) - pitch(a))
    const laneEvents = [[], []]
    for (const evs of inBar) {
      const overlaps = (lane) =>
        lane.some((x) => evs.some((e) => e.mom.cmp(x.mom.add(x.len)) < 0 && x.mom.cmp(e.mom.add(e.len)) < 0))
      const free = laneEvents.findIndex((lane) => !overlaps(lane))
      if (free < 0) throw new Error(`${what}: more than two voices in bar ${b + 1}`)
      laneEvents[free].push(...evs.filter((e) => e.notes.length || e.rest !== 'skip'))
    }
    laneEvents.forEach((events, li) => {
      events.sort((x, y) => x.mom.cmp(y.mom))
      const tokens = []
      let at = barStarts[b]
      const gap = (to) => {
        if (to.cmp(at) > 0) for (const p of splitLength(to.sub(at))) tokens.push(`s/${durText(p)}`)
        at = to
      }
      for (const e of events) {
        if (e.mom.cmp(at) < 0) throw new Error(`${what}: overlapping notes in bar ${b + 1}`)
        gap(e.mom)
        while (li === 0 && nextChange < changes.length && changes[nextChange].mom.cmp(e.mom) <= 0)
          tokens.push(`@${changes[nextChange++].clef}`)
        const body = e.notes.length ? e.notes.map(noteText).join('+') : 'r'
        const fullBarRest = !e.notes.length && e.mom.eq(barStarts[b]) && e.len.eq(barEnd(b).sub(barStarts[b]))
        tokens.push(
          fullBarRest
            ? 'R'
            : `${body}/${durText(e)}${e.staccato ? '*' : ''}${e.slurStart ? '(' : ''}${e.slurEnd ? ')' : ''}`,
        )
        at = e.mom.add(e.len)
      }
      gap(barEnd(b))
      lanes[li].push(tokens.join(' '))
    })
  }
  if (lanes[1].every((bar) => /^(s\/\S+ ?)*$/.test(bar))) lanes.pop()
  return { lanes, clef: changes[0]?.clef ?? null }
}

function convert(lines, id) {
  const graces = lines.filter((l) => l.type === 'note' && !l.grace.zero).length
  const main = lines.filter((l) => l.grace.zero)
  const first = main.find((l) => l.type === 'note')
  const time = first.time
  if (main.some((l) => l.type === 'note' && l.time !== time)) throw new Error(`${id}: the time signature changes`)
  const keys = main.filter((l) => l.type === 'key')
  const key = keyOf(main)
  if (keys.some((k) => k.mom.cmp(ZERO) > 0 && keyOf([k]).fifths !== key.fifths))
    throw new Error(`${id}: the key changes`)
  const [num, den] = time.split('/').map(Number)
  const barLen = new Frac(num, den)
  const start = main.find((l) => l.mom.zero && (l.type === 'note' || l.type === 'rest'))
  // An upbeat (\partial): LilyPond starts the bar at a negative position (older versions: late in the bar).
  const pickup =
    !start || start.pos.zero ? ZERO : start.pos.n < 0 ? new Frac(-start.pos.n, start.pos.d) : barLen.sub(start.pos)
  const end = main
    .filter((l) => ['note', 'rest', 'skip', 'mrest'].includes(l.type))
    .reduce((m, l) => {
      const e = l.mom.add(Frac.parse(l.f[l.type === 'note' ? 6 : 2]))
      return e.cmp(m) > 0 ? e : m
    }, ZERO)
  const barStarts = [ZERO]
  for (let at = pickup.zero ? barLen : pickup; at.cmp(end) < 0; at = at.add(barLen)) barStarts.push(at)
  // Every note must sit where LilyPond put it in its bar (an upbeat in the middle of a piece would move the bar lines).
  for (const l of main.filter((x) => x.type === 'note')) {
    let b = 0
    while (b + 1 < barStarts.length && barStarts[b + 1].cmp(l.mom) <= 0) b++
    const pos = l.pos.n < 0 ? barLen.add(l.pos) : l.pos
    const mine = b === 0 && !pickup.zero ? barLen.sub(pickup).add(l.mom) : l.mom.sub(barStarts[b])
    if (!pos.eq(mine)) throw new Error(`${id}: the bar lines move at ${l.mom} (an upbeat inside the piece?)`)
  }
  const staffIds = [...new Set(main.filter((l) => l.staff >= 0).map((l) => l.staff))]
  if (staffIds.length !== 2) throw new Error(`${id}: ${staffIds.length} staves, a piano score has two`)
  const staves = staffIds.map((s, i) => {
    const mine = main.filter((l) => l.staff === s)
    const voiceIds = [...new Set(mine.map((l) => l.voice))]
    const voices = voiceIds.map((v) => voiceEvents(mine.filter((l) => l.voice === v)))
    const { lanes, clef } = staffLanes(voices, barStarts, end, `${id} staff ${i + 1}`)
    return { clef: clef ?? (i === 0 ? 'treble' : 'bass'), voices: lanes }
  })
  const tempo = main.find((l) => l.type === 'tempo')
  const bpm = tempo ? Math.round(+tempo.f[1] * (Frac.parse(tempo.f[0]).value / 0.25)) : null
  const notes = main.filter((l) => l.type === 'note')
  const ornaments = [
    ...new Set(
      notes.flatMap((l) =>
        (l.f[7] ?? '')
          .split(',')
          .filter((x) => x.startsWith('script:') && x !== 'script:staccato')
          .map((x) => x.slice(7)),
      ),
    ),
    ...new Set(main.filter((l) => l.type === 'script' && l.f[0] !== 'staccato').map((l) => l.f[0])),
  ]
  return {
    time: [num, den],
    key: key.name,
    pickup: pickup.value * 4,
    bars: barStarts.length,
    ...(bpm && { bpm }),
    staves,
    stats: {
      notes: notes.length,
      graces,
      ornaments: [...new Set(ornaments)],
      fingers: (
        staves
          .flatMap((x) => x.voices.flat())
          .join(' ')
          .match(/\d:\d/g) ?? []
      ).length,
    },
  }
}

/** Pitches of every note LilyPond read (grace notes too: the MIDI file plays them). */
function pitchesOf(lines) {
  const out = []
  // A note tied from the one before sounds as one MIDI note: leave it out.
  const tiedTo = new Set()
  const sounding = new Set()
  const tieAt = new Set(lines.filter((l) => l.type === 'tie').map((l) => `${l.staff}/${l.voice}/${l.mom}`))
  for (const l of lines) {
    if (l.type !== 'note') continue
    const [pitch, , , , , , len, arts] = l.f
    const end = l.mom.add(Frac.parse(len))
    const here = `${l.staff}/${l.voice}/${pitch}/${l.mom}`
    // Two voices of a staff on one key sound once.
    const unison = `${l.staff}/${pitch}/${l.mom}/${l.grace}`
    if (!tiedTo.has(here) && !sounding.has(unison)) out.push(+pitch)
    sounding.add(unison)
    if ((arts ?? '').split(',').includes('tie') || tieAt.has(`${l.staff}/${l.voice}/${l.mom}`))
      tiedTo.add(`${l.staff}/${l.voice}/${pitch}/${end}`)
  }
  return out
}

/**
 * Compares the notes with Mutopia's MIDI file, which plays the repeats
 * either once or twice: one of the two readings must match it note for note.
 */
function crossCheck(readings, files) {
  const mid = files.find((f) => f.endsWith('.mid'))
  if (!mid) throw new Error('no MIDI file to compare with')
  const theirs = midiNotes(readFileSync(mid)).map((n) => n.pitch)
  const key = (xs) => [...xs].sort((a, b) => a - b).join(',')
  if (readings.some((r) => key(r) === key(theirs))) return `MIDI agrees (${theirs.length} notes)`
  throw new Error(
    `the notes differ from ${basename(mid)}: ${readings.map((r) => r.length).join(' / ')} here, ${theirs.length} there`,
  )
}

function emit(id, dir, meta, score) {
  const { stats: _stats, ...rest } = score
  const body = {
    id,
    mutopia: dir,
    ...meta,
    ...rest,
  }
  const text =
    `// Generated by scripts/etudes/import.mjs from the Mutopia Project (${dir}).\n` +
    `// ${meta.licence}. Do not edit by hand: run the script again.\n\n` +
    `import type { ScoreSource } from '../score'\n\n` +
    `export const score: ScoreSource = ${JSON.stringify(body, null, 2)}\n`
  mkdirSync(OUT_DIR, { recursive: true })
  const file = join(OUT_DIR, `${id}.ts`)
  writeFileSync(file, text)
  execFileSync('npx', ['prettier', '--write', '--log-level', 'warn', file], { cwd: ROOT, stdio: 'inherit' })
}

async function importPiece(id, dir) {
  const work = mkdtempSync(join(tmpdir(), 'dpo-etude-'))
  try {
    await download(dir, work)
    const files = walk(work)
    const sources = files.filter((f) => f.endsWith('.ly'))
    const main = sources.find((f) => /\\score\b/.test(readFileSync(f, 'utf8'))) ?? sources[0]
    if (!main) throw new Error(`${dir}: no .ly file`)
    const meta = checkLicence(main, files)
    const folded = pitchesOf(lilypondEvents(main, work))
    for (const f of files.filter((x) => /\.i?ly$/.test(x))) writeFileSync(f, unfoldScores(readFileSync(f, 'utf8')))
    const lines = lilypondEvents(main, work)
    const check = crossCheck([folded, pitchesOf(lines)], files)
    const score = convert(lines, id)
    emit(id, dir, meta, score)
    const s = score.stats
    console.log(
      `${id}: ${score.bars} bars ${score.time.join('/')} ${score.key}, ${s.notes} notes, ${s.fingers} fingered` +
        `${s.graces ? `, ${s.graces} grace notes left out` : ''}` +
        `${s.ornaments.length ? `, ornaments not played: ${s.ornaments.join(' ')}` : ''}; ${check}`,
    )
  } finally {
    rmSync(work, { recursive: true, force: true })
  }
}

const args = process.argv.slice(2)
if (!args.length || args.length % 2) {
  console.error('usage: node scripts/etudes/import.mjs <id> <mutopia ftp dir> [<id> <dir> ...]')
  process.exit(1)
}
let failed = false
for (let i = 0; i < args.length; i += 2) {
  try {
    await importPiece(args[i], args[i + 1])
  } catch (e) {
    failed = true
    console.error(`${args[i]}: ${e.message}`)
  }
}
process.exit(failed ? 1 : 0)
