'use client'

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { AnimatePresence, MotionConfig, MotionGlobalConfig, motion } from 'motion/react'
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
import { AboutPanel } from '@/components/about-panel'
import { ModeDialog, SimpleSite } from '@/components/simple-site'
import { loadMode, saveMode, type Mode } from '@/lib/mode'

export function Desktop({
  roles,
  projects,
  bodies,
}: {
  roles: Role[]
  projects: Project[]
  /** Compiled MDX bodies keyed by namespaced id. Compiled in a Server
      Component and passed in, because MDXRemote cannot run in a client tree. */
  bodies: Record<string, React.ReactNode>
}) {
  const [state, dispatch] = useReducer(windowsReducer, initialWindowsState)
  // Below lg the desktop becomes a single column and a window is a full-screen
  // sheet. Its id lives in the URL hash, so the back button closes it and
  // /#project/slug deep-links straight to one.
  const [sheetId, setSheetId] = useState<string | null>(null)
  const sheet = useRef<HTMLDivElement>(null)
  const [muted, setMuted] = useState(true)
  const sfx = useRef<ReturnType<typeof createSfx> | null>(null)
  // Windows are bounded to the canvas, not the viewport, so they can never open
  // underneath the rail or the intro panel and become unreachable.
  const canvas = useRef<HTMLDivElement>(null)

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

  // Simple mode is a wide-screen choice: below lg the layout is already one column.
  const [mode, setMode] = useState<Mode>('interface')
  const [asking, setAsking] = useState(false)
  // The dialog powers on when boot ends; under the boot overlay nobody sees it.
  const [booted, setBooted] = useState(false)

  useEffect(() => {
    const done = () => setBooted(true)
    window.addEventListener('boot:done', done)
    return () => window.removeEventListener('boot:done', done)
  }, [])

  useEffect(() => {
    if (!window.matchMedia('(min-width: 64rem)').matches) return
    const stored = loadMode()
    if (!stored) return setAsking(true)
    if (stored === 'interface') return
    // Restoring on reload should land, not replay the construction.
    MotionGlobalConfig.instantAnimations = true
    setMode(stored)
    requestAnimationFrame(() =>
      requestAnimationFrame(() => (MotionGlobalConfig.instantAnimations = false)),
    )
  }, [])

  const pickMode = useCallback((next: Mode) => {
    saveMode(next)
    setAsking(false)
    sfx.current?.play('open')
    // Pieces fly from where they are on screen, so start from the top.
    window.scrollTo(0, 0)
    setMode(next)
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

  const openSheet = useCallback((id: string) => {
    // Marked, so closing knows this entry is ours to pop rather than the
    // visitor's landing page.
    history.pushState({ sheet: true }, '', `#${id}`)
    setSheetId(id)
  }, [])

  const closeSheet = useCallback(() => {
    if (history.state?.sheet) return history.back()
    history.replaceState(null, '', location.pathname + location.search)
    setSheetId(null)
  }, [])

  const openProject = useCallback(
    (slug: string) =>
      window.matchMedia('(min-width: 64rem)').matches
        ? open(projectId(slug))
        : openSheet(projectId(slug)),
    [open, openSheet],
  )

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
          href: `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/projects/${p.slug}`,
        })),
      },
    ],
    [roles, projects],
  )

  const focused = focusedId(state)

  useEffect(() => {
    const sync = () => {
      const id = decodeURIComponent(location.hash.slice(1))
      setSheetId(entries.has(id) ? id : null)
    }
    sync()
    window.addEventListener('popstate', sync)
    return () => window.removeEventListener('popstate', sync)
  }, [entries])

  useEffect(() => {
    if (!sheetId) return
    sheet.current?.focus({ preventScroll: true })
    sheet.current?.scrollTo(0, 0)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeSheet()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [sheetId, closeSheet])

  const sheetEntry = sheetId ? entries.get(sheetId) : undefined

  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence>{asking && booted && <ModeDialog onPick={pickMode} />}</AnimatePresence>

      {/* Both layouts are in the markup and CSS picks one, so a phone never
          flashes the desktop before hydration. */}
      <main className="graticule grid min-h-dvh content-start gap-3 p-3 md:grid-cols-2 md:items-start lg:hidden" inert={Boolean(sheetEntry)}>
        <AboutPanel />

        <nav
          aria-label="Experience and projects"
          className="border border-phosphor-lo bg-bg-raised"
        >
          <div className="border-b border-phosphor-lo bg-bg-chrome px-3 py-1.5">
            <h2 className="font-display text-sm tracking-wide text-phosphor-dim">INDEX</h2>
          </div>
          <DesktopIcons groups={groups} onOpen={openSheet} />
        </nav>
      </main>

      <AnimatePresence>
        {sheetEntry && (
          <motion.div
            key={sheetId}
            ref={sheet}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="sheet-title"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ type: 'spring', stiffness: 420, damping: 36 }}
            className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-bg-raised outline-none lg:hidden"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-phosphor-lo bg-bg-chrome pl-4">
              <span id="sheet-title" className="bloom truncate font-display text-sm tracking-wide text-phosphor">
                {sheetEntry.title}
              </span>
              <button
                type="button"
                aria-label={`Close ${sheetEntry.title}`}
                onClick={closeSheet}
                className="size-11 shrink-0 text-phosphor-dim transition-transform hover:text-danger active:scale-95"
              >
                X
              </button>
            </div>
            {sheetEntry.render()}
          </motion.div>
        )}
      </AnimatePresence>

      {mode === 'simple' ? (
        <SimpleSite
          roles={roles}
          projects={projects}
          bodies={bodies}
          onInterface={() => pickMode('interface')}
        />
      ) : (
        <main className="graticule hidden h-dvh overflow-hidden pb-9 lg:flex">
          <nav
            aria-label="Experience and projects"
            className="w-48 shrink-0 overflow-y-auto border-r border-phosphor-lo"
          >
            <DesktopIcons layout groups={groups} onOpen={open} onSelect={() => sfx.current?.play('tick')} />
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
          <div className="w-84 shrink-0 overflow-hidden p-3 xl:w-100">
            <AboutPanel layout />
          </div>

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
            onSimple={() => pickMode('simple')}
          />
        </main>
      )}
    </MotionConfig>
  )
}
