import Image from 'next/image'
import { ArrowSquareOut } from '@phosphor-icons/react/dist/ssr'
import type { Project } from '@/lib/projects'

const LINK_LABEL: Record<string, string> = {
  live: 'Live site',
  repo: 'Repository',
}

export function ProjectArticle({
  project,
  body,
}: {
  project: Project
  body: React.ReactNode
}) {
  const links = Object.entries(project.links ?? {}).filter(([, href]) => Boolean(href)) as [
    string,
    string,
  ][]

  return (
    <article className="mx-auto max-w-[70ch] px-4 py-8">
      <header className="border-b border-phosphor-lo pb-5">
        <h1 className="bloom font-display text-3xl leading-[1.1] tracking-tight text-phosphor md:text-4xl">
          {project.title}
        </h1>
        <p className="mt-3 leading-relaxed text-phosphor-dim">{project.summary}</p>
      </header>

      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 border-b border-phosphor-lo py-5 text-sm">
        <dt className="text-phosphor-dim">Year</dt>
        <dd className="tabular-nums">{project.year}</dd>
        <dt className="text-phosphor-dim">Role</dt>
        <dd>{project.role}</dd>
        <dt className="text-phosphor-dim">Stack</dt>
        <dd className="flex flex-wrap gap-x-3 gap-y-1">
          {project.stack.map((tech) => (
            <span key={tech}>{tech}</span>
          ))}
        </dd>
      </dl>

      {project.cover ? (
        /* Duotone: desaturate, then push the remaining tone to the phosphor hue
           so a screenshot reads as terminal-native rather than pasted in. */
        <Image
          src={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}${project.cover}`}
          alt={`Screenshot of ${project.title}`}
          width={1280}
          height={800}
          priority
          unoptimized={project.cover.startsWith('http')}
          className="my-6 w-full border border-phosphor-lo [filter:grayscale(1)_sepia(1)_hue-rotate(-14deg)_saturate(2.6)_contrast(1.1)_brightness(0.85)]"
        />
      ) : (
        <div
          role="img"
          aria-label={`No screenshot available yet for ${project.title}`}
          className="my-6 flex aspect-[16/10] w-full flex-col items-center justify-center gap-1 border border-dashed border-phosphor-lo bg-bg text-phosphor-dim"
        >
          <span className="font-display text-lg tracking-[0.3em]">NO SIGNAL</span>
          <span className="text-xs text-phosphor-lo">screenshot pending</span>
        </div>
      )}

      {body}

      {links.length > 0 && (
        <nav className="mt-8 flex flex-wrap gap-6 border-t border-phosphor-lo pt-5">
          {links.map(([kind, href]) => (
            <a
              key={kind}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-phosphor underline underline-offset-4 transition-transform active:scale-[0.98]"
            >
              {LINK_LABEL[kind] ?? kind}
              <ArrowSquareOut weight="light" aria-hidden="true" />
            </a>
          ))}
        </nav>
      )}
    </article>
  )
}
