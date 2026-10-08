import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { NoteContext, TestNote } from './notes'

interface TestNotesState {
  notes: TestNote[]
  add: (text: string, context: NoteContext) => void
  remove: (id: string) => void
  clear: () => void
}

/** Notes written in test mode, kept on this device until they are copied and cleared. */
export const useTestNotes = create<TestNotesState>()(
  persist(
    (set) => ({
      notes: [],
      add: (text, context) =>
        set((s) => ({
          notes: [
            ...s.notes,
            { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, at: Date.now(), text, context },
          ],
        })),
      remove: (id) => set((s) => ({ notes: s.notes.filter((n) => n.id !== id) })),
      clear: () => set({ notes: [] }),
    }),
    {
      name: 'dpo-test-notes',
      storage: createJSONStorage(() => localStorage),
      partialize: ({ notes }) => ({ notes }),
    },
  ),
)
