# CRT Desktop Portfolio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a developer portfolio presented as an immersive-sim CRT terminal desktop, where project showcases open as draggable, resizable, minimizable windows over a plain semantic fallback.

**Architecture:** Next.js App Router with Server Components reading MDX at build time. A single client boundary (`<Desktop>`) owns all window state through one reducer. `react-rnd` provides drag and resize geometry only; z-order, focus, minimize and the taskbar are ours. Every project also exists as an ordinary semantic route, so the site degrades to a readable document without JavaScript.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind v4, `motion/react`, `react-rnd`, `next-mdx-remote`, `zod`, `gray-matter`, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-07-crt-desktop-portfolio-design.md`

## Global Constraints

These apply to every task. Do not restate them per task; do not violate them.

- **Radius is 0 everywhere.** No `rounded-*` classes. Ever.
- **One accent color.** `--phosphor` (`#ffb000`). The only exception is `--danger` (`#ff5f45`), used solely for the close-button hover and error states.
- **Dark only.** No `dark:` variants, no `prefers-color-scheme` branching. `color-scheme: dark` is declared once in `globals.css`.
- **ENDLESS is display-only, ASCII-only, single weight.** Never apply `font-weight` other than 400 to it. Never place a non-ASCII character (typographic quotes, accents, ellipsis, arrows) in ENDLESS text. `font-synthesis: none` is global.
- **Zero em-dashes (`—`) and en-dashes (`–`) in any user-visible string,** including code comments that become visible copy. Use `-`.
- **No `window.addEventListener('scroll')`.** Use `IntersectionObserver`, `useScroll` from `motion/react`, or CSS.
- **Every `useEffect` that starts an animation, timer, listener, or AudioContext returns a cleanup function.**
- **Icons come from `@phosphor-icons/react` only,** `weight="light"`. Never hand-roll an SVG path. Window control glyphs (`_`, `[]`, `X`) are text, not icons, and each carries an `aria-label`.
- **No card containers.** Windows are the only containers. Content inside them is separated by hairlines (`--phosphor-lo`) and space.
- **`--phosphor-lo` is a hairline color only.** It never renders text.
- **Viewport height uses `min-h-[100dvh]`,** never `h-screen`.
- **Commit after every task.** Conventional Commits format.

---

## File Structure

| File | Responsibility |
|---|---|
| `app/layout.tsx` | Font loading, theme lock, CRT overlay mount, metadata |
| `app/globals.css` | Design tokens, CRT effects, reduced-motion overrides |
| `app/page.tsx` | RSC: read projects, render `<Desktop>` |
| `app/projects/[slug]/page.tsx` | Semantic per-project document (SEO, no-JS, screen readers) |
| `lib/projects.ts` | MDX discovery, frontmatter parse, zod validation |
| `lib/windows.ts` | Window reducer, types, geometry helpers |
| `lib/sfx.ts` | WebAudio blip synthesis and mute state |
| `components/desktop.tsx` | Client boundary, window manager root |
| `components/desktop-icons.tsx` | Icon grid with roving-tabindex keyboard nav |
| `components/window.tsx` | `Rnd` wrapper, titlebar, controls, focus trap |
| `components/window-body.tsx` | Project content rendering inside a window |
| `components/taskbar.tsx` | Minimized windows, clock, sound toggle |
| `components/boot.tsx` | Skippable boot sequence |
| `components/crt-overlay.tsx` | Scanline and vignette layer |
| `content/projects/*.mdx` | Project source, one file per project |

---

### Task 1: Project scaffold, design tokens, and fonts

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `vitest.config.ts`, `.gitignore`
- Create: `app/layout.tsx`, `app/globals.css`, `app/page.tsx`
- Create: `public/fonts/endless.woff2` (converted), `public/fonts/*.woff2` (IBM Plex Mono)
- Test: `tests/tokens.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: the `--phosphor*` / `--bg*` CSS custom properties, the `font-display` / `font-mono` Tailwind families, and a working `npm test` / `npm run build`.

- [ ] **Step 1: Scaffold Next.js**

The `public/fonts/endless.ttf` file already exists in the repo. Scaffold around it without deleting it.

```bash
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir --import-alias "@/*" --eslint --no-turbopack
```

If the CLI refuses because the directory is not empty, answer yes to proceed; it preserves untracked files it does not own. Verify afterwards that `public/fonts/endless.ttf` and `docs/` still exist.

- [ ] **Step 2: Install dependencies**

```bash
npm install react-rnd motion next-mdx-remote gray-matter zod @phosphor-icons/react
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @playwright/test
```

`react-rnd` must be v10.5.0 or newer for React 19 compatibility. Verify:

```bash
node -p "require('./package.json').dependencies['react-rnd']"
```

- [ ] **Step 3: Convert ENDLESS to woff2**

This exact command is verified working on this machine.

```bash
python3 -c "
from fontTools.ttLib import TTFont
f = TTFont('public/fonts/endless.ttf')
f.flavor = 'woff2'
f.save('public/fonts/endless.woff2')
print('wrote public/fonts/endless.woff2')
"
```

Expected: `endless.woff2` at roughly 9.5 KB. If `fontTools` is missing, `pip install fonttools brotli` first.

Then download IBM Plex Mono weights 400, 500 and 600 as woff2 into `public/fonts/`. Fontsource is the simplest source:

```bash
npm install @fontsource/ibm-plex-mono
cp node_modules/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-{400,500,600}-normal.woff2 public/fonts/
npm uninstall @fontsource/ibm-plex-mono
```

The package is removed after copying because the fonts are self-hosted through `next/font/local`, not imported as a dependency.

- [ ] **Step 4: Write the failing test**

This test locks the token contract so later tasks cannot silently rename a color or introduce a second accent.

```ts
// tests/tokens.test.ts
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

const css = readFileSync('app/globals.css', 'utf8')

describe('design tokens', () => {
  it('defines every token the spec requires', () => {
    const tokens = {
      '--color-bg': '#0a0908',
      '--color-bg-raised': '#12100e',
      '--color-bg-chrome': '#1a1714',
      '--color-phosphor': '#ffb000',
      '--color-phosphor-dim': '#b37a00',
      '--color-phosphor-lo': '#6b4a00',
      '--color-danger': '#ff5f45',
    }
    for (const [name, value] of Object.entries(tokens)) {
      expect(css).toContain(`${name}: ${value}`)
    }
  })

  it('locks the theme to dark', () => {
    expect(css).toContain('color-scheme: dark')
    expect(css).not.toContain('prefers-color-scheme')
  })

  it('disables font synthesis so ENDLESS is never faux-bolded', () => {
    expect(css).toContain('font-synthesis: none')
  })

  it('introduces no accent beyond phosphor and danger', () => {
    // Any six-digit hex in the stylesheet must be one of the approved tokens.
    const approved = new Set([
      '#0a0908', '#12100e', '#1a1714',
      '#ffb000', '#b37a00', '#6b4a00',
      '#ff5f45',
    ])
    const hexes = css.match(/#[0-9a-f]{6}\b/gi) ?? []
    const strays = hexes.map((h) => h.toLowerCase()).filter((h) => !approved.has(h))
    expect(strays).toEqual([])
  })

  it('uses no border radius', () => {
    expect(css).not.toMatch(/border-radius:\s*(?!0)/)
  })
})
```

- [ ] **Step 5: Run the test to verify it fails**

Create `vitest.config.ts` first:

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
  },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./', import.meta.url)) },
  },
})
```

```ts
// tests/setup.ts
import '@testing-library/jest-dom/vitest'
```

Add to `package.json` scripts: `"test": "vitest run"`, `"test:watch": "vitest"`.

Run: `npm test -- tests/tokens.test.ts`
Expected: FAIL, because `globals.css` still holds the create-next-app defaults.

- [ ] **Step 6: Write `app/globals.css`**

```css
@import "tailwindcss";

@theme {
  --color-bg: #0a0908;
  --color-bg-raised: #12100e;
  --color-bg-chrome: #1a1714;
  --color-phosphor: #ffb000;
  --color-phosphor-dim: #b37a00;
  --color-phosphor-lo: #6b4a00;
  --color-danger: #ff5f45;

  --font-display: var(--font-endless), ui-sans-serif, system-ui, sans-serif;
  --font-mono: var(--font-plex-mono), ui-monospace, "SF Mono", monospace;

  --radius-none: 0;
}

:root {
  color-scheme: dark;
}

* {
  border-radius: 0;
}

html {
  background: var(--color-bg);
  color: var(--color-phosphor);
  font-family: var(--font-mono);
  font-synthesis: none;
  -webkit-font-smoothing: antialiased;
}

body {
  margin: 0;
  min-height: 100dvh;
}

/* Phosphor bloom. Applied only to display type and accent glyphs, never to
   body copy at small sizes where it costs legibility. */
.bloom {
  text-shadow:
    0 0 1px currentColor,
    0 0 8px color-mix(in srgb, currentColor 45%, transparent);
}

/* Scanline drift. The one purely decorative animation, and the first thing
   cut under reduced motion. */
@keyframes scanline-drift {
  from { transform: translateY(0); }
  to   { transform: translateY(4px); }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

Note for the implementer: the `* { border-radius: 0 }` reset is the shape lock made mechanical rather than a rule people have to remember.

- [ ] **Step 7: Write `app/layout.tsx`**

```tsx
import type { Metadata } from 'next'
import localFont from 'next/font/local'
import './globals.css'

const endless = localFont({
  src: '../public/fonts/endless.woff2',
  variable: '--font-endless',
  display: 'swap',
  // ENDLESS is ASCII-only, so the fallback carries anything outside it.
  fallback: ['ui-sans-serif', 'system-ui', 'sans-serif'],
})

const plexMono = localFont({
  src: [
    { path: '../public/fonts/ibm-plex-mono-latin-400-normal.woff2', weight: '400' },
    { path: '../public/fonts/ibm-plex-mono-latin-500-normal.woff2', weight: '500' },
    { path: '../public/fonts/ibm-plex-mono-latin-600-normal.woff2', weight: '600' },
  ],
  variable: '--font-plex-mono',
  display: 'swap',
  fallback: ['ui-monospace', 'SF Mono', 'monospace'],
})

export const metadata: Metadata = {
  title: 'Portfolio',
  description: 'Selected work.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${endless.variable} ${plexMono.variable}`}>
      <body>{children}</body>
    </html>
  )
}
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `npm test -- tests/tokens.test.ts`
Expected: PASS, 5 tests.

