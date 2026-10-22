/** Art arda bitmiş dersler: this many finished lessons in a row fold into one capsule on the map. */
export const FOLD_MIN = 3

export type PathItem<T> =
  | { kind: 'node'; lesson: T }
  | { kind: 'fold'; id: string; lessons: T[] }
  /** An opened fold: its lessons follow, and this item folds them again. */
  | { kind: 'unfolded'; id: string; lessons: T[] }

/**
 * The path of an unfinished unit with every run of at least `FOLD_MIN` finished lessons folded into one item.
 * A lesson that must stay in sight (`keep`: the current one, the one just played) is never folded and splits
 * the run it is in; a fold the learner opened (`opened`, by its id) shows its lessons again after an `unfolded` item.
 */
export function foldPath<T extends { id: string }>(
  lessons: T[],
  done: (lesson: T) => boolean,
  keep: (lesson: T) => boolean,
  opened: ReadonlySet<string> = new Set(),
): PathItem<T>[] {
  const items: PathItem<T>[] = []
  let run: T[] = []
  const flush = () => {
    const id = run.length ? foldId(run[0].id) : ''
    if (run.length >= FOLD_MIN && !opened.has(id)) items.push({ kind: 'fold', id, lessons: run })
    else {
      if (run.length >= FOLD_MIN) items.push({ kind: 'unfolded', id, lessons: run })
      run.forEach((lesson) => items.push({ kind: 'node', lesson }))
    }
    run = []
  }
  for (const lesson of lessons) {
    if (done(lesson) && !keep(lesson)) run.push(lesson)
    else {
      flush()
      items.push({ kind: 'node', lesson })
    }
  }
  flush()
  return items
}

/** A fold is named after its first lesson, so it stays the same fold while lessons after it get stars. */
export function foldId(firstLessonId: string) {
  return `fold-${firstLessonId}`
}
