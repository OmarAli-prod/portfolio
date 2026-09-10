'use client'

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { AnimatePresence } from 'motion/react'
import { windowsReducer, initialWindowsState, focusedId } from '@/lib/windows'
import { createSfx, loadMuted, saveMuted } from '@/lib/sfx'
import { DesktopIcons, type IconGroup } from '@/components/desktop-icons'
import TerminalWindow from '@/components/window'
import { ProjectArticle } from '@/components/project-article'
import { RoleArticle } from '@/components/role-article'
import { Taskbar } from '@/components/taskbar'
import type { Project } from '@/lib/projects'
import type { Role } from '@/lib/roles'
import { projectId, roleId } from '@/lib/ids'

const MOBILE_BREAKPOINT = 768

export function Desktop({
  roles,
  projects,
  bodies,
  about,
}: {
  roles: Role[]
  projects: Project[]
  /** Compiled MDX bodies keyed by namespaced id. Compiled in a Server
      Component and passed in, because MDXRemote cannot run in a client tree. */
  bodies: Record<string, React.ReactNode>
  about: React.ReactNode
}) {
  const [state, dispatch] = useReducer(windowsReducer, initialWindowsState)
  const [isMobile, setIsMobile] = useState(false)
  const [muted, setMuted] = useState(true)
  const sfx = useRef<ReturnType<typeof createSfx> | null>(null)
  // Windows are bounded to the canvas, not the viewport, so they can never open
  // underneath the rail or the intro panel and become unreachable.
  const canvas = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const sync = () => setIsMobile(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    sfx.current = createSfx()
    const initial = loadMuted()
    setMuted(initial)
    sfx.current.setMuted(initial)
    return () => {
      sfx.current?.dispose()
      sfx.current = null
    }
  }, [])

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev
      sfx.current?.setMuted(next)
      saveMuted(next)
      return next
    })
  }, [])

  const open = useCallback((id: string) => {
    sfx.current?.play('open')
    const box = canvas.current?.getBoundingClientRect()
    dispatch({
      type: 'open',
      id,
      vw: box?.width ?? window.innerWidth,
      vh: box?.height ?? window.innerHeight,
    })
  }, [])

  const openProject = useCallback((slug: string) => open(projectId(slug)), [open])

  const close = useCallback((id: string) => {
    sfx.current?.play('close')
    dispatch({ type: 'close', id })
  }, [])

  const projectBySlug = useMemo(
    () => new Map(projects.map((p) => [p.slug, p])),
    [projects],
  )

  // One lookup for everything a window needs, keyed by namespaced id.
  const entries = useMemo(() => {
    const map = new Map<string, { title: string; render: () => React.ReactNode }>()

    for (const role of roles) {
      const id = roleId(role.slug)
      map.set(id, {
        title: role.company,
        render: () => (
          <RoleArticle
            role={role}
            projects={role.projects
              .map((slug) => projectBySlug.get(slug))
              .filter((p): p is Project => Boolean(p))}
            body={bodies[id]}
            onOpenProject={openProject}
          />
        ),
      })
    }

    for (const project of projects) {
      const id = projectId(project.slug)
      map.set(id, {
        title: project.title,
        render: () => <ProjectArticle project={project} body={bodies[id]} />,
      })
    }

    return map
  }, [roles, projects, bodies, projectBySlug, openProject])

  const groups: IconGroup[] = useMemo(
    () => [
      {
        label: 'EXPERIENCE',
        kind: 'role',
        items: roles.map((r) => ({
          id: roleId(r.slug),
          title: r.company,
          meta: r.period,
          href: `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/experience/${r.slug}`,
        })),
      },
      {
        label: 'PROJECTS',
        kind: 'project',
        items: projects.map((p) => ({
          id: projectId(p.slug),
          title: p.title,
          meta: String(p.year),
          href: `/projects/${p.slug}`,
        })),
      },
    ],
    [roles, projects],
  )

  const focused = focusedId(state)

  if (isMobile) {
    return (
      <main className="min-h-dvh">
        <div className="border-b border-phosphor-lo p-4">{about}</div>
        {[...entries.entries()].map(([id, entry]) => (
          <section key={id} className="border-b border-phosphor-lo">
            {entry.render()}
          </section>
        ))}
      </main>
    )
  }

  return (
    <main className="graticule flex h-dvh overflow-hidden pb-9">
      <nav
        aria-label="Experience and projects"
        className="w-48 shrink-0 overflow-y-auto border-r border-phosphor-lo"
      >
        <DesktopIcons groups={groups} onOpen={open} onSelect={() => sfx.current?.play('tick')} />
      </nav>

      <div ref={canvas} className="relative min-w-0 flex-1">
        <AnimatePresence>
          {state.windows
            .filter((w) => !w.minimized)
            .map((w) => {
              const entry = entries.get(w.id)
              if (!entry) return null
              return (
                <TerminalWindow
                  key={w.id}
                  state={w}
                  title={entry.title}
                  focused={focused === w.id}
                  onFocus={() => dispatch({ type: 'focus', id: w.id })}
                  onClose={() => close(w.id)}
                  onMinimize={() => dispatch({ type: 'minimize', id: w.id })}
                  onMove={(x, y) => dispatch({ type: 'move', id: w.id, x, y })}
                  onResize={(x, y, width, height) =>
                    dispatch({ type: 'resize', id: w.id, x, y, w: width, h: height })
                  }
                >
                  {entry.render()}
                </TerminalWindow>
              )
            })}
        </AnimatePresence>

        {state.windows.length === 0 && (
          <p className="pointer-events-none absolute inset-0 flex items-center justify-center px-8 text-center text-sm text-phosphor-lo">
            Select a role or project to open it.
          </p>
        )}
      </div>

      {/* Static: outside the window reducer, so nothing can be dragged over it. */}
      <div className="w-84 shrink-0 overflow-hidden p-3 xl:w-100">{about}</div>

      <Taskbar
        entries={state.windows.map((w) => ({
          id: w.id,
          title: entries.get(w.id)?.title ?? w.id,
          minimized: w.minimized,
        }))}
        focusedId={focused}
        onRestore={open}
        muted={muted}
        onToggleMute={toggleMute}
      />
    </main>
  )
}