Then confirm the app builds and the fonts resolve:

Run: `npm run build`
Expected: build succeeds with no font-resolution errors.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js app with CRT design tokens and self-hosted fonts"
```

---

### Task 2: Project content loading and validation

**Files:**
- Create: `lib/projects.ts`
- Create: `content/projects/aurora-ledger.mdx`, `content/projects/tidewater.mdx`, `content/projects/nine-lives.mdx`
- Test: `tests/projects.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:
  - `projectSchema: ZodSchema<Project>`
  - `type Project = { title: string; slug: string; year: number; role: string; stack: string[]; summary: string; links?: { live?: string; repo?: string }; cover: string; featured: boolean; body: string }`
  - `parseProject(raw: string, filename: string): Project` - pure, throws on invalid input
  - `getProjects(): Promise<Project[]>` - reads `content/projects/*.mdx`, sorted newest year first

- [ ] **Step 1: Write the failing test**

```ts
// tests/projects.test.ts
import { describe, it, expect } from 'vitest'
import { parseProject } from '@/lib/projects'

const valid = `---
title: Aurora Ledger
slug: aurora-ledger
year: 2025
role: Solo engineer
stack: [TypeScript, Postgres, Fly.io]
summary: A double-entry ledger that reconciles itself nightly.
cover: /projects/aurora-ledger.png
featured: true
links:
  repo: https://github.com/example/aurora-ledger
---

Body copy here.
`

describe('parseProject', () => {
  it('parses valid frontmatter and returns the body', () => {
    const p = parseProject(valid, 'aurora-ledger.mdx')
    expect(p.title).toBe('Aurora Ledger')
    expect(p.year).toBe(2025)
    expect(p.stack).toEqual(['TypeScript', 'Postgres', 'Fly.io'])
    expect(p.featured).toBe(true)
    expect(p.links?.repo).toBe('https://github.com/example/aurora-ledger')
    expect(p.body.trim()).toBe('Body copy here.')
  })

  it('defaults featured to false when absent', () => {
    const without = valid.replace('featured: true\n', '')
    expect(parseProject(without, 'aurora-ledger.mdx').featured).toBe(false)
  })

  it('rejects a slug that does not match the filename', () => {
    expect(() => parseProject(valid, 'something-else.mdx')).toThrow(/slug/i)
  })

  it('rejects missing required fields', () => {
    const missing = valid.replace('role: Solo engineer\n', '')
    expect(() => parseProject(missing, 'aurora-ledger.mdx')).toThrow()
  })

  it('rejects a summary longer than 25 words', () => {
    const long = valid.replace(
      'summary: A double-entry ledger that reconciles itself nightly.',
      `summary: ${Array(30).fill('word').join(' ')}`,
    )
    expect(() => parseProject(long, 'aurora-ledger.mdx')).toThrow(/25 words/i)
  })

  it('rejects an em-dash anywhere in the frontmatter copy', () => {
    const dashed = valid.replace(
      'summary: A double-entry ledger that reconciles itself nightly.',
      'summary: A ledger — it reconciles itself.',
    )
    expect(() => parseProject(dashed, 'aurora-ledger.mdx')).toThrow(/dash/i)
  })
})
```

The em-dash test matters because the ban is a project-wide rule that is
otherwise enforced only by human attention. Making the build fail is
cheaper than reviewing every string.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- tests/projects.test.ts`
Expected: FAIL with "Failed to resolve import @/lib/projects".

- [ ] **Step 3: Write `lib/projects.ts`**

```ts
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import matter from 'gray-matter'
import { z } from 'zod'

const CONTENT_DIR = path.join(process.cwd(), 'content', 'projects')

// The dash ban is a global constraint. Enforcing it in the schema turns a
// style rule into a build failure.
const noDashes = (label: string) =>
  z.string().refine((s) => !/[–—]/.test(s), {
    message: `${label} must not contain an em-dash or en-dash. Use a hyphen.`,
  })

