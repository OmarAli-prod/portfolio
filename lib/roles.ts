import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import matter from 'gray-matter'
import { z } from 'zod'
import { noDashes } from '@/lib/projects'

const CONTENT_DIR = path.join(process.cwd(), 'content', 'roles')

const frontmatterSchema = z.object({
  company: noDashes('company'),
  slug: z.string().regex(/^[a-z0-9-]+$/, 'slug must be lowercase kebab-case'),
  title: noDashes('title'),
  // YYYY-MM. Sorted on, and rendered as written in `period`.
  start: z.string().regex(/^\d{4}-\d{2}$/, 'start must be YYYY-MM'),
  // Display order. Explicit rather than derived from `start`, because the
  // current primary role leads even when a later side role started after it.
  order: z.number().int(),
  period: noDashes('period'),
  location: noDashes('location'),
  summary: noDashes('summary').refine((s) => s.trim().split(/\s+/).length <= 30, {
    message: 'summary must be 30 words or fewer',
  }),
  // Slugs of projects that came out of this role. Rendered as links, and
  // validated against the real project list at build time by getRoles.
  projects: z.array(z.string()).default([]),
})

export type Role = z.infer<typeof frontmatterSchema> & { body: string }

export function parseRole(raw: string, filename: string): Role {
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

/** Ordered by the explicit `order` field, lowest first. */
export async function getRoles(): Promise<Role[]> {
  const files = (await readdir(CONTENT_DIR)).filter((f) => f.endsWith('.mdx'))
  const roles = await Promise.all(
    files.map(async (f) => parseRole(await readFile(path.join(CONTENT_DIR, f), 'utf8'), f)),
  )
  return roles.sort((a, b) => a.order - b.order)
}
