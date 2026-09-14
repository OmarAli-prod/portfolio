import { GithubLogo, LinkedinLogo, EnvelopeSimple, Phone, FileText } from '@phosphor-icons/react/dist/ssr'

const SKILLS: [string, string][] = [
  ['Languages', 'C#, TypeScript, JavaScript, Go, Python, C++, SQL, Bash'],
  ['Frameworks', 'React, React Native, ASP.NET Core, EF Core, OpenCV, EasyOCR'],
  ['Architecture', 'REST, microservices, clean architecture, JWT, idempotency'],
  ['Data and cloud', 'SQL Server, Redis, MongoDB, GCP'],
  ['Ops', 'Docker, GitHub Actions, GitLab CI, Linux, Grafana, Prometheus'],
]

const LINKS = [
  // Absolute-looking but not external: prefixed so it resolves under the Pages basePath.
  { href: `${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/resume.pdf`, label: 'resume.pdf', Icon: FileText },
  { href: 'https://github.com/Indentationless', label: 'Indentationless', Icon: GithubLogo },
  {
    href: 'https://linkedin.com/in/omar-ali-ismail',
    label: 'omar-ali-ismail',
    Icon: LinkedinLogo,
  },
  { href: 'mailto:omar.a.e2004@gmail.com', label: 'omar.a.e2004@gmail.com', Icon: EnvelopeSimple },
  { href: 'tel:+201146565948', label: '+20 114 656 5948', Icon: Phone },
]

/**
 * The intro panel. Styled as a window but deliberately not one: it has no
 * controls, cannot be dragged, closed or minimized, and is never part of the
 * window reducer's state. It is the one fixed thing on the desktop.
 *
 * Server Component.
 */
export function AboutPanel() {
  return (
    <aside
      aria-label="About Omar Ali"
      className="flex h-full w-full flex-col border border-phosphor-lo bg-bg-raised"
    >
      {/* No window controls: this panel cannot be closed or minimized, so
          showing the glyphs would be an affordance that does nothing. */}
      <div className="flex shrink-0 items-center border-b border-phosphor-lo bg-bg-chrome px-3 py-1.5">
        <h2 className="font-display text-sm tracking-wide text-phosphor-dim">README</h2>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-4 text-sm">
        <h1 className="bloom font-display text-2xl leading-tight tracking-tight text-phosphor">
          Omar Ali
        </h1>
        <p className="mt-1 text-phosphor-dim">Full-stack engineer. Cairo, Egypt.</p>

        <p className="mt-4 leading-relaxed text-phosphor-dim">
          Two years shipping production systems in government, fintech and healthcare. From OCR
          pipelines processing government archives to payment infrastructure handling real
          transaction volume. Comfortable owning a feature end to end: schema, API, deployment,
          on-call.
        </p>

        <dl className="mt-5 space-y-2 border-t border-phosphor-lo pt-4">
          {SKILLS.map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs text-phosphor-lo">{label}</dt>
              <dd className="leading-snug text-phosphor-dim">{value}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-5 border-t border-phosphor-lo pt-4">
          <p className="text-xs text-phosphor-lo">Education</p>
          <p className="mt-1 leading-snug text-phosphor-dim">
            BSc Computational Sciences and Artificial Intelligence, Zewail City of Science and
            Technology. Expected June 2027.
          </p>
          <p className="mt-2 leading-snug text-phosphor-dim">
            4th place, university round, Egyptian Collegiate Programming Contest.
          </p>
        </div>

        <nav className="mt-5 space-y-2 border-t border-phosphor-lo pt-4">
          {LINKS.map(({ href, label, Icon }) => (
            <a
              key={href}
              href={href}
              target={href.startsWith('http') || href.endsWith('.pdf') ? '_blank' : undefined}
              rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
              className="flex items-center gap-2 text-phosphor-dim transition-transform hover:text-phosphor active:scale-[0.98]"
            >
              <Icon size={16} weight="light" aria-hidden="true" />
              <span className="truncate underline underline-offset-4">{label}</span>
            </a>
          ))}
        </nav>
      </div>
    </aside>
  )
}
