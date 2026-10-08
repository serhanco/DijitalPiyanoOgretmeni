import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { NoteContext, TestNote } from './notes'
import { clearShots, deleteShot } from './shots'

interface TestNotesState {
  notes: TestNote[]
  /** Returns the new note's id (the key of its screenshot). */
  add: (text: string, context: NoteContext, shot?: boolean) => string
  remove: (id: string) => void
  clear: () => void
}

/** Notes written in test mode, kept on this device until they are copied and cleared. */
export const useTestNotes = create<TestNotesState>()(
  persist(
    (set) => ({
      notes: [],
      add: (text, context, shot = false) => {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
        set((s) => ({ notes: [...s.notes, { id, at: Date.now(), text, context, ...(shot && { shot }) }] }))
        return id
      },
      remove: (id) => {
        void deleteShot(id).catch(() => undefined)
        set((s) => ({ notes: s.notes.filter((n) => n.id !== id) }))
      },
      clear: () => {
        void clearShots().catch(() => undefined)
        set({ notes: [] })
      },
    }),
    {
      name: 'dpo-test-notes',
      storage: createJSONStorage(() => localStorage),
      partialize: ({ notes }) => ({ notes }),
    },
  ),
)
