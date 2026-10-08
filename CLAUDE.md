# CLAUDE.md

Guidance for Claude Code (and any developer) working in this repository.

## What this is

**Dijital Piyano Öğretmeni**: a Duolingo-style piano teaching app. The learner connects a digital piano over Bluetooth
or USB MIDI and progresses through gamified lessons: treble clef → bass clef → both hands; note reading, rhythm and
timing, scales, chords, inversions, arpeggios. Many varied arcade mini-games (Flappy Bird-, Tapper-, Chrome Dino-style
and more) sit on top of a shared "skill provider" so every game works with every skill.

Owner: Serhan (GitHub `serhanco`). First goal: a prototype for the owner's own learning.

Read these before starting work:

- `docs/PLAN.md`: the phased roadmap (phases 0–13), the game × skill matrix and the status table.
- `docs/GECMIS.md`: the owner's requests in their own words, decisions made and their reasons, and what has been done.

## Working with the owner

- **Speak Turkish** with the owner. In-app text is Turkish (solfège names: Do Re Mi Fa Sol La Si). Code, identifiers and
  comments are English.
- The owner asked for **autopilot**: work phase by phase without waiting for approval of each step. One PR per phase.
  If the previous phase's PR is not merged yet, branch the next phase from it (stacked PRs) and say so in the PR.
- Every activity must end with a report telling the learner **which topic** they did well or poorly in and **by how
  much**.
- The owner loves cute characters and animation (Duolingo-like) and wants gamification to be **creative and varied**.
- Keep `docs/PLAN.md` (status table) and `docs/GECMIS.md` (done table) up to date when a phase lands.

## Commands

```bash
npm install
npm run dev           # Vite dev server (Web MIDI works on localhost)
npm test              # Vitest unit tests
npm run lint          # oxlint
npm run format:check  # Prettier (npm run format to fix)
npm run typecheck     # tsc -b
npm run build         # tsc -b && vite build → dist/
npm run smoke         # Playwright smoke test against a running preview (see below)
```

CI (`.github/workflows/ci.yml`) runs lint, format check, tests and build on every PR. `deploy.yml` publishes `dist/` to
GitHub Pages on every push to `main` (requires Settings → Pages → Source: "GitHub Actions"). Vite `base` is `./` so the
build works under the repo sub-path.

## Architecture

```
src/
  music/notes.ts          MIDI number helpers: solfège names, VexFlow keys, staff placement (line/space/outside)
  midi/midiMessage.ts     Raw MIDI bytes → note on/off (velocity 0 = off)
  midi/midiStore.ts       Zustand store around navigator.requestMIDIAccess; hot-plug via onstatechange
  input/inputBus.ts       Single pub/sub stream of NoteEvents from every source: 'midi' | 'screen' | 'computer'
  input/computerKeyboard  Physical-key (KeyboardEvent.code) piano mapping, Z/X octave shift
  audio/piano.ts          Lazy Tone.js Sampler with Salamander samples (cached by the service worker)
  audio/useSoundRouting   Plays sound per settings (MIDI input silent by default: the piano makes its own sound)
  components/             Staff (VexFlow, scaled via viewBox), PianoKeyboard (multi-touch, slide), MidiPanel
  games/noteHunter/       lessons.ts (+ bassLessons, handsLessons), session.ts (pure engine), summary.ts (pure report)
  games/melody/           (phase 6) MelodySession: melodies with one or two keys per step
  music/scales.ts         (phase 7) scale spelling, key signatures, fingerings, thumb crossings
  games/scales/           (phase 7) scale steps, Gam Merdiveni plan, scale reports, unit 5 lessons
  games/memory/           (phase 7) Melodi Hafızası engine (Simon with scale fragments)
  music/chords.ts         (phase 8) chord spelling, inversions, fingers, identifyChord, progressions, arpeggio runs
  games/chords/           (phase 8) ChordListener + ChordSession, chord report, arpeggio steps / Arpej Sörfü plan, unit 6
  screens/                Home, NoteHunter, Results (simple state machine in App.tsx, no router)
  state/settings.ts       Zustand + localStorage settings
  progress/               (phase 2) gamification rules, Dexie DB, history, curriculum
  state/profile.ts        (phase 2) XP/streak/badges store persisted to IndexedDB via a Dexie kv table
```

Principles:

- **Game logic is pure and unit tested** (no React, no timers, time passed in). UI subscribes to `inputBus` and feeds
  presses to the engine. Follow this for every new game.
