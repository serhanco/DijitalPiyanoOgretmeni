import { describe, expect, it } from 'vitest'
import { BeatTrack } from '../../rhythm/track'
import { MelodySession } from '../melody/session'
import { SCALE_LESSONS } from './lessons'
import { evennessOf, ladderPlan, ladderReport, PART_BEATS, scaleKeyboard, scaleReport, scaleSteps } from './steps'

describe('scale steps', () => {
  it('turns a right-hand scale into fifteen fingered steps on the treble staff', () => {
    const steps = scaleSteps([{ tonic: 'G', type: 'major', hands: 'right' }])
    expect(steps).toHaveLength(15)
    expect(steps.every((s) => s.keySig === 'G' && s.notes.length === 1 && s.notes[0].clef === 'treble')).toBe(true)
    expect(steps[6].notes[0]).toMatchObject({ midi: 78, finger: 4 })
    expect(steps[3].notes[0].cross).toBe('under')
  })

  it('pairs the hands in parallel and contrary motion', () => {
    const parallel = scaleSteps([{ tonic: 'C', type: 'major', hands: 'parallel' }])
    expect(parallel[0].notes.map((n) => [n.midi, n.clef])).toEqual([
      [60, 'treble'],
      [48, 'bass'],
    ])
    const contrary = scaleSteps([{ tonic: 'C', type: 'major', hands: 'contrary' }])
    expect(contrary[7].notes.map((n) => n.midi)).toEqual([72, 48])
    expect(contrary[14].notes.map((n) => n.midi)).toEqual([60, 60])
  })

  it('sizes the keyboard from the lowest C to the highest key', () => {
    expect(scaleKeyboard([{ tonic: 'C', type: 'major', hands: 'parallel' }])).toEqual({ low: 48, high: 72 })
    expect(scaleKeyboard([{ tonic: 'E', type: 'major', hands: 'right' }])).toEqual({ low: 60, high: 76 })
  })

  it('builds every lesson of the unit', () => {
    for (const lesson of SCALE_LESSONS) {
      expect(lesson.keyboard.low % 12, lesson.id).toBe(0)
      if (lesson.scales) expect(scaleSteps(lesson.scales).length).toBe(lesson.scales.length * 15)
      if (lesson.rhythm) expect(lesson.rhythm.bars * 4).toBe(lesson.scales!.length * PART_BEATS)
    }
  })
})

describe('scale report', () => {
  it('reports each scale, the crossings and the evenness', () => {
    const parts = [{ tonic: 'C', type: 'major' as const, hands: 'right' as const }]
    const steps = scaleSteps(parts)
    const s = new MelodySession({ steps })
    let t = 0
    for (const step of steps) {
      s.markShown(t)
      // A wrong key at the first crossing (F, step 3).
      if (step === steps[3]) s.press(65 + 2, t + 100)
      t += 500
      s.press(step.notes[0].midi, t)
    }
    const { perCategory, scale } = scaleReport(steps, s.stepRecords, parts)
    expect(perCategory.map((c) => c.id)).toEqual(['part-0', 'crossings', 'evenness'])
    expect(perCategory[0]).toMatchObject({ shown: 15, firstTry: 14 })
    expect(perCategory[1]).toMatchObject({ shown: 2, firstTry: 1 })
    expect(scale.evenness).toBeCloseTo(1)
    expect(scale.meanIntervalMs).toBe(500)
  })

  it('measures unevenness as spread around the mean interval', () => {
    expect(evennessOf([500, 500, 500])).toBe(1)
    expect(evennessOf([400, 600, 400, 600])).toBeCloseTo(0.8)
    expect(evennessOf([500, 500])).toBeNull()
  })
})

describe('Gam Merdiveni plan', () => {
  it('puts one note per beat and both hands on the same beat', () => {
    const plan = ladderPlan([{ tonic: 'C', type: 'major', hands: 'parallel' }])
    expect(plan.skill.targets).toHaveLength(30)
    expect(plan.skill.targets.slice(0, 2).map((t) => [t.midi, t.beat])).toEqual([
      [60, 0],
      [48, 0],
    ])
    expect(plan.skill.targets[29]).toMatchObject({ beat: 14, value: 'h' })
    expect(plan.bars.flat()).toHaveLength(15)
  })

  it('judges two notes due together and reports the hands and their sync', () => {
    const parts = [{ tonic: 'C', type: 'major' as const, hands: 'parallel' as const }]
    const plan = ladderPlan(parts)
    const track = new BeatTrack(plan.skill, { bpm: 60, startAt: 0 })
    for (const r of track.records) {
      if (r.beat !== 0 && r.beat !== 1) continue
      // The left hand 30 ms after the right hand.
      const late = r.target < 60 || (r.beat === 1 && r.target === 50) ? 30 : 0
      expect(track.press(r.target, r.dueAt + late)[0].type).toBe('hit')
    }
    track.update(100_000)
    const report = ladderReport(track.records, plan.meta, parts)
    expect(report.sync).toMatchObject({ pairs: 2, together: 2, meanLeadMs: 30 })
    expect(report.hands?.map((h) => h.shown)).toEqual([15, 15])
    expect(report.perCategory[0].id).toBe('part-0')
  })
})
