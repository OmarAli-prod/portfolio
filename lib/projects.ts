import { access, readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import matter from 'gray-matter'
import { z } from 'zod'

const CONTENT_DIR = path.join(process.cwd(), 'content', 'projects')

// The dash ban is a project-wide rule. Enforcing it in the schema turns a
// style guideline into a build failure, which is cheaper than review attention.
export const noDashes = (label: string) =>
  z.string().refine((s) => !/[–—]/.test(s), {
    message: `${label} must not contain an em-dash or en-dash. Use a hyphen.`,
  })

const frontmatterSchema = z.object({
  title: noDashes('title'),
  slug: z.string().regex(/^[a-z0-9-]+$/, 'slug must be lowercase kebab-case'),
  year: z.number().int().min(2000).max(2100),
  // Display order, lowest first. Explicit rather than derived from `year`,
  // because the strongest work is not reliably the most recent: sorting by
  // date buried the flagship platform seventh in a list of nine.
  order: z.number().int(),
  role: noDashes('role'),
  stack: z.array(z.string()).min(1),
  summary: noDashes('summary').refine((s) => s.trim().split(/\s+/).length <= 25, {
    message: 'summary must be 25 words or fewer',
  }),
  links: z
    .object({ live: z.string().url().optional(), repo: z.string().url().optional() })
    .optional(),
  // Optional: a project with no screenshot yet renders a labelled placeholder
  // rather than a stock photo standing in for work that exists.
  cover: z.string().min(1).optional(),
  featured: z.boolean().default(false),
})

export type Project = z.infer<typeof frontmatterSchema> & { body: string }

export function parseProject(raw: string, filename: string): Project {
  const { data, content } = matter(raw)
  const parsed = frontmatterSchema.safeParse(data)

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('; ')
    throw new Error(`Invalid frontmatter in ${filename}: ${issues}`)
  }

  const expectedSlug = filename.replace(/\.mdx$/, '')
  if (parsed.data.slug !== expectedSlug) {
    throw new Error(
      `Frontmatter slug "${parsed.data.slug}" does not match filename "${filename}". ` +
        `Rename one so they agree.`,
    )
  }

  return { ...parsed.data, body: content }
}

/**
 * A local cover must resolve to a real file under public/. Without this check a
 * wrong path fails silently at runtime: the URL 404s and next/image answers 400,
 * which surfaces only in the browser console. Failing the build names the file.
 */
async function assertCoverExists(project: Project, filename: string) {
  if (!project.cover || project.cover.startsWith('http')) return
  const onDisk = path.join(process.cwd(), 'public', project.cover)
  try {
    await access(onDisk)
  } catch {
    throw new Error(
      `${filename}: cover "${project.cover}" does not exist at public${project.cover}. ` +
        `Images must live under public/; content/ is not served.`,
    )
  }
}

export async function getProjects(): Promise<Project[]> {
  const files = (await readdir(CONTENT_DIR)).filter((f) => f.endsWith('.mdx'))
  const projects = await Promise.all(
    files.map(async (f) => {
      const project = parseProject(await readFile(path.join(CONTENT_DIR, f), 'utf8'), f)
      await assertCoverExists(project, f)
      return project
    }),
  )
  return projects.sort((a, b) => a.order - b.order)
}
