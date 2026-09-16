'use client'

import { useEffect, useState } from 'react'
import { Article, SpeakerHigh, SpeakerSlash } from '@phosphor-icons/react'
import { motion } from 'motion/react'
import { fly } from '@/lib/mode'

export type TaskbarEntry = { id: string; title: string; minimized: boolean }

export function Taskbar({
  entries,
  focusedId,
  onRestore,
  muted,
  onToggleMute,
  onSimple,
}: {
  entries: TaskbarEntry[]
  focusedId: string | null
  onRestore: (id: string) => void
  muted: boolean
  onToggleMute: () => void
  onSimple: () => void
}) {
  const [clock, setClock] = useState('')

  // Renders empty on the server and fills in after mount, which avoids a
  // hydration mismatch between server time and client time.
  useEffect(() => {
    const tick = () =>
      setClock(
        new Date().toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }),
      )
    tick()
    const id = window.setInterval(tick, 30_000)
    return () => window.clearInterval(id)
  }, [])

  return (
    <motion.footer
      layoutId="chrome-bar"
      layout="position"
      transition={fly(0)}
      className="fixed inset-x-0 bottom-0 z-50 flex h-9 items-stretch border-t border-phosphor-lo bg-bg-chrome px-2 text-xs">
      <ul className="flex min-w-0 flex-1 items-stretch">
        {entries.map((entry) => (
          <li key={entry.id} className="min-w-0">
            <button
              type="button"
              aria-pressed={focusedId === entry.id}
              onClick={() => onRestore(entry.id)}
              className={`h-full max-w-40 truncate border-x px-3 transition-transform active:scale-[0.98] ${
                focusedId === entry.id
                  ? 'border-phosphor-lo bg-bg-raised text-phosphor'
                  : 'border-transparent text-phosphor-dim hover:text-phosphor'
              } ${entry.minimized ? 'italic' : ''}`}
            >
              {entry.title}
            </button>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={onSimple}
        className="flex items-center gap-2 px-3 tracking-[0.2em] text-phosphor-dim transition-transform hover:text-phosphor active:scale-95"
      >
        <Article size={15} weight="light" aria-hidden="true" />
        SIMPLE
      </button>

      <button
        type="button"
        onClick={onToggleMute}
        aria-label={muted ? 'Turn sound on' : 'Turn sound off'}
        className="px-3 text-phosphor-dim transition-transform hover:text-phosphor active:scale-95"
      >
        {muted ? (
          <SpeakerSlash size={15} weight="light" aria-hidden="true" />
        ) : (
          <SpeakerHigh size={15} weight="light" aria-hidden="true" />
        )}
      </button>

      <span className="flex items-center px-2 tabular-nums text-phosphor-dim">{clock}</span>
    </motion.footer>
  )
}
