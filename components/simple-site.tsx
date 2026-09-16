'use client'

import { useEffect, useRef } from 'react'
import { motion } from 'motion/react'
import { Article, Monitor } from '@phosphor-icons/react'
import { BIO, EDUCATION, LINKS, SKILLS, TAGLINE, linkTarget } from '@/components/about-panel'
import { fly, type Mode } from '@/lib/mode'
import { projectId, roleId } from '@/lib/ids'
import type { Project } from '@/lib/projects'
import type { Role } from '@/lib/roles'

/** A piece with no twin on the desktop: fades in once its neighbours land. */
const appear = (i: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: 0.35 + i * 0.03, duration: 0.4 },
})

/** A piece that exists on the desktop too, and flies here from there. */
const piece = (id: string, i: number) => ({
  layoutId: id,
  layout: 'position' as const,
  transition: fly(i),
})

/**
 * Simple mode. The same content as the desktop, laid out as one scrolling
 * page. Every element that also exists on the desktop shares its layoutId, so
 * switching modes moves each one from where it was to where it belongs here.
 */
export function SimpleSite({
  roles,
  projects,
  bodies,
  onInterface,
}: {
  roles: Role[]
  projects: Project[]
  bodies: Record<string, React.ReactNode>
  onInterface: () => void
}) {
  const skillsAt = 4
  const rolesAt = skillsAt + SKILLS.length + 1 + LINKS.length + 1
  const projectsAt = rolesAt + roles.length + 1

  return (
    <div className="graticule hidden min-h-dvh lg:block">
      <motion.header
        {...piece('chrome-bar', 0)}
        className="sticky top-0 z-40 flex h-11 items-center gap-8 border-b border-phosphor-lo bg-bg-chrome px-6 text-xs"
      >
        <span className="bloom font-display text-sm tracking-wide text-phosphor">OMAR ALI</span>
        <nav className="flex gap-6 text-phosphor-dim">
          {['about', 'experience', 'projects'].map((s) => (
            <a key={s} href={`#${s}`} className="uppercase tracking-[0.2em] hover:text-phosphor">
              {s}
            </a>
          ))}
        </nav>
        <button
          type="button"
          onClick={onInterface}
          className="ml-auto flex items-center gap-2 border border-phosphor-lo px-3 py-1 tracking-[0.2em] text-phosphor-dim transition-transform hover:border-phosphor hover:text-phosphor active:scale-95"
        >
          <Monitor size={14} weight="light" aria-hidden="true" />
          INTERFACE MODE
        </button>
      </motion.header>

      <main className="mx-auto max-w-3xl px-6 pb-32">
        <section id="about" className="scroll-mt-16 pt-20">
          <motion.h1
            {...piece('about-name', 1)}
            className="bloom font-display text-5xl leading-none tracking-tight text-phosphor"
          >
            Omar Ali
          </motion.h1>
          <motion.p {...piece('about-tagline', 2)} className="mt-3 text-phosphor-dim">
            {TAGLINE}
          </motion.p>
          <motion.p
            {...piece('about-bio', 3)}
            className="mt-6 max-w-[62ch] text-base leading-relaxed text-phosphor-dim"
          >
            {BIO}
          </motion.p>

          <div className="mt-10 grid grid-cols-[1fr_auto] gap-10 border-t border-phosphor-lo pt-8 text-sm">
            <dl className="space-y-3">
              {SKILLS.map(([label, value], i) => (
                <motion.div key={label} {...piece(`skill-${label}`, skillsAt + i)}>
                  <dt className="text-xs text-phosphor-lo">{label}</dt>
                  <dd className="leading-snug text-phosphor-dim">{value}</dd>
                </motion.div>
              ))}
            </dl>

            <div className="space-y-6">
              <nav className="space-y-2">
                {LINKS.map(({ href, label, Icon }, i) => (
                  <motion.a
                    key={href}
                    {...piece(`link-${label}`, skillsAt + SKILLS.length + i)}
                    href={href}
                    {...linkTarget(href)}
                    className="flex items-center gap-2 text-phosphor-dim transition-transform hover:text-phosphor active:scale-[0.98]"
                  >
                    <Icon size={16} weight="light" aria-hidden="true" />
                    <span className="underline underline-offset-4">{label}</span>
                  </motion.a>
                ))}
              </nav>
              <motion.div
                {...piece('about-education', skillsAt + SKILLS.length + LINKS.length)}
                className="max-w-[32ch] border-t border-phosphor-lo pt-4"
              >
                <p className="text-xs text-phosphor-lo">Education</p>
                {EDUCATION.map((line) => (
                  <p key={line} className="mt-1 leading-snug text-phosphor-dim">
                    {line}
                  </p>
                ))}
              </motion.div>
            </div>
          </div>
        </section>

        <section id="experience" className="scroll-mt-16 pt-20">
          <Heading label="EXPERIENCE" i={rolesAt - 1} />
          <div className="mt-6 space-y-8">
            {roles.map((role, i) => (
              <Entry
                key={role.slug}
                id={roleId(role.slug)}
                i={rolesAt + i}
                title={role.company}
                meta={role.period}
                subtitle={`${role.title}, ${role.location}`}
                summary={role.summary}
                body={bodies[roleId(role.slug)]}
              />
            ))}
          </div>
        </section>

        <section id="projects" className="scroll-mt-16 pt-20">
          <Heading label="PROJECTS" i={projectsAt - 1} />
          <div className="mt-6 space-y-8">
            {projects.map((project, i) => (
              <Entry
                key={project.slug}
                id={projectId(project.slug)}
                i={projectsAt + i}
                title={project.title}
                meta={String(project.year)}
                subtitle={`${project.role}. ${project.stack.join(', ')}`}
                summary={project.summary}
                body={bodies[projectId(project.slug)]}
                links={Object.entries(project.links ?? {}).filter(
                  (e): e is [string, string] => Boolean(e[1]),
                )}
              />
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}

function Heading({ label, i }: { label: string; i: number }) {
  return (
    <motion.h2
      {...piece(`group-${label}`, i)}
      className="bloom font-display text-2xl tracking-[0.2em] text-phosphor"
    >
      {label}
    </motion.h2>
  )
}

function Entry({
  id,
  i,
  title,
  meta,
  subtitle,
  summary,
  body,
  links = [],
}: {
  id: string
  i: number
  title: string
  meta: string
  subtitle: string
  summary: string
  body: React.ReactNode
  links?: [string, string][]
}) {
  return (
    <article>
      {/* The header is the rail icon that flew here; the rest fades in under it. */}
      <motion.header
        {...piece(id, i)}
        className="flex items-baseline justify-between gap-4 border border-phosphor-lo bg-bg-chrome px-4 py-2"
      >
        <h3 className="bloom font-display text-lg leading-tight text-phosphor">{title}</h3>
        <span className="shrink-0 text-xs tabular-nums text-phosphor-lo">{meta}</span>
      </motion.header>
      <motion.div
        {...appear(i)}
        className="border-x border-b border-phosphor-lo bg-bg-raised px-4 py-4 text-sm"
      >
        <p className="text-xs text-phosphor-lo">{subtitle}</p>
        <p className="mt-2 leading-relaxed text-phosphor-dim">{summary}</p>
        <div className="mt-2">{body}</div>
        {links.length > 0 && (
          <nav className="mt-4 flex gap-6 border-t border-phosphor-lo pt-3">
            {links.map(([kind, href]) => (
              <a
                key={kind}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-phosphor underline underline-offset-4"
              >
                {kind === 'repo' ? 'Repository' : kind === 'live' ? 'Live site' : kind}
              </a>
            ))}
          </nav>
        )}
      </motion.div>
    </article>
  )
}

/**
 * Asked once per session, on wide screens, right after boot. Mounted under the
 * boot overlay (z-60 vs z-70), so it is simply revealed when boot ends. Focus
 * goes to the dialog, not a button, so the key that skips boot cannot also
 * pick a mode.
 */
export function ModeDialog({ onPick }: { onPick: (mode: Mode) => void }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    ref.current?.focus({ preventScroll: true })
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onPick('interface')
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onPick])

  const options = [
    {
      mode: 'interface' as const,
      Icon: Monitor,
      title: 'INTERFACE',
      text: 'The full desktop. Draggable windows, taskbar, sound.',
    },
    {
      mode: 'simple' as const,
      Icon: Article,
      title: 'SIMPLE',
      text: 'One scrolling page. Same content, nothing to operate.',
    },
  ]

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
      className="fixed inset-0 z-60 flex items-center justify-center bg-bg/80 p-6"
    >
      <motion.div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="mode-title"
        tabIndex={-1}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        transition={{ type: 'spring', stiffness: 420, damping: 36 }}
        className="w-full max-w-xl border border-phosphor-lo bg-bg-raised outline-none"
      >
        <div className="border-b border-phosphor-lo bg-bg-chrome px-3 py-1.5">
          <h2 id="mode-title" className="font-display text-sm tracking-wide text-phosphor-dim">
            SELECT MODE
          </h2>
        </div>
        <div className="p-5">
          <p className="bloom text-sm text-phosphor caret">How do you want to read this?</p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            {options.map(({ mode, Icon, title, text }) => (
              <button
                key={mode}
                type="button"
                onClick={() => onPick(mode)}
                className="group flex flex-col gap-3 border border-phosphor-lo p-4 text-left text-phosphor-dim transition-transform hover:border-phosphor hover:bg-bg-chrome hover:text-phosphor focus-visible:border-phosphor focus-visible:outline-none active:scale-[0.98]"
              >
                <Icon size={28} weight="light" aria-hidden="true" />
                <span className="font-display text-lg tracking-[0.2em]">{title}</span>
                <span className="text-xs leading-relaxed text-phosphor-lo group-hover:text-phosphor-dim">
                  {text}
                </span>
              </button>
            ))}
          </div>
          <p className="mt-4 text-xs text-phosphor-lo">Switch any time from the taskbar.</p>
        </div>
      </motion.div>
    </motion.div>
  )
}
