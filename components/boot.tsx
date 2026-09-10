'use client'

import { useCallback, useEffect, useState } from 'react'

const LINES = [
  'POST .............. OK',
  'MEMORY ............ OK',
  'MOUNTING /projects  OK',
  'READY.',
]

const LINE_MS = 260
const SESSION_KEY = 'crt-portfolio-booted'

type Phase = 'pending' | 'running' | 'done'

export function Boot() {
  const [phase, setPhase] = useState<Phase>('pending')
  const [shown, setShown] = useState(0)

  const finish = useCallback(() => {
    try {
      sessionStorage.setItem(SESSION_KEY, '1')
    } catch {
      // A replayed boot sequence is cosmetic, not a broken page.
    }
    setPhase('done')
  }, [])

  // Decide whether to play at all. Runs once, after hydration.
  useEffect(() => {
    let booted = false
    try {
      booted = sessionStorage.getItem(SESSION_KEY) === '1'
    } catch {
      booted = false
    }

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    setPhase(booted || reduced ? 'done' : 'running')
  }, [])

  // Drive the lines and listen for a skip. Only while actually running.
  useEffect(() => {
    if (phase !== 'running') return

    let settle: number | undefined
    const interval = window.setInterval(() => {
      setShown((n) => {
        if (n + 1 >= LINES.length) {
          window.clearInterval(interval)
          settle = window.setTimeout(finish, LINE_MS * 2)
        }
        return n + 1
      })
    }, LINE_MS)

    const skip = () => finish()
    window.addEventListener('keydown', skip)
    window.addEventListener('pointerdown', skip)

    return () => {
      window.clearInterval(interval)
      if (settle !== undefined) window.clearTimeout(settle)
      window.removeEventListener('keydown', skip)
      window.removeEventListener('pointerdown', skip)
    }
  }, [phase, finish])

  if (phase !== 'running') return null

  return (
    <div
      data-testid="boot"
      aria-hidden="true"
      onClick={finish}
      className="fixed inset-0 z-70 flex flex-col justify-end bg-bg p-8 font-mono text-sm text-phosphor"
    >
      {LINES.slice(0, shown + 1).map((line, i) => (
        <p key={line} className={i === shown ? 'bloom caret' : 'bloom'}>
          {line}
        </p>
      ))}
      <p className="mt-6 text-xs text-phosphor-dim">press any key to skip</p>
    </div>
  )
}