const frontmatterSchema = z.object({
  title: noDashes('title'),
  slug: z.string().regex(/^[a-z0-9-]+$/, 'slug must be lowercase kebab-case'),
  year: z.number().int().min(2000).max(2100),
  role: noDashes('role'),
  stack: z.array(z.string()).min(1),
  summary: noDashes('summary').refine(
    (s) => s.trim().split(/\s+/).length <= 25,
    { message: 'summary must be 25 words or fewer' },
  ),
  links: z
    .object({ live: z.string().url().optional(), repo: z.string().url().optional() })
    .optional(),
  cover: z.string().min(1),
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

export async function getProjects(): Promise<Project[]> {
  const files = (await readdir(CONTENT_DIR)).filter((f) => f.endsWith('.mdx'))
  const projects = await Promise.all(
    files.map(async (f) => parseProject(await readFile(path.join(CONTENT_DIR, f), 'utf8'), f)),
  )
  return projects.sort((a, b) => b.year - a.year || a.title.localeCompare(b.title))
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- tests/projects.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Write three real project files**

The desktop needs at least three windows to be judged honestly; two looks
unfinished. Write `content/projects/aurora-ledger.mdx`,
`content/projects/tidewater.mdx` and `content/projects/nine-lives.mdx`.
Replace the names, copy and stacks with the portfolio owner's actual
projects; the structure below is the contract, not the content.

```mdx
---
title: Aurora Ledger
slug: aurora-ledger
year: 2025
role: Solo engineer
stack: [TypeScript, Postgres, Fly.io]
summary: A double-entry ledger that reconciles itself nightly and refuses to drift.
cover: https://picsum.photos/seed/aurora-ledger/1280/800
featured: true
links:
  repo: https://github.com/example/aurora-ledger
---

{/* TODO: real screenshot, 1280x800, replace the picsum cover above */}

Every accounting bug I have ever chased came from the same place: a balance
that was computed twice and stored once. Aurora Ledger stores the entries
and computes nothing twice.

## What it does

Records immutable double-entry transactions, derives balances on read, and
runs a nightly reconciliation that fails loudly rather than papering over a
mismatch.

## What was hard

Getting reconciliation to be both correct and fast enough to finish inside
the nightly window, without holding a lock across the whole table.
```

Each of the other two files follows the same shape with `featured: false`.
Every `cover` that is still a picsum URL keeps its `{/* TODO: real
screenshot */}` marker directly above it, so the placeholders are greppable.

- [ ] **Step 6: Verify the real content parses**

```bash
npx tsx -e "import('./lib/projects.ts').then(m => m.getProjects()).then(p => console.log(p.map(x => x.slug)))"
```

Expected: the three slugs printed, newest year first. If `tsx` is not
installed, run `npx tsx` and accept the prompt.

- [ ] **Step 7: Commit**

```bash
git add lib/projects.ts tests/projects.test.ts content/
git commit -m "feat: add MDX project loading with schema validation"
```

---

### Task 3: Window state reducer

This is the core of the application. Every rule here is a rule the spec
names in section 4.4, and every one has a test.

**Files:**
- Create: `lib/windows.ts`
- Test: `tests/windows.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type WindowState = { id: string; x: number; y: number; w: number; h: number; z: number; minimized: boolean }`
  - `type WindowsState = { windows: WindowState[]; counter: number }`
  - `type WindowAction` (the union below)
  - `initialWindowsState: WindowsState`
  - `windowsReducer(state: WindowsState, action: WindowAction): WindowsState`
  - `focusedId(state: WindowsState): string | null`
  - `clampToViewport(w: {x,y,w,h}, vw: number, vh: number): {x,y,w,h}`

- [ ] **Step 1: Write the failing test**

```ts
// tests/windows.test.ts
import { describe, it, expect } from 'vitest'
import {
  windowsReducer as reduce,
  initialWindowsState,
  focusedId,
  clampToViewport,
  type WindowsState,
} from '@/lib/windows'

const VIEWPORT = { vw: 1440, vh: 900 }
const open = (s: WindowsState, id: string) =>
  reduce(s, { type: 'open', id, ...VIEWPORT })

describe('windowsReducer', () => {
  it('opens a window and focuses it', () => {
    const s = open(initialWindowsState, 'a')
    expect(s.windows).toHaveLength(1)
    expect(focusedId(s)).toBe('a')
  })

  it('gives each new window the highest z', () => {
    let s = open(initialWindowsState, 'a')
    s = open(s, 'b')
    expect(focusedId(s)).toBe('b')
    const [a, b] = ['a', 'b'].map((id) => s.windows.find((w) => w.id === id)!)
    expect(b.z).toBeGreaterThan(a.z)
  })

  it('focuses an already-open window instead of duplicating it', () => {
    let s = open(initialWindowsState, 'a')
    s = open(s, 'b')
    s = open(s, 'a')
    expect(s.windows).toHaveLength(2)
    expect(focusedId(s)).toBe('a')
  })

  it('restores and focuses a minimized window when it is opened again', () => {
    let s = open(initialWindowsState, 'a')
    s = open(s, 'b')
    s = reduce(s, { type: 'minimize', id: 'a' })
    s = open(s, 'a')
    expect(s.windows.find((w) => w.id === 'a')!.minimized).toBe(false)
    expect(focusedId(s)).toBe('a')
  })

  it('cascades new windows so they do not stack exactly', () => {
    let s = open(initialWindowsState, 'a')
    s = open(s, 'b')
    const [a, b] = ['a', 'b'].map((id) => s.windows.find((w) => w.id === id)!)
    expect(b.x).not.toBe(a.x)
    expect(b.y).not.toBe(a.y)
  })

  it('moves focus to the next-highest window when the focused one closes', () => {
    let s = open(initialWindowsState, 'a')
    s = open(s, 'b')
    s = open(s, 'c')
    s = reduce(s, { type: 'close', id: 'c' })
    expect(focusedId(s)).toBe('b')
    expect(s.windows).toHaveLength(2)
  })

  it('moves focus to the next-highest window when the focused one minimizes', () => {
    let s = open(initialWindowsState, 'a')
    s = open(s, 'b')
    s = reduce(s, { type: 'minimize', id: 'b' })
    expect(focusedId(s)).toBe('a')
  })

  it('never focuses a minimized window', () => {
    let s = open(initialWindowsState, 'a')
    s = reduce(s, { type: 'minimize', id: 'a' })
    expect(focusedId(s)).toBeNull()
  })

  it('returns null focus when nothing is open', () => {
    expect(focusedId(initialWindowsState)).toBeNull()
  })

  it('ignores actions for unknown ids rather than throwing', () => {
    const s = reduce(initialWindowsState, { type: 'close', id: 'ghost' })
    expect(s).toEqual(initialWindowsState)
  })

  it('records moves and resizes', () => {
    let s = open(initialWindowsState, 'a')
    s = reduce(s, { type: 'move', id: 'a', x: 300, y: 120 })
    expect(s.windows[0]).toMatchObject({ x: 300, y: 120 })
    s = reduce(s, { type: 'resize', id: 'a', x: 10, y: 20, w: 500, h: 400 })
    expect(s.windows[0]).toMatchObject({ x: 10, y: 20, w: 500, h: 400 })
  })
})

describe('clampToViewport', () => {
  it('pulls a window back when it would open past the right edge', () => {
    const r = clampToViewport({ x: 1400, y: 100, w: 600, h: 400 }, 1440, 900)
    expect(r.x + r.w).toBeLessThanOrEqual(1440)
  })

  it('pulls a window back when it would open past the bottom edge', () => {
    const r = clampToViewport({ x: 100, y: 880, w: 600, h: 400 }, 1440, 900)
    expect(r.y + r.h).toBeLessThanOrEqual(900)
  })

  it('never produces negative coordinates', () => {
    const r = clampToViewport({ x: -200, y: -80, w: 600, h: 400 }, 1440, 900)
    expect(r.x).toBeGreaterThanOrEqual(0)
    expect(r.y).toBeGreaterThanOrEqual(0)
  })

  it('shrinks a window that is larger than the viewport', () => {
    const r = clampToViewport({ x: 0, y: 0, w: 2000, h: 1600 }, 1440, 900)
    expect(r.w).toBeLessThanOrEqual(1440)
    expect(r.h).toBeLessThanOrEqual(900)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- tests/windows.test.ts`
Expected: FAIL with "Failed to resolve import @/lib/windows".

- [ ] **Step 3: Write `lib/windows.ts`**

```ts
export type WindowState = {
  id: string
  x: number
  y: number
  w: number
  h: number
  z: number
  minimized: boolean
}

export type WindowsState = {
  windows: WindowState[]
  counter: number
}

export type WindowAction =
  | { type: 'open'; id: string; vw: number; vh: number }
  | { type: 'close'; id: string }
  | { type: 'focus'; id: string }
  | { type: 'minimize'; id: string }
  | { type: 'restore'; id: string }
  | { type: 'move'; id: string; x: number; y: number }
  | { type: 'resize'; id: string; x: number; y: number; w: number; h: number }

export const initialWindowsState: WindowsState = { windows: [], counter: 0 }

const DEFAULT_W = 640
const DEFAULT_H = 480
const MIN_W = 320
const MIN_H = 240
const CASCADE = 28
const TASKBAR_H = 36

export function clampToViewport(
  r: { x: number; y: number; w: number; h: number },
  vw: number,
  vh: number,
) {
  const w = Math.min(r.w, vw)
  const h = Math.min(r.h, vh)
  return {
    w,
    h,
    x: Math.max(0, Math.min(r.x, vw - w)),
    y: Math.max(0, Math.min(r.y, vh - h)),
  }
}

/** The focused window is the visible window with the highest z, or null. */
export function focusedId(state: WindowsState): string | null {
  const visible = state.windows.filter((w) => !w.minimized)
  if (visible.length === 0) return null
  return visible.reduce((top, w) => (w.z > top.z ? w : top)).id
}

const patch = (
  state: WindowsState,
  id: string,
  fn: (w: WindowState) => WindowState,
): WindowsState => {
  if (!state.windows.some((w) => w.id === id)) return state
  return { ...state, windows: state.windows.map((w) => (w.id === id ? fn(w) : w)) }
}

export function windowsReducer(state: WindowsState, action: WindowAction): WindowsState {
  switch (action.type) {
    case 'open': {
      const existing = state.windows.find((w) => w.id === action.id)
      const z = state.counter + 1

      // Opening an open window focuses it; opening a minimized one restores it.
      if (existing) {
        return {
          counter: z,
          windows: state.windows.map((w) =>
            w.id === action.id ? { ...w, minimized: false, z } : w,
          ),
        }
      }

      const n = state.windows.length
      const geometry = clampToViewport(
        {
          x: 64 + n * CASCADE,
          y: 48 + n * CASCADE,
          w: DEFAULT_W,
          h: DEFAULT_H,
        },
        action.vw,
        action.vh - TASKBAR_H,
      )

      return {
        counter: z,
        windows: [...state.windows, { id: action.id, ...geometry, z, minimized: false }],
      }
    }

    case 'close':
      if (!state.windows.some((w) => w.id === action.id)) return state
      return { ...state, windows: state.windows.filter((w) => w.id !== action.id) }

    case 'focus': {
      const z = state.counter + 1
      const next = patch(state, action.id, (w) => ({ ...w, z, minimized: false }))
      return next === state ? state : { ...next, counter: z }
    }

    case 'minimize':
      return patch(state, action.id, (w) => ({ ...w, minimized: true }))

    case 'restore': {
      const z = state.counter + 1
      const next = patch(state, action.id, (w) => ({ ...w, minimized: false, z }))
      return next === state ? state : { ...next, counter: z }
    }

    case 'move':
      return patch(state, action.id, (w) => ({ ...w, x: action.x, y: action.y }))

    case 'resize':
      return patch(state, action.id, (w) => ({
        ...w,
        x: action.x,
        y: action.y,
        w: Math.max(MIN_W, action.w),
        h: Math.max(MIN_H, action.h),
      }))
  }
}
```

Note that `close` and `minimize` need no explicit focus-transfer logic:
`focusedId` derives focus from z-order over visible windows, so removing or
hiding the top window promotes the next one automatically. Deriving focus
rather than storing it removes an entire class of desynchronization bug.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- tests/windows.test.ts`
Expected: PASS, 15 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/windows.ts tests/windows.test.ts
git commit -m "feat: add window state reducer with derived focus and viewport clamping"
```

---

### Task 4: The semantic project route

Built before the desktop deliberately. This route is what search engines,
screen readers and no-JS visitors receive, so it is the real portfolio; the
desktop is an enhancement layered on top. Building it first keeps that
priority honest.

**Files:**
- Create: `app/projects/[slug]/page.tsx`
- Create: `components/project-article.tsx`
- Create: `components/project-body.tsx`
- Test: `tests/project-article.test.tsx`

**Interfaces:**
- Consumes: `getProjects`, `Project` from `lib/projects`.
- Produces: `<ProjectArticle project={project} body={ReactNode}>` - renders one project as a semantic document. Reused inside window bodies in Task 6.

**Why `body` is a prop rather than compiled inside:** MDX compiles through
`MDXRemote` from `next-mdx-remote/rsc`, which is a Server Component and
cannot render inside the client `<Desktop>` tree of Task 6. So the MDX is
compiled in a Server Component and the resulting element is passed down as
a prop. Next.js permits server-rendered elements to cross a client boundary
as `children` or props; it does not permit calling a Server Component from
client code. `ProjectArticle` itself stays agnostic: it renders whatever
node it is handed, which also makes it trivial to test with a plain string.

- [ ] **Step 1: Write the failing test**

```tsx
// tests/project-article.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProjectArticle } from '@/components/project-article'
import type { Project } from '@/lib/projects'

const project: Project = {
  title: 'Aurora Ledger',
  slug: 'aurora-ledger',
  year: 2025,
  role: 'Solo engineer',
  stack: ['TypeScript', 'Postgres'],
  summary: 'A double-entry ledger that reconciles itself nightly.',
  cover: '/cover.png',
  featured: true,
  links: { repo: 'https://github.com/example/aurora-ledger' },
  body: 'Body copy.',
}

describe('ProjectArticle', () => {
  it('renders the title as a heading', () => {
    render(<ProjectArticle project={project} body={null} />)
    expect(screen.getByRole('heading', { name: 'Aurora Ledger' })).toBeInTheDocument()
  })

  it('renders the cover image with meaningful alt text', () => {
    render(<ProjectArticle project={project} body={null} />)
    const img = screen.getByRole('img')
    expect(img).toHaveAttribute('alt', expect.stringContaining('Aurora Ledger'))
  })

  it('lists every stack entry', () => {
    render(<ProjectArticle project={project} body={null} />)
    for (const tech of project.stack) {
      expect(screen.getByText(tech)).toBeInTheDocument()
    }
  })

  it('renders external links with a discernible name', () => {
    render(<ProjectArticle project={project} body={null} />)
    const link = screen.getByRole('link', { name: /repository/i })
    expect(link).toHaveAttribute('href', project.links!.repo)
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'))
  })

  it('omits the links region entirely when there are no links', () => {
    render(<ProjectArticle project={{ ...project, links: undefined }} body={null} />)
    expect(screen.queryByRole('link')).toBeNull()
  })

  it('renders whatever body node it is handed', () => {
    render(<ProjectArticle project={project} body={<p>Compiled body.</p>} />)
    expect(screen.getByText('Compiled body.')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- tests/project-article.test.tsx`
Expected: FAIL, cannot resolve `@/components/project-article`.

- [ ] **Step 3: Write `components/project-article.tsx`**

```tsx
import Image from 'next/image'
import { ArrowSquareOut } from '@phosphor-icons/react/dist/ssr'
import type { Project } from '@/lib/projects'

/**
 * One project as a plain semantic document. Rendered standalone at
 * /projects/[slug] and reused inside a desktop window. Carries no window
 * chrome and no client interactivity of its own.
 *
 * `body` arrives pre-compiled from a Server Component rather than being
 * compiled here, because MDXRemote cannot run inside the client desktop tree.
 */
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

  const linkLabel: Record<string, string> = {
    live: 'Live site',
    repo: 'Repository',
  }

  return (
    <article className="mx-auto max-w-[70ch] px-4 py-10">
      <header className="border-b border-[--color-phosphor-lo] pb-6">
        <h1 className="bloom font-[family-name:var(--font-display)] text-4xl md:text-5xl leading-[1.1] text-[--color-phosphor]">
          {project.title}
        </h1>
        <p className="mt-4 text-[--color-phosphor-dim] leading-relaxed">{project.summary}</p>
      </header>

      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 border-b border-[--color-phosphor-lo] py-6 text-sm">
        <dt className="text-[--color-phosphor-dim]">Year</dt>
        <dd className="tabular-nums">{project.year}</dd>
        <dt className="text-[--color-phosphor-dim]">Role</dt>
        <dd>{project.role}</dd>
        <dt className="text-[--color-phosphor-dim]">Stack</dt>
        <dd className="flex flex-wrap gap-x-3 gap-y-1">
          {project.stack.map((tech) => (
            <span key={tech}>{tech}</span>
          ))}
        </dd>
      </dl>

      <Image
        src={project.cover}
        alt={`Screenshot of ${project.title}`}
        width={1280}
        height={800}
        priority
        className="my-6 w-full grayscale contrast-125 sepia [filter:grayscale(1)_sepia(1)_hue-rotate(-14deg)_saturate(2.4)_contrast(1.15)]"
      />

      <div className="prose-terminal leading-relaxed">{body}</div>

      {links.length > 0 && (
        <nav className="mt-8 flex flex-wrap gap-6 border-t border-[--color-phosphor-lo] pt-6">
          {links.map(([kind, href]) => (
            <a
              key={kind}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-[--color-phosphor] underline underline-offset-4 transition-transform active:scale-[0.98]"
            >
              {linkLabel[kind] ?? kind}
              <ArrowSquareOut weight="light" aria-hidden="true" />
            </a>
          ))}
        </nav>
      )}
    </article>
  )
}
```

The duotone filter chain is what makes a screenshot read as terminal-native
rather than pasted in: desaturate, then push the remaining tone toward the
phosphor hue.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- tests/project-article.test.tsx`
Expected: PASS, 5 tests.

- [ ] **Step 5: Write the MDX renderer**

One shared Server Component compiles a project body, so the route and the
desktop page cannot drift in how they style prose.

```tsx
// components/project-body.tsx
import { MDXRemote } from 'next-mdx-remote/rsc'

// ENDLESS is display-only, so MDX headings inside the body stay in the mono
// family. Only the project title uses the display face.
const components = {
  h2: (p: React.ComponentProps<'h2'>) => (
    <h2 {...p} className="mt-8 text-lg text-[--color-phosphor]" />
  ),
  h3: (p: React.ComponentProps<'h3'>) => (
    <h3 {...p} className="mt-6 text-base text-[--color-phosphor]" />
  ),
  p: (p: React.ComponentProps<'p'>) => (
    <p {...p} className="mt-4 max-w-[65ch] text-[--color-phosphor-dim]" />
  ),
  a: (p: React.ComponentProps<'a'>) => (
    <a {...p} className="text-[--color-phosphor] underline underline-offset-4" />
  ),
  code: (p: React.ComponentProps<'code'>) => (
    <code {...p} className="bg-[--color-bg-chrome] px-1 text-[--color-phosphor]" />
  ),
}

/** Server Component. Compiles one project's MDX body. */
export function ProjectBody({ source }: { source: string }) {
  return <MDXRemote source={source} components={components} />
}
```

- [ ] **Step 6: Write the route**

```tsx
// app/projects/[slug]/page.tsx
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
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
    openGraph: { title: project.title, description: project.summary, images: [project.cover] },
  }
}

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const project = (await getProjects()).find((p) => p.slug === slug)
  if (!project) notFound()
  return <ProjectArticle project={project} body={<ProjectBody source={project.body} />} />
}
```

- [ ] **Step 7: Verify the route renders**

```bash
npm run build
```

Expected: build output lists three static `/projects/[slug]` pages.

```bash
npm run dev
```

Visit `http://localhost:3000/projects/aurora-ledger`. Confirm: amber on
near-black, ENDLESS on the heading, mono body, duotoned cover image, working
repository link.

