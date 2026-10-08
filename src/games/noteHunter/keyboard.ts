import { fitKeyboard } from '../../music/notes'
import { parseMelodies } from '../melody/session'
import type { NoteLesson } from './lessons'

/** A lesson before its on-screen keyboard is worked out. */
export type LessonDraft = Omit<NoteLesson, 'keyboard'>

/** Every key a lesson asks for: its notes, or the notes of its melodies. */
export const lessonNotes = (lesson: LessonDraft): number[] =>
  lesson.melodies ? parseMelodies(lesson.melodies).flatMap((s) => s.notes.map((n) => n.midi)) : lesson.notes

/** Give each lesson the smallest keyboard its notes need, starting on Do: one octave when they fit in one. */
export const withKeyboards = (lessons: LessonDraft[]): NoteLesson[] =>
  lessons.map((lesson) => ({ ...lesson, keyboard: fitKeyboard(lessonNotes(lesson), { fromDo: true }) }))
