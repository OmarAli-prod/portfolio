'use client'

import { useRef, useState } from 'react'
import { Briefcase, FolderOpen } from '@phosphor-icons/react'

export type IconItem = {
  /** Namespaced window id, e.g. "role/innova" or "project/sukuk-donations". */
  id: string
  title: string
  /** Secondary line: a year for projects, a date range for roles. */
  meta: string
  /** Real route, so the rail is a list of working links without JavaScript. */
  href: string
}

export type IconGroup = {
  label: string
  kind: 'role' | 'project'
  items: IconItem[]
}

/**
 * The rail. Each icon is a real anchor to its own route, so with JavaScript
 * disabled the desktop degrades to a plain list of links. With JavaScript the
 * click is intercepted and a window opens instead.
 *
 * Groups are labelled but the roving tabindex runs across all items in order,
 * so arrow keys traverse the whole rail rather than trapping inside a group.
 */
export function DesktopIcons({
  groups,
  onOpen,
  onSelect,
}: {
  groups: IconGroup[]
  onOpen: (id: string) => void
  onSelect?: () => void
}) {
  const [selected, setSelected] = useState(0)
  const refs = useRef<(HTMLAnchorElement | null)[]>([])

  const flat = groups.flatMap((g) => g.items)

  if (flat.length === 0) {
    return (
      <p className="max-w-[60ch] p-4 text-sm leading-relaxed text-phosphor-dim">
        Nothing to show. Add an MDX file to{' '}
        <code className="text-phosphor">content/projects/</code> or{' '}
        <code className="text-phosphor">content/roles/</code>, then reload.
      </p>
    )
  }

  const move = (delta: number) => {
    const next = (selected + delta + flat.length) % flat.length
    setSelected(next)
    refs.current[next]?.focus()
    onSelect?.()
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    const deltas: Record<string, number> = {
      ArrowRight: 1,
      ArrowDown: 1,
      ArrowLeft: -1,
      ArrowUp: -1,
    }
    const delta = deltas[e.key]
    if (delta === undefined) return
    e.preventDefault()
    move(delta)
  }

  // Running index across groups, so the roving tabindex stays continuous.
  let index = -1

  return (
    <div onKeyDown={onKeyDown}>
      {groups.map((group) => {
        const Icon = group.kind === 'role' ? Briefcase : FolderOpen
        return (
          <section key={group.label} className="border-b border-phosphor-lo py-2 last:border-b-0">
            <h2 className="px-3 py-1 text-[0.7rem] tracking-[0.2em] text-phosphor-lo">
              {group.label}
            </h2>
            <ul className="flex flex-col">
              {group.items.map((item) => {
                index += 1
                const i = index
                return (
                  <li key={item.id}>
                    <a
                      ref={(el) => {
                        refs.current[i] = el
                      }}
                      href={item.href}
                      tabIndex={i === selected ? 0 : -1}
                      onFocus={() => setSelected(i)}
                      onClick={(e) => {
                        // Let modified clicks (new tab, download) behave normally.
                        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
                        e.preventDefault()
                        onOpen(item.id)
                      }}
                      className="flex w-full items-start gap-2 p-2 text-left text-phosphor-dim transition-transform hover:bg-bg-raised hover:text-phosphor focus-visible:bg-bg-raised focus-visible:text-phosphor focus-visible:outline-1 focus-visible:outline-phosphor active:scale-[0.98]"
                    >
                      <Icon size={18} weight="light" aria-hidden="true" className="mt-0.5 shrink-0" />
                      <span className="min-w-0">
                        <span className="block font-display text-sm leading-tight">
                          {item.title}
                        </span>
                        <span
                          className="block text-xs tabular-nums text-phosphor-lo"
                          aria-hidden="true"
                        >
                          {item.meta}
                        </span>
                      </span>
                    </a>
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
