'use client'

import { useEffect, useRef, useState } from 'react'
import { Rnd } from 'react-rnd'
import { motion } from 'motion/react'
import { MIN_H, MIN_W, type WindowState } from '@/lib/windows'

export type WindowProps = {
  state: WindowState
  title: string
  focused: boolean
  onFocus: () => void
  onClose: () => void
  onMinimize: () => void
  onMove: (x: number, y: number) => void
  onResize: (x: number, y: number, w: number, h: number) => void
  children: React.ReactNode
}

export default function TerminalWindow({
  state,
  title,
  focused,
  onFocus,
  onClose,
  onMinimize,
  onMove,
  onResize,
  children,
}: WindowProps) {
  const ref = useRef<HTMLDivElement>(null)
  const titleId = `window-title-${state.id}`
  // True only while a drag or resize is in flight. Used to drop the effects
  // that force a full repaint on every frame: the bloom text-shadow, the focus
  // glow, and subpixel text rasterization on a fractional transform.
  const [busy, setBusy] = useState(false)

  // Escape closes the focused window. Bound at document level so it works
  // wherever focus sits inside the window.
  useEffect(() => {
    if (!focused) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [focused, onClose])

  // Move DOM focus into a newly focused window so keyboard users land inside it.
  useEffect(() => {
    if (focused) ref.current?.focus({ preventScroll: true })
  }, [focused])

  return (
    <Rnd
      size={{ width: state.w, height: state.h }}
      position={{ x: state.x, y: state.y }}
      minWidth={MIN_W}
      minHeight={MIN_H}
      bounds="parent"
      dragHandleClassName="window-drag-handle"
      style={{ zIndex: state.z }}
      onDragStart={() => {
        setBusy(true)
        onFocus()
      }}
      onDragStop={(_e, d) => {
        setBusy(false)
        // Round to whole pixels: a fractional transform makes text
        // re-rasterize with different subpixel antialiasing and shimmer.
        onMove(Math.round(d.x), Math.round(d.y))
      }}
      onResizeStart={() => {
        setBusy(true)
        onFocus()
      }}
      onResizeStop={(_e, _dir, el, _delta, pos) => {
        setBusy(false)
        onResize(Math.round(pos.x), Math.round(pos.y), el.offsetWidth, el.offsetHeight)
      }}
    >
      <motion.div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-labelledby={titleId}
        // Keeps a screen reader from wandering through a stack of dialogs.
        aria-hidden={focused ? undefined : 'true'}
        onMouseDown={onFocus}
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
        className={`window-frame flex h-full w-full flex-col border bg-bg-raised outline-none ${
          busy ? 'is-busy' : ''
        } ${
          focused && !busy
            ? 'border-phosphor shadow-[0_0_0_1px_var(--color-phosphor-lo)]'
            : focused
              ? 'border-phosphor'
              : 'border-phosphor-lo'
        }`}
      >
        <div
          className={`window-drag-handle flex shrink-0 cursor-move items-center justify-between gap-2 border-b bg-bg-chrome px-3 py-1.5 ${
            focused ? 'border-phosphor-lo' : 'border-transparent'
          }`}
        >
          {/* Not a heading: the article inside starts at h1, so a titlebar
              heading would both precede it and collide with the body's h2s.
              aria-labelledby names the dialog from any element. */}
          <span
            id={titleId}
            className={`truncate font-display text-sm tracking-wide ${
              focused ? 'bloom text-phosphor' : 'text-phosphor-dim'
            }`}
          >
            {title}
          </span>

          <div className="flex shrink-0 items-center">
            <button
              type="button"
              aria-label={`Minimize ${title}`}
              onClick={onMinimize}
              className="px-2 leading-none text-phosphor-dim transition-transform hover:text-phosphor active:scale-95"
            >
              _
            </button>
            <button
              type="button"
              aria-label={`Close ${title}`}
              onClick={onClose}
              className="px-2 leading-none text-phosphor-dim transition-transform hover:text-danger active:scale-95"
            >
              X
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto">{children}</div>
      </motion.div>
    </Rnd>
  )
}