- [ ] **Step 8: Commit**

```bash
git add app/projects components/project-article.tsx components/project-body.tsx tests/project-article.test.tsx
git commit -m "feat: add semantic per-project route as the no-JS fallback"
```

---

### Task 5: The window shell

**Files:**
- Create: `components/window.tsx`
- Test: `tests/window.test.tsx`

**Interfaces:**
- Consumes: `WindowState` from `lib/windows`.
- Produces:
  ```ts
  type WindowProps = {
    state: WindowState
    title: string
    focused: boolean
    onFocus: () => void
    onClose: () => void
    onMinimize: () => void
    onMove: (x: number, y: number) => void
    onResize: (x: number, y: number, w: number, h: number) => void
    children: React.ReactNode
  }
  ```
  Default export `TerminalWindow`.

- [ ] **Step 1: Write the failing test**

```tsx
// tests/window.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TerminalWindow from '@/components/window'
import type { WindowState } from '@/lib/windows'

const state: WindowState = { id: 'a', x: 0, y: 0, w: 640, h: 480, z: 1, minimized: false }

const setup = (overrides: Partial<React.ComponentProps<typeof TerminalWindow>> = {}) => {
  const props = {
    state,
    title: 'Aurora Ledger',
    focused: true,
    onFocus: vi.fn(),
    onClose: vi.fn(),
    onMinimize: vi.fn(),
    onMove: vi.fn(),
    onResize: vi.fn(),
    children: <p>Body</p>,
    ...overrides,
  }
  render(<TerminalWindow {...props} />)
  return props
}

describe('TerminalWindow', () => {
  it('exposes itself as a labelled dialog', () => {
    setup()
    expect(screen.getByRole('dialog', { name: 'Aurora Ledger' })).toBeInTheDocument()
  })

  it('gives the control glyphs accessible names', () => {
    setup()
    expect(screen.getByRole('button', { name: /minimize/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument()
  })

  it('calls onClose when the close control is activated', async () => {
    const props = setup()
    await userEvent.click(screen.getByRole('button', { name: /close/i }))
    expect(props.onClose).toHaveBeenCalledOnce()
  })

  it('calls onMinimize when the minimize control is activated', async () => {
    const props = setup()
    await userEvent.click(screen.getByRole('button', { name: /minimize/i }))
    expect(props.onMinimize).toHaveBeenCalledOnce()
  })

  it('closes on Escape when focused', async () => {
    const props = setup({ focused: true })
    await userEvent.keyboard('{Escape}')
    expect(props.onClose).toHaveBeenCalledOnce()
  })

  it('ignores Escape when not focused', async () => {
    const props = setup({ focused: false })
    await userEvent.keyboard('{Escape}')
    expect(props.onClose).not.toHaveBeenCalled()
  })

  it('calls onFocus when the body is clicked', async () => {
    const props = setup({ focused: false })
    await userEvent.click(screen.getByText('Body'))
    expect(props.onFocus).toHaveBeenCalled()
  })

  it('marks an unfocused window as inert to assistive tech ordering', () => {
    setup({ focused: false })
    expect(screen.getByRole('dialog', { hidden: true })).toHaveAttribute('aria-hidden', 'true')
  })
})
```

Install the interaction library this test needs:

```bash
npm install -D @testing-library/user-event
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- tests/window.test.tsx`
Expected: FAIL, cannot resolve `@/components/window`.

- [ ] **Step 3: Write `components/window.tsx`**

```tsx
'use client'

import { useEffect, useRef } from 'react'
import { Rnd } from 'react-rnd'
import { motion } from 'motion/react'
import type { WindowState } from '@/lib/windows'

export type WindowProps = {
  state: WindowState
  title: string
  focused: boolean
  onFocus: () => void
  onClose: () => void
  onMinimize: () => void
  onMove: (x: number, y: number) => void
  onResize: (x: number, y: number, w: number, h: number) => void
  children: React.ReactNode
}

export default function TerminalWindow({
  state,
  title,
  focused,
  onFocus,
  onClose,
  onMinimize,
  onMove,
  onResize,
  children,
}: WindowProps) {
  const ref = useRef<HTMLDivElement>(null)
  const titleId = `window-title-${state.id}`

  // Escape closes the focused window. Bound at document level rather than on
  // the window element so it works regardless of where focus sits inside.
  useEffect(() => {
    if (!focused) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [focused, onClose])

  // Move DOM focus into a newly focused window so keyboard users land inside it.
  useEffect(() => {
    if (focused) ref.current?.focus()
  }, [focused])

  return (
    <Rnd
      size={{ width: state.w, height: state.h }}
      position={{ x: state.x, y: state.y }}
      minWidth={320}
      minHeight={240}
      bounds="parent"
      dragHandleClassName="window-drag-handle"
      style={{ zIndex: state.z }}
      onDragStart={onFocus}
      onDragStop={(_, d) => onMove(d.x, d.y)}
      onResizeStart={onFocus}
      onResizeStop={(_e, _dir, el, _delta, pos) =>
        onResize(pos.x, pos.y, el.offsetWidth, el.offsetHeight)
      }
    >
      <motion.div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-labelledby={titleId}
        aria-hidden={focused ? undefined : 'true'}
        onMouseDown={onFocus}
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
        className={`flex h-full w-full flex-col border bg-[--color-bg-raised] outline-none ${
          focused ? 'border-[--color-phosphor]' : 'border-[--color-phosphor-lo]'
        }`}
      >
        <div
          className={`window-drag-handle flex shrink-0 cursor-move items-center justify-between border-b bg-[--color-bg-chrome] px-3 py-1.5 ${
            focused ? 'border-[--color-phosphor-lo]' : 'border-transparent'
          }`}
        >
          <h2
            id={titleId}
            className={`truncate font-[family-name:var(--font-display)] text-sm tracking-wide ${
              focused ? 'bloom text-[--color-phosphor]' : 'text-[--color-phosphor-dim]'
            }`}
          >
            {title}
          </h2>

          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              aria-label={`Minimize ${title}`}
              onClick={onMinimize}
              className="px-2 py-0.5 text-[--color-phosphor-dim] transition-transform hover:text-[--color-phosphor] active:scale-[0.98]"
            >
              _
            </button>
            <button
              type="button"
              aria-label={`Close ${title}`}
              onClick={onClose}
              className="px-2 py-0.5 text-[--color-phosphor-dim] transition-transform hover:text-[--color-danger] active:scale-[0.98]"
            >
              X
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-4">{children}</div>
      </motion.div>
    </Rnd>
  )
}
```

