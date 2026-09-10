import { MDXRemote } from 'next-mdx-remote/rsc'
import type { ComponentProps } from 'react'

// ENDLESS is display-only, so headings inside a project body stay in the mono
// family. Only the project title itself uses the display face.
const components = {
  h2: (p: ComponentProps<'h2'>) => (
    <h2 {...p} className="mt-8 mb-2 text-base font-medium tracking-wide text-phosphor" />
  ),
  h3: (p: ComponentProps<'h3'>) => (
    <h3 {...p} className="mt-6 mb-2 text-sm font-medium tracking-wide text-phosphor" />
  ),
  p: (p: ComponentProps<'p'>) => (
    <p {...p} className="mt-4 max-w-[65ch] leading-relaxed text-phosphor-dim" />
  ),
  ul: (p: ComponentProps<'ul'>) => <ul {...p} className="mt-4 space-y-1 text-phosphor-dim" />,
  li: (p: ComponentProps<'li'>) => (
    <li {...p} className="before:mr-2 before:text-phosphor-lo before:content-['>']" />
  ),
  a: (p: ComponentProps<'a'>) => (
    <a {...p} className="text-phosphor underline underline-offset-4" />
  ),
  code: (p: ComponentProps<'code'>) => (
    <code {...p} className="bg-bg-chrome px-1 text-phosphor" />
  ),
  strong: (p: ComponentProps<'strong'>) => (
    <strong {...p} className="font-medium text-phosphor" />
  ),
}

/** Server Component. Compiles one project's MDX body. */
export function ProjectBody({ source }: { source: string }) {
  return <MDXRemote source={source} components={components} />
}
