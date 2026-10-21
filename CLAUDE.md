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
npm run layout        # Layout suite: every game type on desktop, phone upright and sideways (see below)
npm run piano         # Phase 13 checks with a fake Clavinova: setup wizard, pedal, piano output, offline start
npx cap sync android  # After npm run build: copy dist/ into the Android app (built by CI, android.yml)
```

CI (`.github/workflows/ci.yml`) runs lint, format check, tests and build on every PR, and the layout suite in a second
job (report in the job summary, screenshots as the `layout-screens` artifact). `deploy.yml` publishes `dist/` to
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
  games/theory/           Başlangıç unit: QuizSession (cards + quiz), theory content, gradual note lessons
  games/chords/           (phase 8) ChordListener + ChordSession, chord report, arpeggio steps / Arpej Sörfü plan, unit 6
  screens/                Home, NoteHunter, Results (simple state machine in App.tsx, no router)
  state/settings.ts       Zustand + localStorage settings
  testing/                Test mode (notes with context, TestTools) and the progress code (backup, backupStore)
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
- **On-screen keyboard size:** never hand-pick a lesson's `keyboard`. Note lessons go through `withKeyboards`
  (`games/noteHunter/keyboard.ts`), pattern lessons through `stepsKeyboard`; both use `fitKeyboard` (`music/notes.ts`):
  notes inside one Do–Do octave get exactly that octave, wider sets run lowest to highest note, at least 8 white keys.
  Note-reading lessons pass `{ fromDo: true }` so the keyboard always starts on Do. `PianoKeyboard` keeps white keys
  at least `MIN_WHITE_KEY_PX` (28 px) wide and scrolls sideways when it does not fit, keeping its `focus` keys (the
  next notes) in view; a one-octave keyboard (`[data-octave]`) is taller outside the arcade games.
- **Back to the map:** `App` passes `focus = mapNodeOf(lesson)` when a lesson ends or is left; `HomeScreen` jumps to
  just above that `[data-node]`, glides it to the centre and ripples a ring (`.path-step.back`); reduced motion jumps.
  Other screens come back to the scroll position the map was left at, and every screen opened from the map starts at
  its top. The map's `TopBar` is sticky and its ⚙️ button (`aria-label="Ayarlar"`) opens `components/SettingsPanel.tsx`
  as a sheet (`.settings-sheet`, closed by "Ayarları kapat", Escape or a tap outside).
- Reaction time counts only prompts answered right on the first try. Accuracy = first-try correct / prompts seen.

## Current state and next steps

| Branch | State                                                                                              |
| ------ | -------------------------------------------------------------------------------------------------- |
| `main` | Phases 0–12, Başlangıç, test mode, the rhythm curriculum, the game rounds and the polish PRs, live |
| This   | Phase 13: real piano and the Android app (`claude/project-thread-9i936j`, PR #45)                  |

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
- Nota Kuşu's bird is a character in Notiş's style (`bird/character.ts`, pure): `birdPose(reaction, now, reduced)` gives
  the pose for `flap | oops | pass | crash` (squash, wing, happy / wide / dizzy eyes, stars, sweat drop), `nextReaction`
  keeps a stronger reaction from being cut short, `burst` / `stepParticles` make sparkles and a note on a pass, feathers
  on a crash. `BirdGame.flaps` / `lastFlapCorrect` tell the scene a wrong key was played. Reduced motion keeps the faces.

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
- `RhythmScreen` draws the whole piece as one strip (`RhythmStaff`): every beat is `BEAT_U` wide in every bar (notes are
  placed by time after VexFlow's formatter, so eighths look the same everywhere), the clef box and the playhead stay put
  and the strip slides left with the beat (a CSS transform, no page turns); before the start and in the count-in the
  first beat waits at the playhead. Paper and ink colours are set in JS (`THEMES`), not by a CSS filter. The notation
  fills the play area (`.rhythm-staff` sized from `cqh`, the game has a definite height).
- Holding notes (`rhythm/hold.ts`, `TrackOptions.holds`, on in `RhythmScreen` only): `BeatTrack.release(midi, time)`
  ends a note's hold; quarters and longer (not eighths) score `holdScore`: full from 75% of the length (`HOLD_FULL`),
  proportional below, and a note held past a quarter of the rest after it loses up to all of it. `scoreOf` takes up to
  half (`HOLD_WEIGHT`) of a note's score for its hold. Live "Kısa tuttun / Uzun tuttun", hold bars under the notes,
  topic "Notaları basılı tutma" and `timing.hold` on the results card. The smoke test holds keys 85% of each note.
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

Başlangıç unit (`claude/baslangic-dersleri-uox0fr`, the first unit on the map, 10 lessons):

- `games/theory/quiz.ts`: `TheorySpec { cards, questions, topics }`; questions are `choice` (tap an option) or `key`
  (press any key of a pitch class, through `inputBus`). **`QuizSession`** (pure): the first answer counts, a wrong one
  shows `explain` and the player tries again; `summarizeQuiz` = `SessionSummary` with topics and `quiz.missed` (the
  explanations shown in the results card "Bir daha göz at"). `kind: 'theory'` → `TheoryScreen` (cards with
  `components/TheoryArt.tsx`: SVG keyboard with black-key groups and Do-position fingers, treble staff with names and
  numbered lines, a hand with finger numbers, note durations), `window.__dpoTheory`. No hearts in quizzes.
- Theory lessons: Piyanoyla Tanışma, Parmak Numaraları, Porte ve Sol Anahtarı, Nota Süreleri (before the rhythm unit).
- Notes two at a time on a one-octave keyboard (`BASICS_KEYBOARD` C4–C5): Do ve Sol → Re ve Mi → Fa ve La → Si ve
  İnce Do, with a balloon game and Nota Kuşu between. `NoteLesson.introduce` makes the drill show each new note first
  (staff, lit key, `NOTE_INTRO` text: where it sits); `focus` asks those notes twice as often (`buildSequence(…, focus)`,
  rounds reshuffled until no note repeats back to back). Badge İlk Oktav. `SMOKE_ONLY=basics` plays this unit.
- Follow-up (owner's go on all four suggestions): `Unit.requires: 'basics'` keeps every other unit's first lesson
  locked until each Başlangıç lesson has a star, unless the learner already has stars in that unit (old progress stays
  open); the banner says "🔒 … bitince açılır". `nameQuestion(midi, clef)` ("Bu nota hangisi?", the two neighbour
  names as distractors, topic = line/space/outside) feeds Klavyesiz Okuma (treble, before Nota Kuşu) and the staff
  quizzes. Unit 3 starts with `BASS_START_LESSONS`: Fa Anahtarı theory (left-hand Do position, `fingers: 'left'`,
  `bass` staff art), Sol El: Do ve Sol → Re ve Mi → Fa ve La → Si ve Orta Do, Fa: Klavyesiz Okuma. Intro texts per
  staff: `noteIntro(midi, clef)`. `audio/speech.ts` reads cards and questions aloud (Web Speech, tr-TR) when
  `settings.narration` is on (default), plus a 🔊 button.

Test mode and the progress code (`claude/test-modu-oikwzf`):

- `settings.testMode` (Ayarlar → "Test modu"): every lesson opens (`HomeScreen` skips `isUnlocked`), a yellow banner on
  the map, and `testing/TestTools.tsx` puts a 📝 tab on the right edge of every screen. A note freezes its context when
  the panel opens (`Place` from `App`: screen, lesson, unit, kind, results accuracy and stars; MIDI devices, screen
  size, touch, relaxed mode, build stamp `__APP_BUILD__` = commit + date from `vite.config.ts`). Notes live in
  localStorage (`dpo-test-notes`, `useTestNotes`); `notesToMarkdown` makes the list the owner pastes into the chat
  ("Hepsini kopyala", share sheet on phones, .md download).
- **Game clock** (`input/gameClock.ts`): `gameNow()` = `performance.now()` minus the time spent paused; every lesson
  screen, `PixiStage`, `BeatFrame`, the calibration and the metronome use it, and `inputBus.emit` converts event times
  to it and drops key presses while paused. `gameTimeout` is a setTimeout that waits out pauses (the screens' `later`
  helpers). The 📝 panel calls `pauseGame()` / `resumeGame()`; the metronome pauses `Tone.Transport` with it. New
  screens must take time from `gameNow()`, never `performance.now()`.
- Each note can carry a screenshot (`testing/shots.ts`: `modern-screenshot`, lazily loaded; the visible viewport as
  JPEG, stored in a separate Dexie database `dpo-test-shots`). VexFlow's Bravura is a FontFace the screenshot cannot
  see, so `embedMusicFont` adds it as a stylesheet rule. Pixi canvases use `preserveDrawingBuffer`. "İndir" builds a
  .zip (`testing/zip.ts`, stored entries) with `test-notlari.md` and `ekranlar/not-NN.jpg`; "Paylaş" shares the files.
- **Dersi bitir** (⏭ under 📝 in lessons): `requestFinish()` (`testing/finishRequest.ts`) makes the lesson screen
  build its summary from what was played (`useFinishRequest` / `onFinishRequest` in every lesson screen; `BeatFrame`
  counts the round in progress). `App` sees `consumeFinishRequest()` and runs `completeLesson(outcome, now, false)`
  (reward worked out, not kept), skips `recordSession`, and the results show a test banner and no reward card.
- `testing/backup.ts`: `encodeBackup` = JSON → gzip (`CompressionStream`) → base64url with prefix `DPO1.` (`DPO0.`
  plain where gzip is missing); `decodeBackup` also takes a backup file's JSON. `backupStore.ts` collects / restores
  the Dexie `sessions`, `noteStats`, the `profile` kv row and the `dpo-settings` localStorage entry, then the page
  reloads. In Ayarlar for everyone ("İlerlemeyi taşı": Kodu al, Dosya indir / yükle, Kodu yükle with a confirmation).
- `SMOKE_ONLY=test` plays one lesson, turns test mode on, writes a note with a screenshot in a locked lesson, finishes
  it early (XP unchanged), checks that the balloons stand still behind the panel and move again after it, finishes a
  rhythm lesson mid-round, checks the copied Markdown and the .zip, and moves the progress code to a second page.

Game characters (`claude/project-thread-c81q91`):

- **Dino** (`arcade/dino/character.ts`, pure): `dinoFeeling(track, now)` reads the latest press / settled record into
  `perfect | good | off | stumble | sniff | run`; `dinoLook` gives the pose (backflip on a perfect jump, sweat when
  off the beat, dizzy stars on a stumble, sniffing a rest with a "shh" bubble); `outfitLevel(combo)` adds a scarf (5),
  sunglasses (10) and a crown (20); `cactusFace` gives the cacti faces. Scene: parallax hills and a volcano, footstep
  dust, turtles for eighths, sky by lesson progress (morning to dusk).
- **Barmen** (`arcade/bar/character.ts`): `nextMood` / `bartenderLook` (wink and toss a bottle on a serve, slip a glass
  on a wrong key, facepalm when a customer leaves, juggle three bottles from a streak of 5); six customer kinds
  (`kindOf(look)`: cat, frog, robot, octopus, bear, bunny) whose `patienceOf` face goes calm, tapping, watching the
  clock, steaming. `BarGame` / `ChordBarGame` expose `lastPress` (`serve | wrong`) for the scene. Cards are smaller so the
  customers' heads show.
- **Balon**: passengers in a basket under each balloon (worried and waving near the top, `rescue.ts` `danger`), a pop
  sends the passenger down on a parachute to the grass strip where rescued ones stand, a dart streaks to the balloon
  (grey and past it on a wrong key), sky by progress, balloons narrower so the outer lanes fit. `arcade/critter.ts`
  draws the shared heads.
- Pixi v8: an `arc` is joined by a line to the path's last point, so call `moveTo` to the arc's start first.

Rhythm curriculum (`claude/project-thread-wprkex`): the rhythm unit became two units, easy to hard with repetition:

- **Ritim 1: Temel Vuruş** (unit 2, 28 lessons: quarter, half, whole, quarter rest) and **Ritim 2: Sekizlikler ve
  Noktalılar** (`rhythm2`, between the bass clef and two-hands units, 25 lessons: eighths, 3/4 with dotted halves,
  dotted quarters, a review). Units after it are renumbered (İki El 5, Gamlar 6, Akorlar 7).
- Every pattern runs through the same steps (`rhythm/lessons.ts` helpers): `intro` (theory cards with the new
  `{ kind: 'rhythm', pattern }` art: notes on one line, the count "1 ve 2" under them, silent beats in parentheses),
  `echo` (**Yankı**), `drill` (a fixed pattern repeated), a Dino or Davulcu game, `songRhythm` (a song's rhythm on any
  key) and `song` (the song with its notes, the next key lit: `RhythmSpec.guide`). Review lessons use tempo ladders.
- `rhythm/plan.ts`: `rhythmPlan(spec)` gives the bars of a lesson: `RhythmSpec.tune` (a song, sung again until `bars`
  is filled), `pattern` (fixed bars, cycled), `echo` (each bar twice, `listen[bar]` true for the app's turn), otherwise
  random `generateBars`. `parsePattern` / `parseTune` check every bar is full. `BeatFrame` passes the field a spec whose
  `bars` is the number actually played.
- Yankı: `SkillTarget.demo` / `TimingRecord.demo` mark the app's notes. `BeatTrack.played` leaves them out of
  `total`, `done`, `progress`, `attempted`, `next` and the windows; presses during them are only stray. The metronome
  plays them as `cues` (piano samples via `pianoNoteAt`, a synth fallback; sounded even with the clicks off). The HUD
  shows "🎧 Dinle n/N" / "🎹 Sen çal n/N" (`.echo-turn[data-turn]`).
- `rhythm/tunes.ts`: copyright-free songs with `title` (Turkish), `original`, `origin` and a culture `fact`, shown on
  the start card (`.tune-info[data-tune]`) and in the lesson description. Songs: Frère Jacques, Ah vous dirai-je
  maman, An die Freude (plain and dotted), Au clair de la lune, Mary Had a Little Lamb, Hot Cross Buns (with rests and
  with eighths), Twinkle with rests, An der schönen blauen Donau, Petzold's Minuet (3/4), London Bridge, Jingle Bells.
- Songs with their notes (`anyKey` off) draw a pitched staff: `RhythmStaff` `pitched` shows all five lines, a treble clef
  and every note on its pitch (`StaffEvent.midi`); rhythm-only lessons keep the one-line staff.
- New value `w` (whole note, topic "Birlikler").
- Progress: the thirteen old lesson ids are kept (some moved to `rhythm2`). `isUnlocked` now opens a lesson when it or
  any later lesson of its unit has a star, so lessons added in front of passed ones never lock old progress.
- `SMOKE_ONLY=rhythm` plays Başlangıç and every lesson of both rhythm units (Yankı turns, the original title on each
  song's start card, perfect scores, the remembered tempo, tempo ladders). Layout cases `echo`, `song`, `theory-rhythm`.

Phase 9 (ear training and memory, `claude/project-thread-ytjjkw`, unit 8 = 24 lessons):

- `games/ear/intervals.ts`: interval names with a copyright-free song per interval (`song.way` when it goes down or
  sounds together), chord colours as plain semitone shapes (`CHORD_SHAPES`, incl. `aug`; heard only, so not in
  `music/chords.ts`), `COLOUR_HINTS`.
- `games/ear/session.ts` (**Kulak Dedektifi**, pure): `EarPrompt` tasks `direction | pitch | interval | sing | chord`;
  choice tasks have `options`, key tasks are answered on the keys (`sing` ignores its shown first note). `EarSession`
  (`markShown` once heard, `choose` / `press`, `replay` counted, a wrong answer costs a heart), `contrastOf` (the chosen
  sound, then the right one), builders and `buildCases(EarSpec)` (`balanced` draws, `mix` for Büyük Vaka), `earReport`
  (topics per direction / note / interval / way / colour, `SessionSummary.ear`: replays, top confusions and tips).
- `audio/earSound.ts`: `playParts` plays notes in turn or together on the piano samples, or on a synthesized tone when
  they are not loaded; game-clock timers. `TheoryCard.sound` / question `sound`: "🔊 Dinle" in `TheoryScreen`
  (questions play theirs as they open).
- `EarScreen` (`kind: 'ear'`): Notiş with `outfit="detective"` (hat, magnifier that fogs / glints), case board of pins,
  "ÇÖZÜLDÜ" stamp, `.ear-case[data-heard]`, `window.__dpoEar = { session, heard() }`.
- `MemoryGame`: `reverse`, `leaps` (report labels), `song` (`songMemory(tune)`: two-bar phrases, runs A, B, A+B per
  pair, the whole song last when ≤ 32 notes; played in the tune's rhythm; `listenEnd`). `MemorySpec.tune` / `reverse`
  / `leaps`; the song's card on the board; `MemorySummary.song` → "Şarkı Hafızası" results card.
- Results "Kulak" card; badges Keskin Kulak, Baş Dedektif, Şarkı Hafızası (`LessonOutcome.songLearned`: the last run
  played clean); XP line "İlk cevapta çözülen vakalar"
  (`LessonOutcome.ear`). `SMOKE_ONLY=ear` plays Başlangıç then unit 8; layout cases `theory-ear`, `detective`,
  `detective-keys`, `song-memory`.

Phase 10 (songs, `claude/project-thread-ytjjkw`, unit 9 = 22 lessons):

- `games/songs/song.ts`: `Song` (a `Tune` whose `notes` is the right hand, plus `left`, `beatsPerBar`, `bpm`,
  `sections` = bars per section); bars of `pitch/value` tokens, `C3+G3/h` for two keys, rests `er qr hr wr` only keep
  time. `parseSong` (both hands sorted, every bar checked full, hands of equal length), `songPart` (one hand or both,
  a bar range; labels keep the song's bar numbers), `concatSongs` (Konser: each song a section), `SongSpec` (songs,
  hands, mode wait or tempo, bars), `lessonPart`. `catalog.ts`: nine songs in Do majör, all public domain.
- `wait.ts` (**`WaitSession`**, Bekleyen mod, pure): steps = notes starting together (both hands); `update(now)` moves
  `position` (the beat at the line) at the fall tempo and stops at the next step (`waiting`, `arrivedAt`); `press`
  gives `hit | wrong | step | repeat | done`; playing ahead is allowed (the song catches up); a section ending with
  mistakes falls once more (`repeats`, rewound `REPEAT_LEAD_BEATS`). Records per step and pass: wrong keys, wait
  time, spread.
- `tempo.ts`: `tempoPlan` = the notes as `BeatTrack` targets (bars as one `w`/`hd` each, only counted by BeatFrame).
  `report.ts`: `waitReport` / `tempoReport` (topics per section, per hand, "İki el birlikte"; `hands`, `sync`;
  `SessionSummary.song` with section results, repeats, a tip). Sections not reached are left out.
- `components/Waterfall.tsx`: a canvas redrawn every frame; key positions from `keySpans` (`components/keyLayout.ts`,
  same geometry as `PianoKeyboard`) measured against the `.keyboard` of the same `.game`, so it follows a scrolling
  keyboard. States `pending | active | hit | off | miss | held`. `.game.song` has a definite height.
- `SongScreen` (`kind: 'waterfall'`): `WaitSong` (own frame: Akış hızı, `.song-start`, section banner "🔁 … bir
  daha", pending keys lit) and `TempoSong` (BeatFrame with `plan`, `report`, `holds`; 5 hearts). `window.__dpoSong`
  (mode, song, session). Theory art `{ kind: 'waterfall' }`. Results "Şarkı" card. Badges İlk Şarkım, İki Elle
  Şarkı, Konser Piyanisti (`LessonOutcome.song`, `songHands`). `SMOKE_ONLY=songs`; layout cases `theory-song`,
  `waterfall-wait`, `waterfall`.

Phase 11 (bosses and quests, `claude/project-thread-ytjjkw`):

- `games/boss/bosses.ts`: every unit ends with a boss lesson (`kind: 'boss'`, id `boss-<unit>`, title `Boss: <name>`,
  appended to `UNITS` in `curriculum.ts`). `BossSpec { name, taunt, look, phases }`; a phase is a lesson of the unit
  with a patch (shorter `length`, fewer `bars`, sliced `scales` / `melodies`, no tempo ladder, no intro), id
  `boss-<unit>-<n>`, title `Aşama n/3: <lesson>`. `unitDone` ignores bosses (they open nothing); the map draws the boss
  after the weak-notes node, bigger, with its own "BOSS!" bubble, and `current` (BAŞLA) skips bosses.
- `games/boss/report.ts`: `phaseDamage` = accuracy / `BOSS_WIN` (0.75) × 100 / phases; `bossReport` joins the phase
  summaries (phase topics, then the phases' topics merged by label); defeated = all phases played, none out of hearts,
  mean ≥ `BOSS_WIN`; `failed = !defeated` (no stars). `SessionSummary.boss` → results "Boss" card.
- `screens/LessonPlayer.tsx`: the lesson-kind dispatch (moved out of `App`); `BossScreen` plays each phase through it,
  with a stage between phases (`BossMonster`: parametric SVG monster, moods `idle | hurt | angry | laugh | defeated`,
  HP bar). A test finish inside a phase (`finishPending()`) ends the whole fight. `window.__dpoBoss`.
- `progress/quests.ts` (pure): `DAILY_POOL` / `WEEKLY_POOL`, `pickQuests` (seeded by the day / ISO week key, only
  eligible quests: `questEligible` in curriculum checks the unit is open), `advanceQuests(daily, weekly, event)` →
  progress, `xpLines` (+10 per quest, chest +20 when all three are done, weekly +50). Profile keeps `quests` and
  `weekly`; `ensureQuests` picks them (the map's `QuestBoard` calls it); `completeLesson` adds the quest lines to the
  reward (`Reward.lessonXp` is the lesson's own XP, `Reward.quests` the steps for the results "Görevler" card).
  `LessonOutcome.kind` and `boss`; XP line "Boss yenildi" (+30); badges Boss Avcısı, Boss Ustası, Haftanın Yıldızı.
- `SMOKE_ONLY=boss` plays Başlangıç, checks the quest board, beats Karışık Kedi and loses to it; layout case `boss`.

Map tour (`claude/project-thread-u0kytq`, interface polish after phase 11):

- Lesson nodes keep their kind's icon; stars show as a `.medal` on the node's corner (bronze 1, silver 2, gold crown 3,
  a trophy on a boss). A tap on an open node opens `components/LessonPeek.tsx` (what it is, best accuracy, plays) and
  `.lesson-peek-go` starts it: scripts use `openLesson(title)` instead of clicking the node.
- The map's quest board and MIDI panel open as sheets (`components/Sheet.tsx`) from two short cards
  (`HomeShortcuts`, `[data-shortcut="quests" | "midi"]`); the 🧭 chip in the top bar opens `UnitNav` (progress per unit,
  tap to jump). A finished unit (boss included, not in test mode, not the unit just left) folds into its banner
  (`[data-unit-fold]`); `openedUnits` remembers the ones opened again.
- Round 2: unit banners show a star bar (`.unit-progress`, 🏅 when finished); the stat chips are buttons whose `onHint`
  explains them in the map's toast; settings are grouped (Ders, Ses, Klavye ve MIDI, Gelişmiş); from 1100 px wide
  (`useWide` in `HomeScreen`) the quest board and MIDI panel sit in a sticky side panel (`.home.wide > .home-side`)
  instead of the two shortcut cards.
- `components/Welcome.tsx`: first launch only (`dpo-welcomed` in localStorage, and no finished lesson): Notiş, keyboard
  kind (a 25-key controller turns on `ignoreOctave`), daily goal. The scripts set the key before loading.

Phase 12 (smart learning, `claude/project-thread-ytjjkw`):

- `progress/srs.ts` (pure): every note (per staff), chord (per inversion and hands), scale part and arpeggio part is a
  `Card` in Leitner boxes 1–5 (`BOX_DAYS` 1, 2, 4, 7, 15; due dates are day keys). `nextBox`: ≥ `PROMOTE_AT` (0.9) moves
  a due card up (an early replay does not), < `DEMOTE_BELOW` (0.6) back to 1; a new card starts in 2 or 1.
  `cardResults(lesson, summary)`: reading lessons' `perNote`, chord kinds' `ChordSummary.perChord` (not `byEar`), scale /
  ladder / arpeggio / surf topics `part-n`; lessons made of lessons (boss, mix) carry `SessionSummary.cards`.
- Dexie version 2 adds the `review` table (also in the backup code); `history.reviewLesson(results, now, save)` writes
  the cards and returns the `CardMove`s (`App.finish`, a test finish only works them out). Results: the mix lists every
  move ("Aralıklı tekrar" card), other lessons show one line.
- `progress/mix.ts`: `buildMix(cards, today)` → lesson `mix` (`kind: 'mix'`, `MixSpec`): a drill of the due notes of
  the staff with most due (filled up to 4, plus `stretchNotes`: the white keys just outside the met range once 4 notes
  are in box ≥ 3, introduced first), the due chords (`exact`, names shown), the due scales or else arpeggios.
  `MixScreen` plays the phases (like `BossScreen`, Notiş between, `window.__dpoMix`); `mixReport` never fails. No stars;
  +15 XP once a day (`profile.mixDay`). Map: `DailyMixCard` (`[data-node="mix"]`, hidden until there are cards).
- `progress/adaptive.ts`: `nextPace` per arcade lesson (bird, balloon, bar: ±0.1 in 0.8–1.3, `profile.pace`,
  `Reward.pace`); engines divide their durations by `game.pace`; HUD chip `.pace-chip`. `nextTempo`: three stars +4,
  lost −4 into `settings.tempo[lessonId]` (lesson tempo −20 … +30; not for tempo ladders), results `[data-adapt]`.
- `progress/weekly.ts`: `weekSummary(sessions, cards, monday)` (lessons, XP, days, accuracy vs the week before, most
  improved lesson, mastered cards). `components/WeekSummary.tsx`: "Bu hafta" on the profile, "Geçen haftan" on the map
  until closed (`profile.weekSeen`). Map cards keep their last data in module caches so the map does not jump on return.
- `SMOKE_ONLY=smart` plays Başlangıç, makes its cards due (plus a chord and a scale), plays the mix, checks the boxes,
  the pace after a perfect Nota Kuşu and both weekly summaries; layout case `mix` and the `akilli` map check seed IndexedDB.

Game round (`claude/project-thread-q9rplm`, the owner picked items from the game ideas list):

- `games/arcade/ramp.ts`: `rampAt(spawned, total, ramp)` (lessons ramp over their targets; `ENDLESS_RAMP` = 30
  targets, up to 1.6× the lesson curve) and **`Surprise`** (after `SURPRISE_FIRST_S` 20 s of play, then every 45 s,
  for 8 s: speed ×`SURPRISE_BOOST` 1.2 and `points` 2). Every note and chord arcade engine has `ramp`, `surprise`
  (ticked in `update`, divides its durations, `score += surprise.points`).
- `screens/arcade/useArcade.ts`: `useCombo` (combo, `bestCombo()`), `useSurprise` (polls the game, the HUD message
  per kind, `.pixi-stage[data-surprise="wind | storm | rush | meteor"]` CSS weather), `arcadeStats` →
  `SessionSummary.arcade { score, bestCombo, surprises }`. `FEVER_AT` 5: `.pixi-stage[data-fever]` glow and
  `ArcadeChips` 🔥. Results show the longest run for lessons.
- **Nota Treni** (`kind: 'train'`, `arcade/train/`): wagons in a row (`WAGON_GAP`) ride to the signal (`SIGNAL_X`);
  the front one is played (`shownAt` when it becomes the front), a wagon at the signal derails (heart). `NoteLesson.tunes`
  puts songs on the wagons in order (`train/tunes.ts`: seven new public-domain songs, `tunePitches`); the HUD names
  each song (Turkish title, original, origin) as its first wagon comes up. Treble unit: `treble-train-1`, `-2`.
- **Kayıp Kuş Sesi** (`kind: 'chirp'`, `arcade/chirp/`, in `PATTERN_KINDS`): one bird at a time sings its note
  (`sing` event → `playParts`), the player finds it by ear (a wrong key costs nothing, the bird sings again; the 🔊
  button `replay()`s), patience runs out → heart. Nests labelled with the note names fill up. No surprises.
  Ear unit: `ear-chirp-1` (Do Mi Sol), `ear-chirp-2` (octave). Both new kinds play in `ArcadeScreen` and adapt pace.
- **Oyun Salonu** (`games/salon/salon.ts`, `screens/SalonScreen.tsx`, map `components/SalonCard.tsx`
  `[data-node="salon"]`): `SALON_GAMES` (template lesson per game) × `SALON_SKILLS` (source lesson whose notes, chords
  or rhythm are played); a game opens when a lesson of its kind has a star, a skill when its source does.
  `salonLesson` builds `salon-<kind>-<skill>` with `NoteLesson.salon { endless }`: note and chord games are endless
  (`ENDLESS_LENGTH`, `ENDLESS_RAMP`, `.endless-bar`, no stars), beat games play 8 random bars. `profile.salon` keeps
  `SalonRecord { best, bestCombo, plays }` (`LessonOutcome.salon`, `Reward.record`); Salon games keep no lesson
  progress, pace, note statistics or review cards. Results: `RecordCard`, "Salona dön" (back to the salon with the
  game picked). Lesson icons moved to `screens/kindIcons.ts`.
- `SMOKE_ONLY=games` plays Başlangıç, Nota Treni (checks each song is named) and two endless Salon games (a record,
  then not); layout cases `train`, `chirp` and the `salon` check (screen, pick, endless game, record, way back).

Game round 2 (`claude/project-thread-q9rplm`, the owner's "yap gitsin" on the five deferred ideas):

- `games/arcade/bonus.ts`: **golden targets** (`markGolden`: every `GOLDEN_EVERY` 7th from the 4th; `GOLDEN_POINTS` 3×
  score) in Balon and Nota Barmeni; `goldenStats` → `ArcadeStats.golden`; `LessonOutcome.golden` gives `XP_GOLDEN` (5)
  per golden target hit first try (XP line "Altın hedefler"). Scenes draw a halo / crown.
- **Hint glow** (`settings.hintGlow`, default on): `PromptRecord.hinted` makes `firstTryOk` false. The drill glows the
  key after `GLOW_AFTER_MS` (4 s); arcade engines have `hint()` (the target near danger, `hintFor` marks it) polled by
  `useHint`; `.key[data-mark='glow']`. `SessionSummary.hinted` → results line `[data-hinted]`.
- **Wardrobe** (`progress/wardrobe.ts`): ten costumes opened by level or badge; `profile.costume` / `setCostume`;
  `Mascot` wears it unless given an `outfit`; `components/Wardrobe.tsx` on the profile; `Reward.costumes` → results
  card `[data-new-costume]` with "… giydir".
- **Kurbağa Atlayışı** (`kind: 'frog'`, `arcade/frog/`): lily pads carry the next note a jump away on white keys
  (`frogPath`, never the same jump three times); the bubble names the jump ("↑ 3'lü"); a pad sinks when its time runs
  out (heart). Report topics per jump size and direction (`jumpTopics`). Ear unit: `ear-frog-1`, `ear-frog-2`.
- **Çift Kişilik Davul** (`kind: 'duet'`, `games/duet/session.ts` `DuetSession`, `screens/DuetScreen.tsx`): Notiş
  plays a bar, the learner answers the next bar on any key; `echo` rounds copy the call (judged like `BeatTrack`),
  `free` rounds need ≥ 3 on-grid notes (`own` when the rhythm differs). `duetReport` → results "Davul düeti" card.
  Rhythm units: `rhythm-duet-1`, `rhythm-duet-2`. `window.__dpoDuet`. Both new kinds are in `PATTERN_KINDS`.
- Smoke: ear and rhythm runs play the new lessons; layout cases `frog`, `duet`.

Game round 3 (`claude/project-thread-q9rplm`, the owner's "hepsini yapıver" on the last three ideas, plus songs in
the Salon):

- **Oyun arası Notiş** (`games/intro.ts`, `components/GameIntro.tsx`): `GAME_INTROS` gives every game kind a two-sentence
  rule and a three-step move. `LessonPlayer` shows it the first time a kind opens (`introFor`, seen kinds in
  localStorage `dpo-intros`, like the welcome); the card pauses the game clock (`pauseGame`) until "Hadi oynayalım!",
  and narration reads the rule. Browser scripts set `dpo-intros` to `off` in their init script; the games smoke turns
  it on for Nota Treni and checks the train waits behind the card.
- **Ses katmanları** (`audio/layers.ts`, `settings.musicLayers`, "Oyun müziği" in Ses): `layerHit(midi, run)` adds a
  synthesized bass from a run of 3 (`LAYER_AT`), its fifth from 5, a high shimmer from 10; `ArcadeScreen.react` keeps
  the run. `ArcadeStats.melody` (`melodyOf`: notes answered right, up to `MELODY_MAX` 48, not Kayıp Kuş Sesi) →
  results `MelodyCard` (`.melody-card`, "Melodini dinle" through `playParts`).
- **Bilinen şarkılar**: Salon skill `sarki` (`SalonSkill.songs`, opened by `treble-train-1`) puts `SALON_SONGS` (the
  rhythm units' and Nota Treni's 17 songs) on Nota Kuşu, Balon and Nota Treni. `ArcadeScreen.tuneSkill` (was
  `trainSkill`) shuffles the songs in the Salon and repeats them up to the endless length; the HUD names each song as
  its first note comes up, `ArcadeStats.songs` lists the songs reached.
- **Hayalet** (`progress/ghost.ts`, pure): a `Ghost` is a run's score after each second (`by: 'second'`, endless
  games, `useSecondTrace`) or each note (`by: 'note'`, `beatGhost`: the timing so far in percent of the round, tempo
  ladder rounds joined). `profile.ghosts[lessonId]` keeps the best (`beatsGhost`; `LessonOutcome.ghost`,
  `Reward.ghost`); every Salon game and the Dino / Davulcu lessons race it with `GhostChip` (`.ghost-chip[data-ghost]`,
  `screens/arcade/Ghost.tsx`, hooks in `ghostHooks.ts`). Results `[data-ghost="new" | true | false]`.

Phase 13 (real piano and every device, `claude/project-thread-9i936j`; plan reviewed with the owner first in
`/mnt/project-files/faz-13/plan.md`):

- **Klavye bağlantı sihirbazı** (`screens/KeyboardSetupScreen.tsx`, screen `setup`, from Settings and the MIDI panel
  `[data-open-setup]`): connect, key range, Do-Mi-Sol together, touch (velocity), pedal, piano sound, latency (opens
  `CalibrationScreen`, which comes back with `from: 'setup'`), report. Pure checks in `midi/setupCheck.ts`
  (`rangeText`, `chordCheck`, `touchCheck`, `reportMarkdown`); the report is kept in localStorage `dpo-keyboard-report`.
- **Sustain pedal:** `parseMidiMessage` returns `{ type: 'pedal', down }` for CC 64; `input/pedal.ts` publishes it
  (not through `inputBus`). `input/sustain.ts` (`Sustain`) defers a key's release while the pedal is down, until the
  pedal lifts or the key is struck again. Only `BeatFrame` uses it (holds); chord listeners keep real key-ups.
- **Piano output** (`midi/midiOut.ts`): `pickOutput` takes only an output whose `portKey` matches a connected input
  that makes sound (never the Akai or virtual ports). `audio/piano.ts`: `pianoAttack`/`pianoRelease`/`pianoNoteAt` are
  the app's example notes and go to the piano when `pianoOutput()` (setting `demoOnPiano`, default on);
  `samplerAttack`/`samplerRelease` are the learner's own key sound (`useSoundRouting`). `isPianoReady()` is true with
  an output. `isEcho` drops a note-on the piano sends back within `ECHO_MS`. `useMidi().output` names the port.
- `screens/useWakeLock.ts` (in `LessonPlayer`, nested screens counted): Screen Wake Lock, the native flag in the app.
- **PWA:** `scripts/icons.mjs` draws the icons (Notiş on a piano) into `public/icons/`, `favicon.svg` and the Android
  launcher icons and splash screens. `registerType: 'prompt'`; `state/appUpdate.ts` (`setupAppUpdates` in `main.tsx`)
  keeps the install prompt and the waiting version; `components/UpdateToast.tsx` on the map, `InstallPanel.tsx` in
  Settings → Uygulama (install, update check, build stamp, the APK link on Android browsers).
- **Android app** (Capacitor 8, `capacitor.config.ts`, `android/`, app id `io.github.serhanco.piyano`): the WebView has
  no Web MIDI, so `NativeMidiPlugin.java` (MidiManager devices, BLE MIDI scan/connect, send, keepAwake) and
  `midi/nativeMidi.ts` (a MIDIAccess-like shim: `midiStore` is unchanged; `isNativeApp()` reads `window.Capacitor`, the
  plugin is imported lazily) with `splitMidi.ts` (multi-message buffers, running status). `midi/BluetoothScan.tsx` in
  the MIDI panel and wizard. `.github/workflows/android.yml` builds the APK (artifact `android-app`); `deploy.yml`
  builds it first and publishes it as `dist/piyano-ogretmeni.apk`. Signed when the `ANDROID_KEYSTORE_BASE64`,
  `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD` secrets exist, otherwise a debug build. The
  Android SDK is not reachable from the cloud sessions: only CI compiles the Java.
- `npm run piano` (`scripts/piano.mjs`, in the CI layout job): a fake Clavinova (input + recording output) runs the
  wizard, checks the notes sent to the piano, plays Yankı: Dörtlükler with short taps without and with the pedal,
  checks the wake lock and the manifest icons, and opens a lesson offline.

Next phases (each one's content is reviewed with the owner before it starts, see `docs/PLAN.md`): 14 visual world, 15
accounts and social, 16 placement test and new skills, 17 store release and iOS. The owner asked to **pause after each
phase**: check the plan against the code, test, report with suggestions, and wait for the go.

## Testing in a real browser

`scripts/smoke.mjs` plays real lessons in Chromium: the treble unit (drills, Nota Kuşu, Balon Patlatma, a lesson that
runs out of hearts), then all fifty-five lessons of the two rhythm units (theory, Yankı, patterns, games, songs incl. 3/4 and dotted ones) (the page presses keys on each beat with `setTimeout`, one run 60 ms late; one checks the remembered tempo), the bass unit (drills, bird, left-hand melody, balloon), the hands unit (grand staff, middle C on both staves, Nota Barmeni, melodies with two keys pressed 30 ms apart),
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

`scripts/layout.mjs` (**layout suite**, in CI) opens one lesson of every game type (theory, drills incl. intro, wide
keyboard and grand staff, Nota Kuşu, Balon, Nota Barmeni, Nota Treni, Kayıp Kuş Sesi, melody, rhythm, Dino, Davulcu, scales incl. two octaves with
two hands, Gam Merdiveni, both memory games, chords, Kulaktan Akor, Aşçı, Uzay, Akor Barmeni, arpeggio, Sörf, Nota Şelalesi in both modes) in test
mode on a desktop window (1366×700), a phone upright (390×844) and sideways (844×390, touch), plus the screens with a
staff once in dark mode (`koyu`: the inverted notation must sit on a dark box), plays a little, ends it
with "Dersi bitir" and checks the play screen, the start card and the results: nothing sticks out sideways, play area
and keyboard on screen together without scrolling and not overlapping, white keys ≥ 28 px, the wanted keys in the
visible part of the keyboard, Pixi canvases fill their stage, Başla buttons on screen; Uzay Savunması measures how long
a new invader's card is cut off at the top. Back on the map after every lesson it checks the lesson's node is
centred (`mapPlace`), and `mapReturns` checks leaving a lesson halfway, reduced motion and coming back from the profile; `topBar` checks the
sticky bar and the settings sheet.
It writes `rapor.md` / `rapor.json` and screenshots. Warnings (⚠️) and
`KNOWN` problems (🟠, already reported) do not fail the run; remove a `KNOWN` entry when its fix lands. `LAYOUT_ONLY=space,bird`
and `LAYOUT_VIEWPORTS=yatay` narrow a run.

`SMOKE_ONLY=chords` plays Başlangıç (it unlocks the others) and then unit 6 (a few minutes instead of the whole curriculum); `SMOKE_ONLY=songs` plays Başlangıç and unit 9 (a section repeat, both hands, the Kanon tempo ladder, Konser); `SMOKE_ONLY=games` plays Nota Treni and the Oyun Salonu; `SMOKE_ONLY=test` checks test mode and the progress code. Look at the screenshots after UI
changes. Piano samples fail to load in a sandbox without network; the script ignores
that error.

## Known gaps

- Rhythm timing is only tested with simulated presses; real MIDI and touch latency still need the owner's calibration.
- Not yet tested with a real MIDI keyboard (the setup wizard's report is meant for that). The Android app has only been
  compiled by CI, not run on a device.
- In the browser, Bluetooth MIDI on Android needs pairing through a helper app (pairing in the OS Bluetooth settings
  only connects audio; the Android app finds the piano itself); on macOS via Audio MIDI Setup; on Windows USB is most
  reliable. iOS has no Web MIDI.
- The owner's keyboards (verified from spec sheets on 2026-10-07): at home a **Yamaha Clavinova CLP-845** (88 keys, USB
  TO HOST and Bluetooth audio + MIDI; Yamaha notes some regions ship without Bluetooth); at the office an **Akai MPK Mini
  MK3** (25 keys, USB only, class compliant, no sound of its own). Port names in `keyboards.ts` are educated guesses
  until the owner connects them.
- Font bundle includes all Nunito subsets; could be trimmed to latin + latin-ext.