- **All input goes through `inputBus`.** Never read MIDI directly in a game; that keeps the on-screen keyboard, computer
  keyboard and MIDI interchangeable (and makes Playwright testing possible by clicking `.key[data-midi]`).
- **Performance:** the game screen (VexFlow + Bravura font, ~700 kB) is lazy-loaded; Tone.js is dynamically imported.
  Keep the first screen light. Planned arcade games use PixiJS in their own lazy chunk.
- Reaction time counts only prompts answered right on the first try. Accuracy = first-try correct / prompts seen.

## Current state and next steps

| Branch | State                                                                                    |
| ------ | ---------------------------------------------------------------------------------------- |
| `main` | Phases 0–8, the polish round and phase 7 improvements (PRs #1–#11), live on GitHub Pages |
| PR #12 | Phase 8 extras: Akor Barmeni, chords by ear (unit 6 now 24 lessons)                      |

When a PR is merged, retarget the next one in the stack to `main`. Check live PR state with `gh pr list` before branching.

Phase 2 (done on `faz-2-oyunlastirma`):

- `src/progress/gamification.ts`: XP lines, levels, streak (`extendStreak`/`currentStreak`), badges
- `src/progress/db.ts`, `history.ts`: Dexie tables `sessions`, `noteStats`, `kv`; `recordSession`, `noteScores`
- `src/progress/curriculum.ts`: units (treble + "coming soon" units), unlock rule, `weakestNotes`, review lesson
- `src/state/profile.ts`: `completeLesson(outcome)` returns a `Reward` (XP breakdown, level up, streak, daily goal,
  new badges, previous best); persisted to IndexedDB
- Hearts in `NoteHunterSession`, `relaxedMode` setting, `summarize(records, clef, failed)`
- Screens: lesson map (`HomeScreen` + `TopBar`), rewards on `ResultsScreen`, `ProfileScreen`

Phase 3 (done on `faz-3-karakterler`):

- `src/components/Mascot.tsx`: Notiş, an SVG eighth-note character with moods
  `idle | happy | sad | cheer | sleep | think`, animated with Motion (`motion/react`); `pulse` replays a reaction
- `Greeting` on the map (context-aware line: first lesson, streak at risk, goal reached, night-time sleep)
- In lessons: mascot reacts to every answer, combo counter (celebration every 5 first-try answers in a row)
- `src/audio/sfx.ts`: synthesized WebAudio sound effects (correct, wrong, combo, fanfare, fail) and vibration, both
  toggleable in settings
- Results: mascot with the message, confetti (`canvas-confetti`), counting XP, level-up overlay

Phase 4 (done on `faz-4-mini-oyunlar`):

- `src/games/arcade/skill.ts`: `SkillProvider` (clef, range, planned targets, `matches`); `noteSkill()` for notes.
  New skills (bass notes, chords, scale steps) plug into every game through this.
- `src/games/arcade/staffGeometry.ts` (steps from the bottom line, ledger lines, `fitStaff` with a max gap) and
  `draw.ts` (Pixi staff lines and note heads)
- `src/games/arcade/bird/engine.ts` (**Nota Kuşu**) and `balloon/engine.ts` (**Balon Patlatma**): pure engines with
  `update(dtMs, now)` / `press(midi, now)` returning events, `records` in the same `PromptRecord` shape as the drill
  (plus `missed`), so `summarize` and `completeLesson` work unchanged. Unit tested by simulating frames.
- `scene.ts` per game: PixiJS drawing only; `PixiStage` mounts a Pixi `Application`; `ArcadeScreen` (own lazy chunk,
  ~90 kB gzip) wires input, HUD, mascot and sfx. The clef is an SVG `<text>` overlay in the Bravura font.
- Lessons have `kind: 'drill' | 'bird' | 'balloon'`; the treble unit now mixes drills and games (map icons ♪ 🐦 🎈).
- `window.__dpoArcade` exposes the running game so the smoke test can play it.

Phase 5 (done on `faz-5-ritim-5xfbrn`):

- `src/rhythm/`: `rhythm.ts` (values `h q e qr`, `parseRhythm`, `generateBars`: paired eighths, halves on strong beats,
  no leading or double rests), `timing.ts` (Mükemmel ±40 ms, İyi ±90 ms, Erken/Geç up to the note window, Kaçırıldı),
  `track.ts` (**`BeatTrack`**: the pure engine of every rhythm activity; `press(midi, time)` / `update(now)` return
  `hit | miss | wrong | rest-kept | stray` events; a note's window is min(220 ms, half the gap to its neighbours);
  presses during the count-in are ignored; a wrong key costs no heart, the miss that follows does; playing into a rest
  breaks it), `summary.ts` (`summarizeRhythm`: same `SessionSummary` plus `timing` with the distribution, mean signed
  offset, offsets, rests kept; topics are rhythm values; accuracy is weighted 1 / 0.85 / 0.4 / 0),
  `calibration.ts` (median-filtered mean tap offset, per input source), `lessons.ts` (unit 2, nine lessons)
- `SkillTarget` gained optional `beat` and `value`; `rhythmSkill()` (with `anyKey` for timing-only lessons)
- `src/audio/metronome.ts`: clicks on `Tone.Transport`, scheduled on the audio clock so they sound at the engine's
  `performance.now()` beat times (minus `outputLatency`). Games never depend on audio: the engine clock is
  `performance.now()`, the metronome is only sound.
- `settings.latency` (`{ midi, screen, computer }` ms) is subtracted from presses (`correctedTime`); `settings.metronome`
- `screens/beat/BeatFrame.tsx`: shared tempo picker, count-in, beat dots, input, judgement pop-ups, mascot, report.
  `RhythmScreen` (VexFlow one-line rhythm notation, playhead, coloured notes, two bars per page) and
  `BeatArcadeScreen` (**Dino Koşusu** `games/arcade/dino/`, **Ritim Davulcusu** `games/arcade/drum/`; engine.ts holds
  the pure geometry, scene.ts draws by reading the track ref every frame) only draw the playfield.
- `CalibrationScreen` (from the rhythm unit tip and Settings); results show a timing card (distribution, mean
  early/late, offset strip). Rhythm sessions skip the per-note statistics. New badge "Metronom Gibi".
- The first lesson of every unit is open (`isUnlocked` is per unit); `Unit.review` marks units with a weak-note node.
- `PixiStage` resizes with a `ResizeObserver`; `window.__dpoBeat` / `__dpoCalibration` expose state for the smoke test.

Polish round (after phase 5, `claude/cila-turu-rbkf3d`):

- Rhythm values `qd` (dotted quarter, always followed by its eighth) and `hd` (dotted half); 3/4 bars (`beatsPerBar: 3`,
  halves only on beat 1). Report topic "Noktalı notalar". Four new lessons: Üç Dörtlük, Dino Valsi, Noktalı Dörtlük,
  Davulcu: Noktalılar.
- `settings.tempo[lessonId]` remembers the tempo chosen in each rhythm lesson ("önerilen N" resets it).
- `LessonOutcome.rhythm` makes the XP line read "Vuruşunda çalınan notalar".
- Profile "Ritim gelişimi": `progress/rhythmTrend.ts` (on-beat share per session, later vs earlier half) and
  `components/RhythmChart.tsx`.
- `src/midi/keyboards.ts`: the owner's keyboards recognised by MIDI port name. `NoteEvent.device` carries the port name;
  a controller without sound (Akai) always gets the app piano; `settings.deviceLatency` stores a calibration per
  keyboard (wins over `latency.midi`); the MIDI panel shows a tip per keyboard and an octave hint for 25-key controllers.
- The smoke test fakes Web MIDI with an "MPK mini 3" input (`window.__fakeMidi([status, note, velocity])`).

Phase 6 (bass clef and two hands, `claude/faz-6-fa-anahtari-qh59m2`):

- Units 3 (`bassLessons.ts`, 10 lessons: drills, Nota Kuşu, Balon, left-hand melodies) and 4 (`handsLessons.ts`, 7
  lessons: grand staff drills, Nota Barmeni, melodies for both hands). Gamlar and Akorlar are "coming soon" units 5–6.
- `NoteLesson.grand` draws the grand staff; `bothStaves` lists notes around middle C written on either staff
  (`grandClefPicker`). `PromptRecord.clef` / `SkillTarget.clef` carry the staff of each prompt; `naturalClef` puts
  middle C and up on treble. The staff decides the hand (`handOf`: treble = right).
- `summarize` groups per (clef, midi): `NoteStat.clef`; `recordSession(row, perNote)` keys stats per staff, so middle C
  on bass is its own entry. With both staves it adds `hands` (accuracy, reaction per hand); melody lessons add `sync`.
- `games/melody/session.ts` (**`MelodySession`**): steps of one or two keys (`"C3+E4"`, `C4L` forces the bass staff);
  a two-key step waits for both hands; a wrong key is blamed on the hand that played it; `syncSummary` (together = within
  `TOGETHER_MS` 100 ms, mean gap, which hand leads). `MelodyScreen` + `components/MelodyStaff.tsx` (VexFlow quarter
  notes, one or two staves aligned by one Formatter, pages of 8 steps, a new page per melody). `window.__dpoMelody`.
- `games/arcade/bar/` (**Nota Barmeni**): four counters, upper two treble, lower two bass; customers walk to the
  bartender, play their note to slide a drink; a customer reaching the bar costs a heart, a wrong key does not. Played
  through `ArcadeScreen` (`kind: 'bar'`). The cards draw the clef with a Pixi `Text` in Bravura.
- `Staff` takes `grand` and `noteClef` (brace and connectors); the drill exposes `.staff-wrap[data-clef]`.
- Results: "Ellere göre" card with advice and the two-hand sync; weak notes say which staff. Home: a weak-notes node per
  clef unit; profile: a bass heat map. Badges: Fa Anahtarı Ustası, İki El Bir Arada, Usta Barmen.
- `setComputerKeyboardBase`: each lesson moves the computer keyboard's A key to its keyboard's lowest C.

Phase 7 (scales, `claude/faz-7-gamlar-c3g8bj`):

- `src/music/scales.ts`: `scaleOctave` spells a scale letter by letter (`SpelledNote` = midi + letter + accidental, so
  B♭ is never A#); major, natural, harmonic and melodic minor (descending = natural). `keySignature` ("Bb", "Am"),
  `keyAccidentals`, `spelledName` ("Si♭4"), `vexSpelled`. `scaleFingering` (C pattern, F and B♭ exceptions),
  `crossingBetween` (a crossing is when the finger numbers stop following the pitch: to finger 1 = thumb under, else
  finger over), `scaleRun` (15 notes up and back; `downFirst` for the left hand in contrary motion).
- `src/games/scales/steps.ts`: `ScalePart { tonic, type, hands: right | left | parallel | contrary }`; `scaleSteps`
  turns parts into `MelodySession` steps (each `StepNote` carries `spelled`, `finger`, `cross`; each `Step` the key
  signature). Start octaves keep each hand on its staff; contrary motion starts both thumbs on the tonic nearest middle
  C. `scaleReport` (topics per scale part, "Parmak geçişleri", "Eşit tempo" = 1 − coefficient of variation of the
  time between clean steps, the page turn excluded), `ladderPlan` (one note per beat, a part = 15 notes in 16 beats,
  both hands' notes on the same beat) and `ladderReport` (per part, crossings, hands, sync from the two offsets).
- `BeatTrack` now handles notes due together: windows are computed between distinct due times and, of notes in the
  window, the one matching the key wins.
- Unit 5 (`games/scales/lessons.ts`, 18 lessons): `kind: 'scale'` (played in `MelodyScreen`: key signature, written
  accidentals per page, finger numbers above treble / below bass notes, crossings in orange, a tip line "↪ Başparmağı
  altından geçir"), `kind: 'ladder'` (**Gam Merdiveni**, `games/arcade/ladder/`, through `BeatFrame` with its new
  `plan`, `report` and `nameOf` props: stairs up and down the scale, finger badges, the climber hops on each hit) and
  `kind: 'memory'` (**Melodi Hafızası**, `MemoryScreen` + `games/memory/engine.ts`: runs of scale steps from 3 to
  7–8 notes, played with sound and lit keys; a wrong key costs a heart and shows the right one).
- `PATTERN_KINDS` (scale, ladder, memory) stay out of the note statistics and get no "Bu notaları çalış" button.
  `SessionSummary` gained `scale` (evenness, mean interval, crossings), `memory` (longest runs) and `noteNames`
  (spelled names for the report). Results: "Gam tekniği" and "Hafıza" cards. Badges: Merdiven Tırmanıcısı, Fil
  Hafızası, Gam Ustası. `window.__dpoMemory` for the smoke test.

Phase 7 improvements (`claude/faz-7-iyilestirme-655r1z`, unit 5 now 24 lessons):

- `rhythm/tempoLadder.ts`: `RhythmSpec.tempoLadder { rounds, stepBpm }` makes `BeatFrame` play the same plan in rounds
  at rising tempos (`ladderTempos`). A round passes with a timing score ≥ `ROUND_PASS` (0.8); hearts carry over; all
  rounds passed raises `settings.tempo[lessonId]` by `stepBpm` (`raisedBase`). `BeatFrame.report` now takes every
  round's track; `ladderReport(rounds, meta, parts)` pairs hands per round. `SessionSummary.tempoLadder`, per-tempo
  topics, "Tempo merdiveni" card, badge Hız Treni (`LessonOutcome.tempoRaised`).
- `scaleFingering(tonic, hand, octaves)`: fingerings are cycles (`cycle` per degree, `first`/`last` for the end
  tonics); B, E♭, A♭ added. `ScalePart.octaves: 2` gives 29-note runs; `Step.newPage` starts the way down on a new
  page (`paginate` moved to `games/melody/session.ts`, also used by the evenness). Gam Merdiveni stays one octave.
- `MemorySpec.listenOnly` (Kulaktan Hafıza): only the first note lights up, every run starts on the tonic
  (`firstPosition`), falls back to lit keys when the piano samples did not load (`.memory-board[data-ear]`).

Phase 8 (chords, `claude/faz-8-akorlar-0xd3ut`, unit 6 = 24 lessons with the extras):

- `src/music/chords.ts`: `chordTones` spells by thirds (B♭-D-F); qualities major, minor, dim, dom7, maj7, min7;
  `invert`, `chordFingers` (RH 1-3-5 / 1-2-5, LH 5-3-1 / 5-2-1, sevenths 1-2-3-5), `chordTarget(root, quality,
inversion, hands)` places a `ChordTarget` (right hand ≤ G5, left hand ≤ C4; `hands: 'both'` adds the root as the left
  hand's bass), `identifyChord`, `progression(key, numerals, { hands, voiceLead })` (each chord takes the inversion
  that moves least: in C, I–IV–V–I = C-E-G, C-F-A, B-D-G, C-E-G), `arpeggioRun` (1-2-3-5, two octaves 1-2-3-1-2-3-5,
  LH 5-4-2-1-4-2-1, crossings via `crossingBetween`).
- `src/games/chords/session.ts`: **`ChordListener`** groups presses: held keys plus keys released within
  `CHORD_WINDOW_MS` (350 ms); `abandoned(now)` reports an attempt released unfinished. `matchChord(target, presses,
mode)` with modes `exact` (written keys), `voicing` (any octave, right bottom note) and `pcs` (any inversion) returns
  `partial | wrong (octave?) | inversion | complete (spreadMs, lastVoice)`. `judgePress` does the bookkeeping of a
  `ChordRecord` (wrong keys, inversion mistakes, incomplete attempts, spread). **`ChordSession`** is the drill (a wrong
  key or inversion costs a heart, an incomplete chord does not). Together = spread ≤ `TOGETHER_MS`.
- `report.ts` `summarizeChords`: topics per family, inversion, hand, degree ("IV (Fa Majör)") and "Notalara aynı anda
  basma"; `SessionSummary.chords` (together share, mean spread, the late voice: bass/bottom/middle/top, inversion
  mistakes, weakest chords) → results "Akor tekniği" card. `feedback.ts`: messages per chord event.
- `arpeggio.ts`: `ArpeggioPart { root, quality, hands: right | left | parallel, octaves }`, `arpeggioSteps` (melody
  steps with fingers; played in `MelodyScreen`, `kind: 'arpeggio'`, reported by `patternReport` = the generalised
  `scaleReport`), `surfPlan` (one note per beat in 3/4, the last note a dotted half). `ladderReport(rounds, meta,
titles)` now also measures "Eşit aralık" (evenness of the played intervals) for Gam Merdiveni and Arpej Sörfü.
- `lessons.ts`: `ChordSpec { chords, draw | repeat, mode, showName, showNotes, progression }`, `chordSequence`
  (random draws never repeat a chord back to back). Kinds `chord` (`ChordScreen`: `MelodyStaff` pages of chords,
  numerals line, fingers, `.chord-wrap[data-pending]`, `window.__dpoChord`), `chef` and `space`
  (`ChordArcadeScreen`, `window.__dpoChordArcade`), `arpeggio`, `surf` (`BeatArcadeScreen` → `SurfScreen`).
- Games: **Akor Aşçısı** (`arcade/chef/`: one recipe at a time with a patience bar, ingredients float in the pot while
  the keys are down, a burnt dish costs a heart), **Uzay Savunması** (`arcade/space/`: invaders in three lanes carry a
  chord on a mini staff, the cannon shoots the one whose chord is played; a key that fits another invader starts a new
  chord; a landed invader costs a heart), **Arpej Sörfü** (`arcade/surf/scene.ts`: the wave is the arpeggio's pitch
  contour, buoys with names and finger badges, the surfer wipes out on a miss; one lesson with a tempo ladder).
- Extras (PR #12): **Akor Barmeni** (`kind: 'chordbar'`, `arcade/bar/chordEngine.ts`: Nota Barmeni's customers order
  chords; three counters for one hand, two per hand when both play, `chordBarRows`). `judgeAmong` in
  `chords/session.ts` picks which of several waiting chords the keys are for (Uzay Savunması and Akor Barmeni).
  `createBarScene` is generic over both bar games (`BarView`, `noteSpans` / `chordSpans`, `order(c)` gives a card's
  notes and name). **Kulaktan Akor** / **Kulaktan Yedililer** (`ChordSpec.byEar`): `ChordScreen` plays the chord,
  lights its root and hides the staff (`.ear-board[data-ear][data-pending]`, "Tekrar dinle"); the player finds major,
  minor or seventh; without piano samples the chord's name is shown instead.
- All chord kinds are in `PATTERN_KINDS` (no note statistics). XP line "İlk denemede doğru akorlar"
  (`LessonOutcome.chords`). Badges: Akor Şefi, Uzay Kahramanı (`noneMissed`), Sörf Ustası, Tek Hamlede
  (`allTogether`), Akor Ustası.

Next: **phase 9, ear training and memory** (see `docs/PLAN.md`). The owner asked to **pause after each phase**: check
the plan against the code, test, report with suggestions, and wait for the go before starting the next phase.

## Testing in a real browser

`scripts/smoke.mjs` plays real lessons in Chromium: the treble unit (drills, Nota Kuşu, Balon Patlatma, a lesson that
runs out of hearts), then all thirteen rhythm lessons incl. 3/4 and dotted ones (the page presses keys on each beat with `setTimeout`, one run 60 ms late; one checks the remembered tempo), the bass unit (drills, bird, left-hand melody, balloon), the hands unit (grand staff, middle C on both staves, Nota Barmeni, melodies with two keys pressed 30 ms apart),
all twenty-four scale lessons (scale drills with one and two hands and two octaves, four Gam Merdiveni runs at a faster
tempo, two tempo ladders: one passed in three rounds whose raised tempo is checked on reopening, one with a late second
round that stops the ladder; three Melodi Hafızası games, one with a wrong key, one by ear), all twenty-four chord lessons
(chords pressed 25 ms apart and once 140 ms apart, a wrong inversion in Aşçı: Çevrimler, progressions with both hands,
arpeggios, three Arpej Sörfü runs incl. a tempo ladder), a latency calibration that must measure 30 ms, the profile with its rhythm chart, a fake Akai MIDI input (recognised, octave hint), and that progress survives a reload. The staff exposes the current note as
`.staff-wrap[data-note]`, and keys are `.key[data-midi]`.

```bash
npm run build && (npx vite preview --port 4173 &) && sleep 3
CHROMIUM_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome npm run smoke -- /tmp/screens
```

`SMOKE_ONLY=chords` plays only unit 6 (a few minutes instead of the whole curriculum). Look at the screenshots after UI
changes. Piano samples fail to load in a sandbox without network; the script ignores
that error.

## Known gaps

- Rhythm timing is only tested with simulated presses; real MIDI and touch latency still need the owner's calibration.
- Not yet tested with a real MIDI keyboard. Bluetooth MIDI on Android needs pairing through a helper app (pairing in the
  OS Bluetooth settings only connects audio); on macOS via Audio MIDI Setup; on Windows USB is most reliable. iOS has
  no Web MIDI.
- The owner's keyboards (verified from spec sheets on 2026-10-07): at home a **Yamaha Clavinova CLP-845** (88 keys, USB
  TO HOST and Bluetooth audio + MIDI; Yamaha notes some regions ship without Bluetooth); at the office an **Akai MPK Mini
  MK3** (25 keys, USB only, class compliant, no sound of its own). Port names in `keyboards.ts` are educated guesses
  until the owner connects them.
- Font bundle includes all Nunito subsets; could be trimmed to latin + latin-ext.
