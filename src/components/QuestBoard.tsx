import { useEffect } from 'react'
import { CHEST_XP, QUEST_XP, questDef, WEEKLY_XP, type QuestProgress } from '../progress/quests'
import { useProfile } from '../state/profile'

// The map's quest card: today's three quests, the chest they open together,
// and this week's challenge.

function QuestRow({ p, xp }: { p: QuestProgress; xp: number }) {
  const def = questDef(p.id)
  if (!def) return null
  return (
    <li className={`quest ${p.done ? 'done' : ''}`} data-quest={p.id}>
      <span className="quest-icon" aria-hidden>
        {p.done ? '✅' : def.icon}
      </span>
      <span className="quest-body">
        <span className="quest-title">{def.title}</span>
        <span className="quest-bar" aria-hidden>
          <span style={{ width: `${(p.progress / def.target) * 100}%` }} />
        </span>
      </span>
      <span className="quest-count">{p.done ? `+${xp}` : `${p.progress}/${def.target}`}</span>
    </li>
  )
}

export function QuestBoard() {
  const quests = useProfile((s) => s.quests)
  const weekly = useProfile((s) => s.weekly)
  const ensure = useProfile((s) => s.ensureQuests)
  useEffect(() => ensure(), [ensure])
  if (!quests || !weekly) return null
  const left = quests.quests.filter((q) => !q.done).length
  return (
    <section className="quest-board" aria-label="Görevler">
      <header>
        <h2>Bugünün görevleri</h2>
        <span className={`quest-chest ${quests.chest ? 'open' : ''}`} title={`Üç görev bitince +${CHEST_XP} XP`}>
          {quests.chest ? '🎁 Açıldı' : `🎁 ${left ? `${left} görev kaldı` : ''}`}
        </span>
      </header>
      <ul>
        {quests.quests.map((p) => (
          <QuestRow key={p.id} p={p} xp={QUEST_XP} />
        ))}
      </ul>
      <h3>Haftalık meydan okuma</h3>
      <ul>
        <QuestRow p={weekly.quest} xp={WEEKLY_XP} />
      </ul>
    </section>
  )
}
