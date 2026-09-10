import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { getRoles } from '@/lib/roles'
import { getProjects, type Project } from '@/lib/projects'
import { RoleArticle } from '@/components/role-article'
import { ProjectBody } from '@/components/project-body'

export async function generateStaticParams() {
  return (await getRoles()).map((r) => ({ slug: r.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const role = (await getRoles()).find((r) => r.slug === slug)
  if (!role) return {}
  return {
    title: `${role.title}, ${role.company}`,
    description: role.summary,
  }
}

export default async function ExperiencePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const [roles, projects] = await Promise.all([getRoles(), getProjects()])
  const role = roles.find((r) => r.slug === slug)
  if (!role) notFound()

  const bySlug = new Map(projects.map((p) => [p.slug, p]))
  const linked = role.projects
    .map((s) => bySlug.get(s))
    .filter((p): p is Project => Boolean(p))

  return (
    <main className="min-h-dvh">
      <RoleArticle role={role} projects={linked} body={<ProjectBody source={role.body} />} />
      <div className="mx-auto max-w-[70ch] px-4 pb-12">
        <Link
          href="/"
          className="text-sm text-phosphor-dim underline underline-offset-4 hover:text-phosphor"
        >
          Back to desktop
        </Link>
      </div>
    </main>
  )
}
