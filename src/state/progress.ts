import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

// Minimal progress for the prototype. Phase 2 replaces it with full
// XP / streak / lesson-map progress in IndexedDB.

interface LessonProgress {
  bestStars: number
  bestAccuracy: number
  plays: number
}

interface ProgressState {
  lessons: Record<string, LessonProgress>
  record: (lessonId: string, stars: number, accuracy: number) => void
}

export const useProgress = create<ProgressState>()(
  persist(
    (set) => ({
      lessons: {},
      record: (lessonId, stars, accuracy) =>
        set((s) => {
          const prev = s.lessons[lessonId] ?? { bestStars: 0, bestAccuracy: 0, plays: 0 }
          return {
            lessons: {
              ...s.lessons,
              [lessonId]: {
                bestStars: Math.max(prev.bestStars, stars),
                bestAccuracy: Math.max(prev.bestAccuracy, accuracy),
                plays: prev.plays + 1,
              },
            },
          }
        }),
    }),
    {
      name: 'dpo-progress',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ lessons: s.lessons }),
    },
  ),
)
