import { useEffect, useState } from 'react'
import { CHEST_XP } from '../progress/quests'
import { useMidi } from '../midi/midiStore'
import { useProfile } from '../state/profile'
import { MidiPanel } from './MidiPanel'
import { QuestBoard } from './QuestBoard'
import { Sheet } from './Sheet'
import { Icon } from './icons/Icon'

/** Two short cards under the greeting; the quest board and the MIDI panel open from them as sheets. */
export function HomeShortcuts({ onSetup }: { onSetup?: () => void }) {
  const quests = useProfile((s) => s.quests)
  const weekly = useProfile((s) => s.weekly)
  const ensure = useProfile((s) => s.ensureQuests)
  const { status, devices } = useMidi()
  const [open, setOpen] = useState<'quests' | 'midi' | null>(null)
  useEffect(() => ensure(), [ensure])

  const all = quests ? [...quests.quests, ...(weekly ? [weekly.quest] : [])] : []
  const done = quests ? quests.quests.filter((q) => q.done).length : 0
  const total = quests ? quests.quests.length : 0
  const connected = status === 'ready' && devices.length > 0
  const midiLine = connected
    ? devices.map((d) => d.keyboard?.name ?? d.name).join(', ')
    : status === 'unsupported'
      ? 'Ekran klavyesi'
      : 'Bağlı değil'
  const tone = connected ? 'ok' : status === 'ready' || status === 'denied' ? 'warn' : 'off'

  return (
    <>
      <div className="shortcuts">
        <button className="shortcut" data-shortcut="quests" onClick={() => setOpen('quests')}>
          <span className="shortcut-icon" aria-hidden>
            <Icon name={quests?.chest ? 'chest' : 'quests'} size={34} />
          </span>
          <span className="shortcut-body">
            <b>Görevler</b>
            <span>{all.length ? `${done}/${total} bugün` : '…'}</span>
          </span>
        </button>
        <button className={`shortcut midi-${tone}`} data-shortcut="midi" onClick={() => setOpen('midi')}>
          <span className="shortcut-icon" aria-hidden>
            <Icon name="keyboard" size={34} />
          </span>
          <span className="shortcut-body">
            <b>Klavye</b>
            <span className="shortcut-state">
              <i className="midi-dot" aria-hidden />
              {midiLine}
            </span>
          </span>
        </button>
      </div>
      {open === 'quests' && (
        <Sheet title="Görevler" onClose={() => setOpen(null)}>
          <p className="muted small">Üç görev bitince +{CHEST_XP} XP sandık açılır.</p>
          <QuestBoard />
        </Sheet>
      )}
      {open === 'midi' && (
        <Sheet title="Klavye bağlantısı" onClose={() => setOpen(null)}>
          <MidiPanel onSetup={onSetup} />
        </Sheet>
      )}
    </>
  )
}
