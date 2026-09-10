import type { Role } from '@/lib/roles'
import type { Project } from '@/lib/projects'

/**
 * One role as a plain semantic document. Rendered standalone at
 * /experience/[slug] and reused inside a desktop window.
 *
 * `body` arrives pre-compiled from a Server Component, because MDXRemote
 * cannot run inside the client desktop tree.
 */
export function RoleArticle({
  role,
  projects,
  body,
  onOpenProject,
}: {
  role: Role
  /** The projects this role produced, already resolved from slugs. */
  projects: Project[]
  body: React.ReactNode
  /** Present only on the desktop, where a project opens as a window instead
      of navigating. Absent on the standalone route, which uses plain links. */
  onOpenProject?: (slug: string) => void
}) {
  return (
    <article className="mx-auto max-w-[70ch] px-4 py-8">
      <header className="border-b border-phosphor-lo pb-5">
        <h1 className="bloom font-display text-3xl leading-[1.1] tracking-tight text-phosphor md:text-4xl">
          {role.company}
        </h1>
        <p className="mt-3 leading-relaxed text-phosphor-dim">{role.summary}</p>
      </header>

      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 border-b border-phosphor-lo py-5 text-sm">
        <dt className="text-phosphor-dim">Title</dt>
        <dd>{role.title}</dd>
        <dt className="text-phosphor-dim">Dates</dt>
        <dd className="tabular-nums">{role.period}</dd>
        <dt className="text-phosphor-dim">Location</dt>
        <dd>{role.location}</dd>
      </dl>

      {projects.length > 0 && (
        <section className="border-b border-phosphor-lo py-5">
          <h2 className="text-sm text-phosphor-dim">Work from this role</h2>
          <ul className="mt-3 space-y-1">
            {projects.map((project) => (
              <li key={project.slug}>
                <a
                  href={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/projects/${project.slug}`}
                  onClick={
                    onOpenProject
                      ? (e) => {
                          if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
                          e.preventDefault()
                          onOpenProject(project.slug)
                        }
                      : undefined
                  }
                  className="text-phosphor underline underline-offset-4 transition-transform active:scale-[0.98]"
                >
                  {project.title}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="pt-2">{body}</div>
    </article>
  )
}
