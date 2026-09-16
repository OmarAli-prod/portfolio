'use client'

import { motion } from 'motion/react'
import { GithubLogo, LinkedinLogo, EnvelopeSimple, Phone, FileText } from '@phosphor-icons/react'
import { fly } from '@/lib/mode'

export const TAGLINE = 'Full-stack engineer. Cairo, Egypt.'

export const BIO =
  'Two years shipping production systems in government, fintech and healthcare. From OCR ' +
  'pipelines processing government archives to payment infrastructure handling real ' +
  'transaction volume. Comfortable owning a feature end to end: schema, API, deployment, on-call.'

export const EDUCATION = [
  'BSc Computational Sciences and Artificial Intelligence, Zewail City of Science and Technology. Expected June 2027.',
  '4th place, university round, Egyptian Collegiate Programming Contest.',
]

export const SKILLS: [string, string][] = [
  ['Languages', 'C#, TypeScript, JavaScript, Go, Python, C++, SQL, Bash'],
  ['Frameworks', 'React, React Native, ASP.NET Core, EF Core, OpenCV, EasyOCR'],
  ['Architecture', 'REST, microservices, clean architecture, JWT, idempotency'],
  ['Data and cloud', 'SQL Server, Redis, MongoDB, GCP'],
  ['Ops', 'Docker, GitHub Actions, GitLab CI, Linux, Grafana, Prometheus'],
]

export const LINKS = [
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

export const linkTarget = (href: string) => ({
  target: href.startsWith('http') || href.endsWith('.pdf') ? '_blank' : undefined,
  rel: href.startsWith('http') ? 'noopener noreferrer' : undefined,
})

/**
 * The intro panel. Styled as a window but deliberately not one: it has no
 * controls, cannot be dragged, closed or minimized, and is never part of the
 * window reducer's state. It is the one fixed thing on the desktop.
 *
 * `layout` tags each piece with a layoutId so it can fly into simple mode.
 * Only one mounted instance may carry them, so the phone layout leaves it off.
 */
export function AboutPanel({ layout = false }: { layout?: boolean }) {
  const piece = (id: string, i: number) =>
    layout ? { layoutId: id, layout: 'position' as const, transition: fly(i) } : {}

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
        <motion.h1
          {...piece('about-name', 0)}
          className="bloom font-display text-2xl leading-tight tracking-tight text-phosphor"
        >
          Omar Ali
        </motion.h1>
        <motion.p {...piece('about-tagline', 1)} className="mt-1 text-phosphor-dim">
          {TAGLINE}
        </motion.p>

        <motion.p {...piece('about-bio', 2)} className="mt-4 leading-relaxed text-phosphor-dim">
          {BIO}
        </motion.p>

        <dl className="mt-5 space-y-2 border-t border-phosphor-lo pt-4">
          {SKILLS.map(([label, value], i) => (
            <motion.div key={label} {...piece(`skill-${label}`, 3 + i)}>
              <dt className="text-xs text-phosphor-lo">{label}</dt>
              <dd className="leading-snug text-phosphor-dim">{value}</dd>
            </motion.div>
          ))}
        </dl>

        <motion.div {...piece('about-education', 8)} className="mt-5 border-t border-phosphor-lo pt-4">
          <p className="text-xs text-phosphor-lo">Education</p>
          {EDUCATION.map((line) => (
            <p key={line} className="mt-1 leading-snug text-phosphor-dim">
              {line}
            </p>
          ))}
        </motion.div>

        <nav className="mt-5 space-y-2 border-t border-phosphor-lo pt-4">
          {LINKS.map(({ href, label, Icon }, i) => (
            <motion.a
              key={href}
              {...piece(`link-${label}`, 9 + i)}
              href={href}
              {...linkTarget(href)}
              className="flex items-center gap-2 text-phosphor-dim transition-transform hover:text-phosphor active:scale-[0.98]"
            >
              <Icon size={16} weight="light" aria-hidden="true" />
              <span className="truncate underline underline-offset-4">{label}</span>
            </motion.a>
          ))}
        </nav>
      </div>
    </aside>
  )
}
