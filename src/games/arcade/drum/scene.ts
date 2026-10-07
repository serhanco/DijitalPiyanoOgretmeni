import { type Application, Container, Graphics, Text } from 'pixi.js'
import type { RefObject } from 'react'
import { solfegeName } from '../../../music/notes'
import { VALUE_BEATS } from '../../../rhythm/rhythm'
import type { BeatTrack } from '../../../rhythm/track'
import type { Scene } from '../PixiStage'
import { BEATS_AHEAD, HIT_Y, laneOf, noteY } from './engine'

const STAGE_TOP = 0x2a1b4d
const STAGE_BOTTOM = 0x47307a
const LANE_COLORS = [0xff4b4b, 0xffc800, 0x1cb0f6, 0x58cc02, 0xce82ff]
const BURST_MS = 320

export interface DrumSceneOptions {
  /** One note per lane, low to high (one lane when any key counts). */
  lanes: number[]
  anyKey: boolean
  beatsPerBar: number
}

export function createDrumScene(
  app: Application,
  trackRef: RefObject<BeatTrack | null>,
  opts: DrumSceneOptions,
): Scene {
  const root = new Container()
  app.stage.addChild(root)
  const bg = new Graphics()
  const grid = new Graphics()
  const pads = new Graphics()
  const notes = new Graphics()
  const labels = opts.lanes.map(
    (midi) =>
      new Text({
        text: opts.anyKey ? 'Herhangi bir tuş' : solfegeName(midi, false),
        style: { fontFamily: 'Nunito Variable, sans-serif', fontSize: 16, fontWeight: '900', fill: 0xffffff },
      }),
  )
  for (const l of labels) l.anchor.set(0.5)
  root.addChild(bg, grid, pads, notes, ...labels)
  let size = { w: 0, h: 0 }

  const laneX = (i: number, w: number) => ((i + 0.5) / opts.lanes.length) * w

  return {
    tick(_dtMs, now) {
      const { width: w, height: h } = app.screen
      const hitY = HIT_Y * h
      const padR = Math.min((w / opts.lanes.length) * 0.32, h * 0.1)
      if (w !== size.w || h !== size.h) {
        size = { w, h }
        bg.clear()
        bg.rect(0, 0, w, h).fill(STAGE_TOP)
        bg.rect(0, h * 0.5, w, h * 0.5).fill({ color: STAGE_BOTTOM, alpha: 0.6 })
        // Stage lights.
        for (let i = 0; i < 3; i++) {
          bg.poly([w * (0.2 + i * 0.3), 0, w * (0.1 + i * 0.3), h, w * (0.3 + i * 0.3), h]).fill({
            color: 0xffffff,
            alpha: 0.04,
          })
        }
        for (let i = 1; i < opts.lanes.length; i++) {
          bg.moveTo((i / opts.lanes.length) * w, 0)
            .lineTo((i / opts.lanes.length) * w, h)
            .stroke({ width: 1, color: 0xffffff, alpha: 0.12 })
        }
        labels.forEach((l, i) => {
          l.style.fontSize = Math.max(12, padR * 0.45)
          l.position.set(laneX(i, w), hitY + padR * 1.45)
        })
      }

      const track = trackRef.current
      grid.clear()
      notes.clear()
      pads.clear()

      if (track) {
        // Beat lines fall with the notes; bar lines are brighter.
        const first = Math.floor(track.beatAt(now)) - 1
        for (let b = first; b <= first + BEATS_AHEAD + 2; b++) {
          const y = noteY(track.startAt + b * track.beatMs, now, track.beatMs) * h
          if (y < 0 || y > hitY + 4) continue
          const down = ((b % opts.beatsPerBar) + opts.beatsPerBar) % opts.beatsPerBar === 0
          grid
            .moveTo(0, y)
            .lineTo(w, y)
            .stroke({ width: down ? 2 : 1, color: 0xffffff, alpha: down ? 0.35 : 0.12 })
        }
      }

      const last = track?.lastPress
      opts.lanes.forEach((_, i) => {
        const x = laneX(i, w)
        const color = LANE_COLORS[i % LANE_COLORS.length]
        const struck =
          last &&
          now - last.at < 140 &&
          (last.event.type === 'hit' || last.event.type === 'wrong') &&
          laneOf(opts.lanes, last.event.record.target, opts.anyKey) === i
        const squash = struck ? 0.85 : 1
        // drum body and skin
        pads.roundRect(x - padR, hitY, padR * 2, padR * 0.9, padR * 0.2).fill(0x8b5a2b)
        pads.ellipse(x, hitY + padR * 0.9, padR, padR * 0.3).fill(0x6e4420)
        pads.ellipse(x, hitY, padR, padR * 0.38 * squash).fill(struck ? 0xffffff : 0xf4ead6)
        pads.ellipse(x, hitY, padR, padR * 0.38 * squash).stroke({ width: 3, color })
      })

      if (!track) return
      for (const r of track.records) {
        const y = noteY(r.dueAt, now, track.beatMs) * h
        if (y < -padR || y > h + padR) continue
        if (r.rest) {
          if (r.judgement === null || r.judgement === 'miss') {
            notes
              .roundRect(w * 0.08, y - 5, w * 0.84, 10, 5)
              .fill({ color: r.judgement === 'miss' ? 0xff4b4b : 0xffffff, alpha: 0.18 })
          }
          continue
        }
        const lane = laneOf(opts.lanes, r.target, opts.anyKey)
        const x = laneX(lane, w)
        const color = LANE_COLORS[lane % LANE_COLORS.length]
        if (r.judgement === null) {
          const beats = VALUE_BEATS[r.value]
          const rr = padR * (beats >= 2 ? 0.62 : r.value === 'e' ? 0.4 : 0.5)
          // Long notes (halves, dotted ones) leave a tail as long as they last.
          if (beats > 1) {
            const tail = (beats / BEATS_AHEAD) * HIT_Y * h
            notes.roundRect(x - rr * 0.35, y - tail, rr * 0.7, tail, rr * 0.35).fill({ color, alpha: 0.35 })
          }
          notes.circle(x, y, rr).fill(color).stroke({ width: 3, color: 0xffffff })
          notes.circle(x - rr * 0.3, y - rr * 0.3, rr * 0.25).fill({ color: 0xffffff, alpha: 0.6 })
        } else if (r.judgement === 'miss') {
          notes.circle(x, y, padR * 0.45).fill({ color: 0x888888, alpha: 0.5 })
        } else if (r.settledAt !== null && now - r.settledAt < BURST_MS) {
          const t = (now - r.settledAt) / BURST_MS
          notes.circle(x, hitY, padR * (0.6 + t)).stroke({ width: 4 * (1 - t) + 1, color, alpha: 1 - t })
        }
      }
    },
  }
}
