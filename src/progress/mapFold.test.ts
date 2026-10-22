import { describe, expect, it } from 'vitest'
import { foldId, foldPath } from './mapFold'

const lessons = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((id) => ({ id }))
const shape = (items: ReturnType<typeof foldPath<{ id: string }>>) =>
  items
    .map((i) =>
      i.kind === 'node' ? i.lesson.id : i.kind === 'fold' ? `[${i.lessons.map((l) => l.id).join('')}]` : '^',
    )
    .join(' ')

describe('foldPath', () => {
  it('folds runs of three or more finished lessons', () => {
    const done = new Set(['a', 'b', 'c', 'e', 'f'])
    expect(
      shape(
        foldPath(
          lessons,
          (l) => done.has(l.id),
          () => false,
        ),
      ),
    ).toBe('[abc] d e f g')
  })

  it('never folds a kept lesson and splits the run around it', () => {
    const done = new Set(['a', 'b', 'c', 'd', 'e', 'f', 'g'])
    expect(
      shape(
        foldPath(
          lessons,
          (l) => done.has(l.id),
          (l) => l.id === 'd',
        ),
      ),
    ).toBe('[abc] d [efg]')
    expect(
      shape(
        foldPath(
          lessons,
          (l) => done.has(l.id),
          (l) => l.id === 'c',
        ),
      ),
    ).toBe('a b c [defg]')
  })

  it('shows the lessons of a fold the learner opened', () => {
    const done = () => true
    expect(shape(foldPath(lessons.slice(0, 4), done, () => false, new Set([foldId('a')])))).toBe('^ a b c d')
  })

  it('keeps the fold id when the run grows', () => {
    const items = foldPath(
      lessons.slice(0, 5),
      () => true,
      (l) => l.id === 'e',
    )
    expect(items[0]).toMatchObject({ kind: 'fold', id: 'fold-a' })
  })
})
