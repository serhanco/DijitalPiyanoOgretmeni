import { type Application, Container, Graphics, Text } from 'pixi.js'
import type { RefObject } from 'react'
import type { BeatTrack } from '../../../rhythm/track'
import { type LadderMeta, partTitle, RUN_LENGTH, type ScalePart } from '../../scales/steps'
import type { Scene } from '../PixiStage'
import { climberPose, currentPart, type Stair, stairHeight, stairsOf, TOP } from './engine'

const SKY_TOP = 0xdff7f2
const GROUND = 0xb7e4c7
const GROUND_DARK = 0x7cc49a
const STONE = 0x2bc4a8
const STONE_DARK = 0x1e9c85
const GOLD = 0xffc800
const LATE = 0xff9600
const MISS = 0xff4b4b
const RIGHT = 0x1cb0f6
const LEFT = 0xff4b8b
const CROSS = 0xff9600
const INK = 0x2b2f3a
const BODY = 0x8e6cf0
const BODY_DARK = 0x6a4bd1

export interface LadderSceneOptions {
  parts: ScalePart[]
  meta: LadderMeta[]
  /** Drawn before the start, when there is no track yet. */
  preview: BeatTrack
}

interface StairTexts {
  box: Container
  name: Text
  fingers: { text: Text; badge: Graphics; hand: 'right' | 'left' }[]
}

const label = (text: string, size: number, fill: number) =>
  new Text({
    text,
    style: { fontFamily: 'Nunito Variable, Nunito, sans-serif', fontSize: size, fontWeight: '800', fill },
  })