Two notes for the implementer. The maximize control from the original
sketch is dropped: with free resize already available it adds a third state
to reason about and buys nothing. And `aria-hidden` on unfocused windows
keeps a screen reader from wandering through five stacked dialogs.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- tests/window.test.tsx`
Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add components/window.tsx tests/window.test.tsx
git commit -m "feat: add draggable resizable terminal window shell"
```

---

### Task 6: Desktop, icons and keyboard navigation

**Files:**
- Create: `components/desktop.tsx`, `components/desktop-icons.tsx`
- Modify: `app/page.tsx`
- Test: `tests/desktop-icons.test.tsx`

**Interfaces:**
- Consumes: `Project` from `lib/projects`, `windowsReducer` / `initialWindowsState` / `focusedId` from `lib/windows`, `TerminalWindow` from `components/window`, `ProjectArticle` from `components/project-article`.
- Produces:
  - `<DesktopIcons projects={Project[]} onOpen={(slug: string) => void} />`
  - `<Desktop projects={Project[]} bodies={Record<string, React.ReactNode>} />`

`bodies` maps slug to a body element already compiled by a Server Component
in `app/page.tsx`. Server-rendered elements may be passed into a Client
Component as props; a Client Component may not call a Server Component. This
is the whole reason for the prop.

- [ ] **Step 1: Write the failing test**

```tsx
// tests/desktop-icons.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DesktopIcons } from '@/components/desktop-icons'
import type { Project } from '@/lib/projects'

const make = (slug: string, title: string): Project => ({
  title,
  slug,
  year: 2025,
  role: 'Engineer',
  stack: ['TypeScript'],
  summary: 'A summary.',
  cover: '/c.png',
  featured: false,
  body: '',
})

const projects = [make('a', 'Alpha'), make('b', 'Beta'), make('c', 'Gamma')]

describe('DesktopIcons', () => {
  it('renders one link per project', () => {
    render(<DesktopIcons projects={projects} onOpen={vi.fn()} />)
    expect(screen.getAllByRole('link')).toHaveLength(3)
  })

  it('links to the real project route so it works without JavaScript', () => {
    render(<DesktopIcons projects={projects} onOpen={vi.fn()} />)
    expect(screen.getByRole('link', { name: /Alpha/ })).toHaveAttribute('href', '/projects/a')
  })

  it('opens a window instead of navigating when JavaScript is running', async () => {
    const onOpen = vi.fn()
    render(<DesktopIcons projects={projects} onOpen={onOpen} />)
    await userEvent.click(screen.getByRole('link', { name: /Alpha/ }))
    expect(onOpen).toHaveBeenCalledWith('a')
  })

  it('exposes exactly one icon in the tab order at a time', () => {
    render(<DesktopIcons projects={projects} onOpen={vi.fn()} />)
    const tabbable = screen.getAllByRole('link').filter((el) => el.tabIndex === 0)
    expect(tabbable).toHaveLength(1)
  })

  it('moves the roving tabindex with the arrow keys', async () => {
    render(<DesktopIcons projects={projects} onOpen={vi.fn()} />)
    const links = screen.getAllByRole('link')
    links[0].focus()
    await userEvent.keyboard('{ArrowRight}')
    expect(links[1]).toHaveFocus()
    await userEvent.keyboard('{ArrowLeft}')
    expect(links[0]).toHaveFocus()
  })

  it('wraps selection at both ends', async () => {
    render(<DesktopIcons projects={projects} onOpen={vi.fn()} />)
    const links = screen.getAllByRole('link')
    links[0].focus()
    await userEvent.keyboard('{ArrowLeft}')
    expect(links[2]).toHaveFocus()
  })

  it('opens the selected project on Enter', async () => {
    const onOpen = vi.fn()
    render(<DesktopIcons projects={projects} onOpen={onOpen} />)
    screen.getAllByRole('link')[1].focus()
    await userEvent.keyboard('{Enter}')
    expect(onOpen).toHaveBeenCalledWith('b')
  })

  it('shows guidance rather than a blank screen when there are no projects', () => {
    render(<DesktopIcons projects={[]} onOpen={vi.fn()} />)
    expect(screen.getByText(/content\/projects/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- tests/desktop-icons.test.tsx`
Expected: FAIL, cannot resolve `@/components/desktop-icons`.

- [ ] **Step 3: Write `components/desktop-icons.tsx`**

```tsx
'use client'

import { useRef, useState } from 'react'
import { FolderOpen } from '@phosphor-icons/react'
import type { Project } from '@/lib/projects'

/**
 * The desktop icon grid. Each icon is a real anchor to the project's own
 * route, so with JavaScript disabled the desktop is a plain list of links.
 * With JavaScript the click is intercepted and a window opens instead.
 */
export function DesktopIcons({
  projects,
  onOpen,
}: {
  projects: Project[]
  onOpen: (slug: string) => void
}) {
  const [selected, setSelected] = useState(0)
  const refs = useRef<(HTMLAnchorElement | null)[]>([])

  if (projects.length === 0) {
    return (
      <p className="max-w-[60ch] p-8 text-[--color-phosphor-dim]">
        No projects found. Add an MDX file to <code>content/projects/</code> with title,
        slug, year, role, stack, summary and cover in its frontmatter, then reload.
      </p>
    )
  }

  const move = (delta: number) => {
    const next = (selected + delta + projects.length) % projects.length
    setSelected(next)
    refs.current[next]?.focus()
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    const deltas: Record<string, number> = {
      ArrowRight: 1,
      ArrowDown: 1,
      ArrowLeft: -1,
      ArrowUp: -1,
    }
    const delta = deltas[e.key]
    if (delta === undefined) return
    e.preventDefault()
    move(delta)
  }

  return (
    <ul
      className="grid grid-cols-2 gap-6 p-8 sm:grid-cols-3 md:grid-cols-4"
      onKeyDown={onKeyDown}
    >
      {projects.map((project, i) => (
        <li key={project.slug}>
          <a
            ref={(el) => {
              refs.current[i] = el
            }}
            href={`/projects/${project.slug}`}
            tabIndex={i === selected ? 0 : -1}
            onFocus={() => setSelected(i)}
            onClick={(e) => {
              // Let modified clicks (new tab, download) behave normally.
              if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
              e.preventDefault()
              onOpen(project.slug)
            }}
            className="flex w-full flex-col items-center gap-2 p-3 text-center text-[--color-phosphor-dim] transition-transform hover:text-[--color-phosphor] focus-visible:text-[--color-phosphor] focus-visible:outline focus-visible:outline-1 focus-visible:outline-[--color-phosphor] active:scale-[0.98]"
          >
            <FolderOpen size={40} weight="light" aria-hidden="true" />
            <span className="font-[family-name:var(--font-display)] text-sm leading-tight">
              {project.title}
            </span>
            <span className="text-xs tabular-nums text-[--color-phosphor-lo]" aria-hidden="true">
              {project.year}
            </span>
          </a>
        </li>
      ))}
    </ul>
  )
}
```

The year uses `--color-phosphor-lo`, which the global constraints reserve
for hairlines. It is marked `aria-hidden` and treated as texture rather than
text; if the contrast check in Task 10 flags it, promote it to
`--color-phosphor-dim`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- tests/desktop-icons.test.tsx`
Expected: PASS, 8 tests.

- [ ] **Step 5: Write `components/desktop.tsx`**

```tsx
'use client'

import { useCallback, useEffect, useReducer, useState } from 'react'
import { AnimatePresence } from 'motion/react'
import {
  windowsReducer,
  initialWindowsState,
  focusedId,
  type WindowAction,
} from '@/lib/windows'
import { DesktopIcons } from '@/components/desktop-icons'
import { ProjectArticle } from '@/components/project-article'
import TerminalWindow from '@/components/window'
import type { Project } from '@/lib/projects'

const MOBILE_BREAKPOINT = 768

