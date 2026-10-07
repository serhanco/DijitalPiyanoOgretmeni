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
  games/noteHunter/       lessons.ts, session.ts (pure engine), summary.ts (pure report)
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

| Branch               | State                                                               |
| -------------------- | ------------------------------------------------------------------- |
| `main`               | README, docs, CLAUDE.md only                                        |
| `faz-1-cekirdek`     | PR #1: phases 0 + 1                                                 |
| `faz-2-oyunlastirma` | PR #2: phase 2, stacked on `faz-1-cekirdek` (base branch of the PR) |

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

Next: **phase 4, mini-game engine** (see `docs/PLAN.md`). Suggested shape: PixiJS 8 in a lazy chunk; a `SkillProvider`
interface (`next(): Target` with the keys that count as correct and how to draw the target, plus a per-target result
record) so every game reuses `summarize`-style reports and `completeLesson`; first games **Nota Kuşu** (Flappy-like:
the gap sits at a staff position, playing that note flies the bird there) and **Balon Patlatma**. Add a lesson `kind`
(`drill | game | boss`) to the curriculum so the map mixes lesson types.

## Testing in a real browser

`scripts/smoke.mjs` plays real lessons in Chromium: a perfect "İlk Adımlar", a "Bir Oktav" that runs out of hearts,
then checks the map, the profile and that progress survives a reload. The staff exposes the current note as
`.staff-wrap[data-note]`, and keys are `.key[data-midi]`.

```bash
npm run build && (npx vite preview --port 4173 &) && sleep 3
CHROMIUM_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome npm run smoke -- /tmp/screens
```

Look at the screenshots after UI changes. Piano samples fail to load in a sandbox without network; the script ignores
that error.

## Known gaps

- Not yet tested with a real MIDI keyboard. Bluetooth MIDI on Android needs pairing through a helper app; on macOS via
  Audio MIDI Setup; on Windows USB is most reliable. iOS has no Web MIDI.
- The owner's piano model is unknown.
- Font bundle includes all Nunito subsets; could be trimmed to latin + latin-ext.