export function createLadderScene(
  app: Application,
  trackRef: RefObject<BeatTrack | null>,
  { parts, meta, preview }: LadderSceneOptions,
): Scene {
  const root = new Container()
  app.stage.addChild(root)
  const bg = new Graphics()
  const stones = new Graphics()
  const texts = new Container()
  const climber = new Graphics()
  const title = label('', 14, INK)
  root.addChild(bg, stones, texts, climber, title)
  let size = { w: 0, h: 0 }
  let shownPart = -1
  let labels: StairTexts[] = []

  function background(w: number, h: number, groundY: number) {
    bg.clear()
    bg.rect(0, 0, w, h).fill(SKY_TOP)
    bg.circle(w * 0.9, h * 0.16, h * 0.07).fill(0xfff1a8)
    bg.rect(0, groundY, w, h - groundY).fill(GROUND)
    bg.moveTo(0, groundY).lineTo(w, groundY).stroke({ width: 3, color: GROUND_DARK })
  }

  /** Text objects for a part's stairs, made once when the part comes on screen. */
  function buildLabels(stairs: Stair[], part: number) {
    texts.removeChildren().forEach((c) => c.destroy({ children: true }))
    labels = stairs.map((s) => {
      const box = new Container()
      // Contrary motion: the hands play different notes, so both names are shown.
      const names = [...new Set(s.meta.map((m) => m.name))]
      const name = label(names.join('\n'), 11, 0xffffff)
      name.style.align = 'center'
      box.addChild(name)
      const fingers = s.meta.map((m) => {
        const badge = new Graphics()
        const text = label(String(m.finger), 11, 0xffffff)
        box.addChild(badge, text)
        return { text, badge, hand: m.clef === 'treble' ? ('right' as const) : ('left' as const) }
      })
      texts.addChild(box)
      return { box, name, fingers }
    })
    title.text = partTitle(parts[part])
    shownPart = part
  }

  function stoneColor(s: Stair): number {
    const js = s.records.map((r) => r.judgement)
    if (js.some((j) => j === 'miss')) return MISS
    if (js.some((j) => j === null)) return STONE
    return js.every((j) => j === 'perfect' || j === 'good') ? GOLD : LATE
  }

  function drawClimber(x: number, y: number, unit: number, now: number, stumbling: boolean, wobbly: boolean) {
    const s = unit
    const bob = Math.sin(now / 300) * s * 0.03
    const body = stumbling && Math.floor(now / 80) % 2 ? MISS : BODY
    climber.clear()
    // feet
    climber.ellipse(-s * 0.16, -s * 0.05, s * 0.13, s * 0.07).fill(BODY_DARK)
    climber.ellipse(s * 0.16, -s * 0.05, s * 0.13, s * 0.07).fill(BODY_DARK)
    // a round note head with a stem and a flag
    climber.ellipse(0, -s * 0.42 + bob, s * 0.36, s * 0.32).fill(body)
    climber
      .moveTo(s * 0.3, -s * 0.5 + bob)
      .lineTo(s * 0.3, -s * 1.15 + bob)
      .stroke({ width: s * 0.08, color: BODY_DARK, cap: 'round' })
    climber
      .moveTo(s * 0.3, -s * 1.15 + bob)
      .quadraticCurveTo(s * 0.62, -s * 0.95 + bob, s * 0.5, -s * 0.72 + bob)
      .stroke({ width: s * 0.08, color: BODY_DARK, cap: 'round' })
    // face
    climber.circle(-s * 0.12, -s * 0.48 + bob, s * 0.1).fill(0xffffff)
    climber.circle(s * 0.1, -s * 0.48 + bob, s * 0.1).fill(0xffffff)
    climber.circle(-s * 0.1, -s * 0.47 + bob, s * 0.05).fill(INK)
    climber.circle(s * 0.12, -s * 0.47 + bob, s * 0.05).fill(INK)
    climber.circle(-s * 0.24, -s * 0.34 + bob, s * 0.05).fill({ color: 0xff86c8, alpha: 0.7 })
    climber.circle(s * 0.22, -s * 0.34 + bob, s * 0.05).fill({ color: 0xff86c8, alpha: 0.7 })
    if (stumbling || wobbly) climber.circle(0, -s * 0.3 + bob, s * 0.05).fill(INK)
    else
      climber
        .moveTo(-s * 0.08, -s * 0.32 + bob)
        .quadraticCurveTo(0, -s * 0.24 + bob, s * 0.08, -s * 0.32 + bob)
        .stroke({ width: 2, color: INK })
    climber.position.set(x, y)
    climber.rotation = stumbling ? -0.3 : wobbly ? Math.sin(now / 60) * 0.12 : 0
  }

  return {
    tick(_dtMs, now) {
      const { width: w, height: h } = app.screen
      const groundY = h * 0.9
      if (w !== size.w || h !== size.h) {
        size = { w, h }
        background(w, h, groundY)
      }
      const track = trackRef.current ?? preview
      const live = trackRef.current !== null
      const part = currentPart(track, meta)
      const stairs = stairsOf(track, meta, part)
      if (part !== shownPart || labels.length !== stairs.length) buildLabels(stairs, part)

      const col = w / (RUN_LENGTH + 1.5)
      const unitH = Math.min((h * 0.7) / (TOP + 1.6), col * 1.1)
      const xOf = (step: number) => (step + 1.25) * col + col / 2
      const topOf = (step: number) => (step < 0 ? groundY : groundY - stairHeight(step) * unitH)
      const next = stairs.find((s) => s.records.some((r) => r.judgement === null))
      const beat = live ? track.beatAt(now) : 0
      const pulse = live && beat >= 0 ? 1 - (beat - Math.floor(beat)) : 0

      stones.clear()
      // The start platform.
      stones.roundRect(col * 0.2, groundY - unitH * 0.25, col * 1, unitH * 0.25, 4).fill(STONE_DARK)
      for (const s of stairs) {
        const x = xOf(s.step) - col / 2 + 1
        const top = topOf(s.step)
        const color = stoneColor(s)
        stones.roundRect(x, top, col - 2, groundY - top, 5).fill(color)
        stones.rect(x, top, col - 2, Math.min(6, unitH * 0.2)).fill({ color: 0xffffff, alpha: 0.25 })
        if (s === next)
          stones
            .roundRect(x - 2, top - 2, col + 2, groundY - top + 2, 6)
            .stroke({ width: 2 + pulse * 3, color: 0xffffff, alpha: 0.6 + pulse * 0.4 })
      }

      const fontSize = Math.max(9, Math.min(14, col * 0.42))
      stairs.forEach((s, i) => {
        const l = labels[i]
        if (!l) return
        const cx = xOf(s.step)
        const top = topOf(s.step)
        l.name.style.fontSize = fontSize
        l.name.position.set(cx - l.name.width / 2, top + 3)
        // Finger numbers float above the stairs still to climb, crossings in orange.
        const todo = s.records.some((r) => r.judgement === null)
        const r = Math.max(7, fontSize * 0.75)
        l.fingers.forEach((f, k) => {
          f.badge.visible = f.text.visible = todo
          const bx = cx + (l.fingers.length > 1 ? (k === 0 ? -r * 1.05 : r * 1.05) : 0)
          const by = top - r - 4
          const crossing = s.meta[k].cross !== null
          f.badge
            .clear()
            .circle(0, 0, r)
            .fill(f.hand === 'right' ? RIGHT : LEFT)
          if (crossing) f.badge.circle(0, 0, r).stroke({ width: 3, color: CROSS })
          f.badge.position.set(bx, by)
          f.text.style.fontSize = r * 1.3
          f.text.position.set(bx - f.text.width / 2, by - f.text.height / 2)
        })
      })

      const pose = climberPose(stairs, now)
      const lerp = (a: number, b: number) => a + (b - a) * pose.t
      const x = lerp(xOf(pose.from), xOf(pose.to))
      const y = lerp(topOf(pose.from), topOf(pose.to)) - pose.hop * unitH * 1.4
      const startX = pose.to < 0 ? col * 0.7 : x
      drawClimber(startX, y, Math.min(unitH * 1.3, col * 1.2), now, pose.stumbling, pose.wobbly)

      title.position.set(10, 8)
    },
    destroy() {
      texts.removeChildren().forEach((c) => c.destroy({ children: true }))
    },
  }
}
