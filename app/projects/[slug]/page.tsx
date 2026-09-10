import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { getProjects } from '@/lib/projects'
import { ProjectArticle } from '@/components/project-article'
import { ProjectBody } from '@/components/project-body'

export async function generateStaticParams() {
  return (await getProjects()).map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const project = (await getProjects()).find((p) => p.slug === slug)
  if (!project) return {}
  return {
    title: project.title,
    description: project.summary,
    openGraph: {
      title: project.title,
      description: project.summary,
      ...(project.cover ? { images: [project.cover] } : {}),
    },
  }
}

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const project = (await getProjects()).find((p) => p.slug === slug)
  if (!project) notFound()

  return (
    <main className="min-h-[100dvh]">
      <ProjectArticle project={project} body={<ProjectBody source={project.body} />} />
      <div className="mx-auto max-w-[70ch] px-4 pb-12">
        <Link href="/" className="text-sm text-phosphor-dim underline underline-offset-4 hover:text-phosphor">
          Back to desktop
        </Link>
      </div>
    </main>
  )
}