export function Desktop({
  projects,
  bodies,
}: {
  projects: Project[]
  bodies: Record<string, React.ReactNode>
}) {
  const [state, dispatch] = useReducer(windowsReducer, initialWindowsState)
  const [isMobile, setIsMobile] = useState<boolean | null>(null)

  // Branch on viewport rather than hiding a mounted Rnd with CSS, so phones
  // never pay for drag handlers they cannot use.
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const sync = () => setIsMobile(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  const send = useCallback((action: Omit<WindowAction, 'vw' | 'vh'>) => {
    dispatch({
      ...action,
      vw: window.innerWidth,
      vh: window.innerHeight,
    } as WindowAction)
  }, [])

  const open = useCallback((id: string) => send({ type: 'open', id }), [send])

  const focused = focusedId(state)
  const byId = new Map(projects.map((p) => [p.slug, p]))

  // Server render and first paint match the desktop branch; the mobile
  // branch swaps in once the media query has been read.
  if (isMobile) {
    return (
      <main className="min-h-[100dvh]">
        {projects.map((project) => (
          <section
            key={project.slug}
            className="border-b border-[--color-phosphor-lo]"
            aria-labelledby={`m-${project.slug}`}
          >
            <ProjectArticle project={project} body={bodies[project.slug]} />
          </section>
        ))}
      </main>
    )
  }

  return (
    <main className="relative min-h-[100dvh] overflow-hidden pb-9">
      <DesktopIcons projects={projects} onOpen={open} />

      <AnimatePresence>
        {state.windows
          .filter((w) => !w.minimized)
          .map((w) => {
            const project = byId.get(w.id)
            if (!project) return null
            return (
              <TerminalWindow
                key={w.id}
                state={w}
                title={project.title}
                focused={focused === w.id}
                onFocus={() => send({ type: 'focus', id: w.id })}
                onClose={() => send({ type: 'close', id: w.id })}
                onMinimize={() => send({ type: 'minimize', id: w.id })}
                onMove={(x, y) => send({ type: 'move', id: w.id, x, y })}
                onResize={(x, y, width, height) =>
                  send({ type: 'resize', id: w.id, x, y, w: width, h: height })
                }
              >
                <ProjectArticle project={project} body={bodies[project.slug]} />
              </TerminalWindow>
            )
          })}
      </AnimatePresence>
    </main>
  )
}
```

- [ ] **Step 6: Wire up `app/page.tsx`**

```tsx
import { getProjects } from '@/lib/projects'
import { Desktop } from '@/components/desktop'
import { ProjectBody } from '@/components/project-body'

export default async function Home() {
  const projects = await getProjects()

  // Compile every body here, in the Server Component, then hand the finished
  // elements to the client desktop. MDXRemote cannot cross into client code.
  const bodies = Object.fromEntries(
    projects.map((p) => [p.slug, <ProjectBody key={p.slug} source={p.body} />]),
  )

  return <Desktop projects={projects} bodies={bodies} />
}
```

- [ ] **Step 7: Verify by hand**

```bash
npm run dev
```

Confirm all of the following at `http://localhost:3000`:

1. Three icons render.
2. Clicking one opens a window.
3. The window drags by its titlebar and resizes from its edges.
4. Clicking a background window raises it above the others.
5. Closing the top window makes the next one the focused window (its border
   goes bright, its title blooms).
6. Tab lands on exactly one icon; arrow keys move between icons; Enter
   opens; Escape closes the focused window.
7. Narrowing the browser under 768px switches to the stacked list.

- [ ] **Step 8: Commit**

```bash
git add components/desktop.tsx components/desktop-icons.tsx app/page.tsx tests/desktop-icons.test.tsx
git commit -m "feat: add desktop window manager with keyboard navigation and mobile fallback"
```

---

### Task 7: Taskbar and minimize round-trip

**Files:**
- Create: `components/taskbar.tsx`
- Modify: `components/desktop.tsx`
- Test: `tests/taskbar.test.tsx`

**Interfaces:**
- Consumes: `WindowState` from `lib/windows`.
- Produces:
  ```ts
  <Taskbar
    entries={{ id: string; title: string; minimized: boolean }[]}
    focusedId={string | null}
    onRestore={(id: string) => void}
    muted={boolean}
    onToggleMute={() => void}
  />
  ```

- [ ] **Step 1: Write the failing test**

```tsx
// tests/taskbar.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Taskbar } from '@/components/taskbar'

const entries = [
  { id: 'a', title: 'Alpha', minimized: false },
  { id: 'b', title: 'Beta', minimized: true },
]

describe('Taskbar', () => {
  it('lists every open window, minimized or not', () => {
    render(
      <Taskbar entries={entries} focusedId="a" onRestore={vi.fn()} muted onToggleMute={vi.fn()} />,
    )
    expect(screen.getByRole('button', { name: /Alpha/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Beta/ })).toBeInTheDocument()
  })

  it('marks the focused entry as pressed', () => {
    render(
      <Taskbar entries={entries} focusedId="a" onRestore={vi.fn()} muted onToggleMute={vi.fn()} />,
    )
    expect(screen.getByRole('button', { name: /Alpha/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /Beta/ })).toHaveAttribute('aria-pressed', 'false')
  })

  it('restores a minimized window when its entry is activated', async () => {
    const onRestore = vi.fn()
    render(
      <Taskbar entries={entries} focusedId="a" onRestore={onRestore} muted onToggleMute={vi.fn()} />,
    )
    await userEvent.click(screen.getByRole('button', { name: /Beta/ }))
    expect(onRestore).toHaveBeenCalledWith('b')
  })

  it('renders nothing but the controls when no windows are open', () => {
    render(<Taskbar entries={[]} focusedId={null} onRestore={vi.fn()} muted onToggleMute={vi.fn()} />)
    expect(screen.queryByRole('button', { name: /Alpha/ })).toBeNull()
    expect(screen.getByRole('button', { name: /sound/i })).toBeInTheDocument()
  })

  it('reports mute state in the toggle label', () => {
    const { rerender } = render(
      <Taskbar entries={[]} focusedId={null} onRestore={vi.fn()} muted onToggleMute={vi.fn()} />,
    )
    expect(screen.getByRole('button', { name: /turn sound on/i })).toBeInTheDocument()
    rerender(
      <Taskbar
        entries={[]}
        focusedId={null}
        onRestore={vi.fn()}
        muted={false}
        onToggleMute={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: /turn sound off/i })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- tests/taskbar.test.tsx`
Expected: FAIL, cannot resolve `@/components/taskbar`.

- [ ] **Step 3: Write `components/taskbar.tsx`**

```tsx
'use client'

import { useEffect, useState } from 'react'
import { SpeakerHigh, SpeakerSlash } from '@phosphor-icons/react'

export type TaskbarEntry = { id: string; title: string; minimized: boolean }

export function Taskbar({
  entries,
  focusedId,
  onRestore,
  muted,
  onToggleMute,
}: {
  entries: TaskbarEntry[]
  focusedId: string | null
  onRestore: (id: string) => void
  muted: boolean
  onToggleMute: () => void
}) {
  const [clock, setClock] = useState<string>('')

  useEffect(() => {
    const tick = () =>
      setClock(
        new Date().toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }),
      )
    tick()
    const id = window.setInterval(tick, 30_000)
    return () => window.clearInterval(id)
  }, [])

  return (
    <footer className="fixed inset-x-0 bottom-0 z-50 flex h-9 items-stretch gap-px border-t border-[--color-phosphor-lo] bg-[--color-bg-chrome] px-2 text-xs">
      <ul className="flex min-w-0 flex-1 items-stretch gap-px">
        {entries.map((entry) => (
          <li key={entry.id} className="min-w-0">
            <button
              type="button"
              aria-pressed={focusedId === entry.id}
              onClick={() => onRestore(entry.id)}
              className={`h-full max-w-40 truncate border-x px-3 transition-transform active:scale-[0.98] ${
                focusedId === entry.id
                  ? 'border-[--color-phosphor-lo] text-[--color-phosphor]'
                  : 'border-transparent text-[--color-phosphor-dim] hover:text-[--color-phosphor]'
              } ${entry.minimized ? 'italic' : ''}`}
            >
              {entry.title}
            </button>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={onToggleMute}
        aria-label={muted ? 'Turn sound on' : 'Turn sound off'}
        className="px-3 text-[--color-phosphor-dim] transition-transform hover:text-[--color-phosphor] active:scale-[0.98]"
      >
        {muted ? (
          <SpeakerSlash size={16} weight="light" aria-hidden="true" />
        ) : (
          <SpeakerHigh size={16} weight="light" aria-hidden="true" />
        )}
      </button>

      <span className="flex items-center px-2 tabular-nums text-[--color-phosphor-dim]">
        {clock}
      </span>
    </footer>
  )
}
```

The clock renders empty on the server and fills in after mount. That avoids
a hydration mismatch between server time and client time, which is a real
error rather than a cosmetic one.

`italic` on minimized entries is safe: the taskbar is mono, not ENDLESS, and
IBM Plex Mono ships a true italic.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- tests/taskbar.test.tsx`
Expected: PASS, 5 tests.

- [ ] **Step 5: Mount the taskbar in `components/desktop.tsx`**

Add the import:

```tsx
import { Taskbar } from '@/components/taskbar'
```

Add mute state next to the existing `useState` calls:

```tsx
const [muted, setMuted] = useState(true)
```

Then render the taskbar as the last child of the desktop `<main>`, directly
after the closing `</AnimatePresence>`:

```tsx
<Taskbar
  entries={state.windows.map((w) => ({
    id: w.id,
    title: byId.get(w.id)?.title ?? w.id,
    minimized: w.minimized,
  }))}
  focusedId={focused}
  onRestore={(id) => send({ type: 'open', id })}
  muted={muted}
  onToggleMute={() => setMuted((m) => !m)}
/>
```

`onRestore` dispatches `open` rather than `restore` because `open` already
restores and focuses in one action, and reusing it keeps a single code path
for "make this window the active one."

- [ ] **Step 6: Verify the round-trip by hand**

```bash
npm run dev
```

Open two windows, minimize one, confirm it disappears from the desktop and
its taskbar entry goes italic, click that entry, confirm it returns focused
and on top.

- [ ] **Step 7: Commit**

```bash
git add components/taskbar.tsx components/desktop.tsx tests/taskbar.test.tsx
git commit -m "feat: add taskbar with minimize and restore round-trip"
```

---

### Task 8: Sound effects

**Files:**
- Create: `lib/sfx.ts`
- Modify: `components/desktop.tsx`, `components/desktop-icons.tsx`
- Test: `tests/sfx.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type Blip = 'tick' | 'open' | 'close' | 'error'`
  - `createSfx(): { play(blip: Blip): void; setMuted(m: boolean): void; muted: boolean; dispose(): void }`
  - `loadMuted(): boolean` and `saveMuted(m: boolean): void` - localStorage helpers, both safe to call in any environment

- [ ] **Step 1: Write the failing test**

```ts
// tests/sfx.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createSfx, loadMuted, saveMuted } from '@/lib/sfx'

class FakeOsc {
  frequency = { setValueAtTime: vi.fn() }
  type = ''
  connect = vi.fn()
  start = vi.fn()
  stop = vi.fn()
}

const makeCtx = () => {
  const osc = new FakeOsc()
  return {
    osc,
    ctx: {
      currentTime: 0,
      state: 'running',
      destination: {},
      resume: vi.fn(),
      close: vi.fn(),
      createOscillator: vi.fn(() => osc),
      createGain: vi.fn(() => ({
        gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
        connect: vi.fn(),
      })),
    },
  }
}

beforeEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

describe('createSfx', () => {
  it('creates no AudioContext while muted', () => {
    const spy = vi.fn()
    vi.stubGlobal('AudioContext', spy)
    const sfx = createSfx()
    sfx.play('open')
    expect(spy).not.toHaveBeenCalled()
    sfx.dispose()
  })

  it('creates the AudioContext lazily on the first unmuted play', () => {
    const { ctx } = makeCtx()
    const spy = vi.fn(() => ctx)
    vi.stubGlobal('AudioContext', spy)
    const sfx = createSfx()
    sfx.setMuted(false)
    expect(spy).not.toHaveBeenCalled()
    sfx.play('open')
    expect(spy).toHaveBeenCalledOnce()
    sfx.play('close')
    expect(spy).toHaveBeenCalledOnce()
    sfx.dispose()
  })

  it('starts and stops an oscillator per blip', () => {
    const { ctx, osc } = makeCtx()
    vi.stubGlobal('AudioContext', vi.fn(() => ctx))
    const sfx = createSfx()
    sfx.setMuted(false)
    sfx.play('tick')
    expect(osc.start).toHaveBeenCalled()
    expect(osc.stop).toHaveBeenCalled()
    sfx.dispose()
  })

  it('closes the context on dispose', () => {
    const { ctx } = makeCtx()
    vi.stubGlobal('AudioContext', vi.fn(() => ctx))
    const sfx = createSfx()
    sfx.setMuted(false)
    sfx.play('tick')
    sfx.dispose()
    expect(ctx.close).toHaveBeenCalled()
  })
})

describe('mute persistence', () => {
  it('defaults to muted when nothing is stored', () => {
    expect(loadMuted()).toBe(true)
  })

  it('round-trips a saved preference', () => {
    saveMuted(false)
    expect(loadMuted()).toBe(false)
  })

  it('survives storage that throws', () => {
    const boom = () => {
      throw new Error('blocked')
    }
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(boom)
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(boom)
    expect(() => saveMuted(false)).not.toThrow()
    expect(loadMuted()).toBe(true)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- tests/sfx.test.ts`
Expected: FAIL, cannot resolve `@/lib/sfx`.

- [ ] **Step 3: Write `lib/sfx.ts`**

```ts
export type Blip = 'tick' | 'open' | 'close' | 'error'

type Voice = { freq: number; ms: number; type: OscillatorType; gain: number }

const VOICES: Record<Blip, Voice> = {
  tick: { freq: 1800, ms: 18, type: 'square', gain: 0.03 },
  open: { freq: 880, ms: 70, type: 'square', gain: 0.05 },
  close: { freq: 420, ms: 70, type: 'square', gain: 0.05 },
  error: { freq: 140, ms: 180, type: 'sawtooth', gain: 0.06 },
}

const STORAGE_KEY = 'crt-portfolio-muted'

/** Storage can throw outright in private modes and locked-down browsers. */
export function loadMuted(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw === null ? true : raw === 'true'
  } catch {
    return true
  }
}

export function saveMuted(muted: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(muted))
  } catch {
    // Ignore. A lost sound preference is not worth breaking the page over.
  }
}

export function createSfx() {
  let ctx: AudioContext | null = null
  let muted = true

  const ensureContext = (): AudioContext | null => {
    if (ctx) return ctx
    const Ctor =
      typeof window !== 'undefined'
        ? window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext
        : undefined
    if (!Ctor) return null
    ctx = new Ctor()
    return ctx
  }

  return {
    get muted() {
      return muted
    },

    setMuted(next: boolean) {
      muted = next
    },

    play(blip: Blip) {
      // Muted is checked before touching AudioContext, so a visitor who
      // never unmutes never gets an audio graph at all.
      if (muted) return
      const audio = ensureContext()
      if (!audio) return
      if (audio.state === 'suspended') void audio.resume()

      const voice = VOICES[blip]
      const osc = audio.createOscillator()
      const gain = audio.createGain()
      const now = audio.currentTime
      const end = now + voice.ms / 1000

      osc.type = voice.type
      osc.frequency.setValueAtTime(voice.freq, now)
      gain.gain.setValueAtTime(voice.gain, now)
      gain.gain.exponentialRampToValueAtTime(0.0001, end)

      osc.connect(gain)
      gain.connect(audio.destination)
      osc.start(now)
      osc.stop(end)
    },

    dispose() {
      void ctx?.close()
      ctx = null
    },
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- tests/sfx.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: Wire sound into `components/desktop.tsx`**

Replace the placeholder `const [muted, setMuted] = useState(true)` from Task 7 with:

```tsx
const sfx = useRef<ReturnType<typeof createSfx> | null>(null)
const [muted, setMuted] = useState(true)

useEffect(() => {
  sfx.current = createSfx()
  const initial = loadMuted()
  setMuted(initial)
  sfx.current.setMuted(initial)
  return () => {
    sfx.current?.dispose()
    sfx.current = null
  }
}, [])

const toggleMute = useCallback(() => {
  setMuted((prev) => {
    const next = !prev
    sfx.current?.setMuted(next)
    saveMuted(next)
    return next
  })
}, [])
```

Add the imports:

```tsx
import { useRef } from 'react'
import { createSfx, loadMuted, saveMuted } from '@/lib/sfx'
```

Then play a blip inside the existing handlers: `sfx.current?.play('open')`
in `open`, `'close'` in the window `onClose`, and `'tick'` in
`DesktopIcons`'s arrow-key handler by passing an optional
`onSelect?: () => void` prop through. Change the taskbar's
`onToggleMute={() => setMuted((m) => !m)}` to `onToggleMute={toggleMute}`.

Note the deliberate ordering: `muted` starts `true` on both server and
client, then the stored preference is applied after mount. Reading
localStorage during render would be a hydration mismatch.

- [ ] **Step 6: Verify by hand**

```bash
npm run dev
```

Confirm: the page is silent on load, unmuting from the taskbar makes window
open and close audible, the preference survives a reload, and no console
warning about AudioContext appears before the first click.

- [ ] **Step 7: Commit**

```bash
git add lib/sfx.ts components/desktop.tsx components/desktop-icons.tsx tests/sfx.test.ts
git commit -m "feat: add WebAudio blips, muted by default with persisted preference"
```

---

### Task 9: Boot sequence and CRT overlay

**Files:**
- Create: `components/boot.tsx`, `components/crt-overlay.tsx`
- Modify: `app/layout.tsx`, `app/globals.css`
- Test: `tests/boot.test.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces: `<Boot />` and `<CrtOverlay />`, both mounted from `app/layout.tsx`.

- [ ] **Step 1: Write the failing test**

```tsx
// tests/boot.test.tsx
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Boot } from '@/components/boot'

beforeEach(() => {
  sessionStorage.clear()
})

describe('Boot', () => {
  it('renders the boot overlay on a first visit', () => {
    render(<Boot />)
    expect(screen.getByTestId('boot')).toBeInTheDocument()
  })

  it('hides itself from assistive technology', () => {
    render(<Boot />)
    expect(screen.getByTestId('boot')).toHaveAttribute('aria-hidden', 'true')
  })

  it('dismisses on any key press', async () => {
    render(<Boot />)
    await userEvent.keyboard('{a}')
    expect(screen.queryByTestId('boot')).toBeNull()
  })

  it('dismisses on click', async () => {
    render(<Boot />)
    await userEvent.click(screen.getByTestId('boot'))
    expect(screen.queryByTestId('boot')).toBeNull()
  })

  it('does not replay within the same session', async () => {
    const { unmount } = render(<Boot />)
    await userEvent.keyboard('{a}')
    unmount()
    render(<Boot />)
    expect(screen.queryByTestId('boot')).toBeNull()
  })

  it('finishes on its own', async () => {
    vi.useFakeTimers()
    render(<Boot />)
    await act(async () => {
      vi.advanceTimersByTime(3000)
    })
    expect(screen.queryByTestId('boot')).toBeNull()
    vi.useRealTimers()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- tests/boot.test.tsx`
Expected: FAIL, cannot resolve `@/components/boot`.

- [ ] **Step 3: Write `components/boot.tsx`**

```tsx
'use client'

import { useEffect, useState } from 'react'

const LINES = [
  'POST ... OK',
  'MEM 640K CONVENTIONAL ... OK',
  'PHOSPHOR ARRAY ... WARM',
  'MOUNTING /projects ... OK',
  'READY.',
]

const LINE_MS = 380
const SESSION_KEY = 'crt-portfolio-booted'

/**
 * A short boot sequence, shown once per session. It sits above the desktop,
 * which is already rendered underneath, so it never delays LCP: it is
 * removed rather than mounted late.
 */
export function Boot() {
  // Reading sessionStorage during the initializer keeps the overlay from
  // flashing on a second navigation within the session.
  const [done, setDone] = useState(() => {
    try {
      return sessionStorage.getItem(SESSION_KEY) === '1'
    } catch {
      return false
    }
  })
  const [shown, setShown] = useState(0)

  useEffect(() => {
    if (done) return

    const finish = () => {
      try {
        sessionStorage.setItem(SESSION_KEY, '1')
      } catch {
        // A replayed boot sequence is a cosmetic problem, not a broken page.
      }
      setDone(true)
    }

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      finish()
      return
    }

    const interval = window.setInterval(() => {
      setShown((n) => {
        if (n + 1 >= LINES.length) {
          window.clearInterval(interval)
          window.setTimeout(finish, LINE_MS)
        }
        return n + 1
      })
    }, LINE_MS)

    const skip = () => finish()
    window.addEventListener('keydown', skip)
    window.addEventListener('pointerdown', skip)

    return () => {
      window.clearInterval(interval)
      window.removeEventListener('keydown', skip)
      window.removeEventListener('pointerdown', skip)
    }
  }, [done])

  if (done) return null

  return (
    <div
      data-testid="boot"
      aria-hidden="true"
      className="fixed inset-0 z-[70] flex flex-col justify-end bg-[--color-bg] p-8 font-[family-name:var(--font-mono)] text-sm text-[--color-phosphor]"
    >
      {LINES.slice(0, shown + 1).map((line) => (
        <p key={line} className="bloom">
          {line}
        </p>
      ))}
    </div>
  )
}
```

The overlay is `aria-hidden` because it is decoration. A screen reader user
gets the desktop immediately, with no fake boot text to sit through.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- tests/boot.test.tsx`
Expected: PASS, 6 tests.

- [ ] **Step 5: Write `components/crt-overlay.tsx`**

```tsx
/**
 * Scanlines and vignette. A single fixed, pointer-events-none layer: putting
 * this texture on a scrolling container forces continuous GPU repaint and
 * destroys frame rate on phones.
 *
 * Server Component. It has no state and no interactivity.
 */
export function CrtOverlay() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[60]"
      style={{
        backgroundImage:
          'repeating-linear-gradient(0deg, rgba(0,0,0,0.22) 0px, rgba(0,0,0,0.22) 1px, transparent 1px, transparent 3px)',
        boxShadow: 'inset 0 0 180px 40px rgba(0,0,0,0.55)',
        animation: 'scanline-drift 220ms steps(2) infinite',
      }}
    />
  )
}
```

The `scanline-drift` keyframes already exist in `globals.css` from Task 1,
and the reduced-motion block there already neutralizes this animation.

- [ ] **Step 6: Mount both in `app/layout.tsx`**

Inside `<body>`, after `{children}`:

```tsx
<CrtOverlay />
<Boot />
```

With imports:

```tsx
import { CrtOverlay } from '@/components/crt-overlay'
import { Boot } from '@/components/boot'
```

- [ ] **Step 7: Verify by hand**

```bash
npm run dev
```

Confirm: the boot sequence plays once, any key skips it, a reload within the
session does not replay it, a new tab does replay it, scanlines are visible
but do not obstruct clicks, and enabling "Reduce motion" in the OS both
stops the drift and skips the boot sequence entirely.

- [ ] **Step 8: Commit**

```bash
git add components/boot.tsx components/crt-overlay.tsx app/layout.tsx tests/boot.test.tsx
git commit -m "feat: add skippable boot sequence and CRT scanline overlay"
```

---

### Task 10: End-to-end smoke test and the ship checklist

**Files:**
- Create: `playwright.config.ts`, `e2e/desktop.spec.ts`
- Modify: `package.json`
- Create: `docs/licenses/README.md`

**Interfaces:**
- Consumes: the running application.
- Produces: `npm run test:e2e`.

- [ ] **Step 1: Write the Playwright config**

```ts
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  use: { baseURL: 'http://localhost:3000' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run build && npm run start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
```

Add to `package.json` scripts: `"test:e2e": "playwright test"`.

```bash
npx playwright install chromium
```

- [ ] **Step 2: Write the failing e2e test**

```ts
// e2e/desktop.spec.ts
import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  // Skip the boot overlay.
  await page.keyboard.press('Escape')
})

test('a window opens, drags, minimizes, restores and closes', async ({ page }) => {
  const icon = page.getByRole('link').first()
  const title = (await icon.innerText()).split('\n')[0]

  await icon.click()
  const win = page.getByRole('dialog', { name: title })
  await expect(win).toBeVisible()

  // Drag by the titlebar and assert the position actually changed.
  const before = await win.boundingBox()
  await page.getByRole('heading', { name: title }).hover()
  await page.mouse.down()
  await page.mouse.move((before!.x ?? 0) + 160, (before!.y ?? 0) + 90, { steps: 12 })
  await page.mouse.up()
  const after = await win.boundingBox()
  expect(after!.x).not.toBe(before!.x)

  await page.getByRole('button', { name: `Minimize ${title}` }).click()
  await expect(win).toBeHidden()
  await expect(page.getByRole('button', { name: title })).toBeVisible()

  await page.getByRole('button', { name: title }).click()
  await expect(page.getByRole('dialog', { name: title })).toBeVisible()

  await page.getByRole('button', { name: `Close ${title}` }).click()
  await expect(page.getByRole('dialog', { name: title })).toHaveCount(0)
})

test('clicking a background window raises it', async ({ page }) => {
  const icons = page.getByRole('link')
  const first = (await icons.nth(0).innerText()).split('\n')[0]
  const second = (await icons.nth(1).innerText()).split('\n')[0]

  await icons.nth(0).click()
  await icons.nth(1).click()

  const firstWin = page.getByRole('dialog', { name: first, includeHidden: true })
  await firstWin.click({ position: { x: 20, y: 60 } })
  await expect(page.getByRole('dialog', { name: first })).toBeVisible()
  await expect(page.getByRole('dialog', { name: second, includeHidden: true })).toHaveAttribute(
    'aria-hidden',
    'true',
  )
})

test('the project route works with JavaScript disabled', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false })
  const page = await context.newPage()
  await page.goto('/')

  const href = await page.getByRole('link').first().getAttribute('href')
  expect(href).toMatch(/^\/projects\//)

  await page.goto(href!)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await context.close()
})

test('the mobile viewport gets a stacked list and no draggable windows', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.reload()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)
})
```

- [ ] **Step 3: Run the e2e suite**

Run: `npm run test:e2e`
Expected: 4 passed.

If the drag assertion fails, the usual cause is `bounds="parent"` on the
`Rnd` combined with a `<main>` that has no explicit height. Give the desktop
`<main>` a `min-h-[100dvh]` and `position: relative`, which Task 6 already
specifies; verify it survived.

- [ ] **Step 4: Run the full suite and the build**

```bash
npm test
npm run build
npx tsc --noEmit
npx next lint
```

Expected: all unit tests pass, the build succeeds, no type errors, no lint
errors. Fix anything that fails before continuing.

- [ ] **Step 5: Record the font license position**

```bash
mkdir -p docs/licenses
```

```markdown
<!-- docs/licenses/README.md -->
# Third-party assets

## ENDLESS (display font)

- Designer: Sreejith Shashi
- Source: https://www.behance.net/gallery/247864363/ENDLESS-Geometric-Sans-Serif-Free-Font
- Font tables embed only `Copyright (c) 2025, sreej`. There is no license
  string (nameID 13) and no license URL (nameID 14).
- The "free for personal and commercial use" grant exists only on the
  Behance project page.

**Status: unverified. This blocks public launch, not development.**

Required before the site goes public, in order of preference:

1. Written confirmation from the designer.
2. An archived copy of the Behance page (PDF or archive.org snapshot)
   committed to this directory as evidence of the grant.
3. Failing both, replace the display face. Candidates: Cabinet Grotesk,
   GT Walsheim, PP Neue Montreal. Only `--font-endless` in
   `app/layout.tsx` and the woff2 file need to change.

## IBM Plex Mono (body font)

SIL Open Font License 1.1. No restrictions relevant to this use.
```

- [ ] **Step 6: Run the manual ship checklist**

Every box must be ticked before this is called done. These are the spec's
success criteria; none of them is covered by an automated test.

```bash
npm run build && npm run start
```

- [ ] Lighthouse on `/`: LCP under 2.5s, CLS under 0.1, accessibility 95 or higher.
- [ ] Keyboard-only pass: reach every project, open it, read it, close it, without touching the mouse.
- [ ] 375px pass: every project readable, nothing horizontally scrolling.
- [ ] Reduced-motion pass: no drift, no boot sequence, no window scale animation.
- [ ] Contrast: sample every text color against its background. Anything below 4.5:1 for body or 3:1 for large text gets promoted a step up the phosphor ramp.
- [ ] `grep -rn "picsum\|TODO: real screenshot" content/` returns nothing. Every placeholder image is replaced.
- [ ] `grep -rn "—\|–" app components lib content` returns nothing.
- [ ] The ENDLESS license question in `docs/licenses/README.md` is resolved.

- [ ] **Step 7: Commit**

```bash
git add playwright.config.ts e2e/ package.json docs/licenses/
git commit -m "test: add end-to-end smoke coverage and ship checklist"
```

---

## Deferred

Named in the spec as out of scope. Each is cheap to add later if it is
actually missed. Do not build these as part of this plan.

- Window snapping and tiling
- Layout persistence across sessions
- A real command parser
- Page transitions between the desktop and project routes
- A walkable avatar or map
- A headless CMS
- Light mode
- Internationalization

## Self-Review Notes

Checked against the spec section by section.

- Spec 3.1 typography, 3.2 color, 3.3 CRT: Tasks 1 and 9. The token test in
  Task 1 mechanically enforces the one-accent and zero-radius locks.
- Spec 3.5 imagery: the duotone filter is in Task 4; the placeholder sweep is
  a checklist item in Task 10.
- Spec 4.3 data flow and frontmatter schema: Task 2, including the em-dash
  ban as a build failure.
- Spec 4.4 window state: Task 3, one test per stated rule.
- Spec 4.5 boot, 4.6 sound: Tasks 9 and 8.
- Spec 5.1 keyboard, 5.2 window semantics, 5.3 mobile and no-JS: Tasks 5, 6
  and 10.
- Spec 5.4 interactive states: empty state in Task 6, active-state feedback
  throughout, contrast in the Task 10 checklist. The loading skeleton the
  spec mentions is not built: content is embedded at build time and there is
  no asynchronous fetch to wait on, so a skeleton would render for zero
  frames. Recorded here rather than silently dropped.
- Spec 6 motion: every animation in the spec's inventory appears in Tasks 5
  and 9, and nothing outside it does.
- Spec 7 testing: Tasks 2, 3 and 10.
- Spec 9 open items: Task 2 step 5 (three real projects), Task 10 step 5
  (license), Task 10 step 6 (screenshots).
