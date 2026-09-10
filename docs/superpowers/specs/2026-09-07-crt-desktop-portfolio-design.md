# CRT Desktop Portfolio - Design Spec

Date: 2026-09-07
Status: Approved, ready for implementation planning

## 1. Purpose

A personal developer portfolio presented as an immersive-sim CRT terminal
desktop. Project showcases open as draggable, resizable, minimizable windows
on a phosphor-amber desktop. The interface is the personality; the content is
still a normal, indexable, screen-reader-navigable portfolio underneath.

**Audience:** recruiters and engineering peers. Two failure modes to avoid:
a recruiter on a phone who cannot read anything, and a peer who finds the
gimmick shallow. The mobile fallback addresses the first; real project
detail inside the windows addresses the second.

**Success criteria:**

1. A visitor can read every project's detail without a mouse, without
   JavaScript, and on a 375px screen.
2. Opening, dragging, resizing, focusing, minimizing and closing a window all
   work with a pointer and with a keyboard.
3. Lighthouse: LCP < 2.5s, CLS < 0.1, accessibility score >= 95.
4. Adding a project is one MDX file and nothing else.

## 2. Design Read

Reading this as: developer portfolio for recruiters and peers, with an
immersive-sim CRT terminal language, leaning toward native CSS + Tailwind v4
+ Motion, with `react-rnd` for window mechanics.

**Dials:**

| Dial | Value | Reasoning |
|---|---|---|
| `DESIGN_VARIANCE` | 7 | Windows are freely positioned by definition. Asymmetry is structural, not decorative. |
| `MOTION_INTENSITY` | 6 | Boot sequence, window open/close, CRT flicker, text scramble. No scroll-cinema, no parallax. |
| `VISUAL_DENSITY` | 7 | Cockpit register: hairlines instead of cards, mono numerals, tight padding. |

## 3. Visual System

### 3.1 Typography

| Role | Font | Notes |
|---|---|---|
| Display: window titles, boot header, project names, desktop icon labels | **ENDLESS** (Sreejith Shashi, 2025) | Geometric sans. Self-hosted. |
| Body: prose, specs, timestamps, taskbar, all chrome text | **IBM Plex Mono** | Self-hosted, weights 400/500/600. |

Geometric-sans display over mono data is the established immersive-sim
pattern (Deus Ex: Mankind Divided, Alien: Isolation). It is a deliberate
choice, not a mixed-family accident.

**ENDLESS constraints, verified by reading the font's tables:**

- 94 codepoints: ASCII only. No accented characters, no typographic quotes
  (`" "` `' '`), no ellipsis, no arrows, no en/em dash.
- One weight (`usWeightClass: 400`). There is no bold.
- 97 glyphs, 1000 upm.

**Rules that follow:**

1. `font-synthesis: none` globally. Browsers must not fake bold or italic
   for ENDLESS; faux-bold on a geometric sans reads as a rendering bug.
2. Emphasis in display type uses size, color, or letter-spacing. Never
   `font-weight`.
3. Any string containing a character outside ASCII renders in IBM Plex Mono.
   This includes all quotation marks in testimonials or quotes.
4. Convert to `.woff2` at build-prep time; ship `.woff2` only.
5. Load both via `next/font/local` with `display: 'swap'` and explicit
   `fallback` stacks, so a missing font does not shift layout (CLS).

**Licensing (open risk, does not block implementation):**

The `.ttf` embeds `Copyright (c) 2025, sreej` and no license string
(nameID 13) or license URL (nameID 14). The "free for personal and
commercial use" claim exists only on the Behance project page and
aggregator mirrors. Before this site goes public:

- Archive the Behance page (PDF or archive.org snapshot) as evidence of the
  grant, and commit it to `docs/licenses/`.
- Preferably, message the designer for written confirmation.
- If neither is possible, swap the display face. Fallback candidates, in
  order: Cabinet Grotesk, GT Walsheim, PP Neue Montreal.

This is a real trust-boundary question, not a formality. Do not ship a
public site on an unverifiable font grant.

### 3.2 Color

One accent, locked across every surface: **amber phosphor**.

```
--bg          #0a0908   near-black, warm. Not pure #000.
--bg-raised   #12100e   window body
--bg-chrome   #1a1714   titlebar, taskbar
--phosphor    #ffb000   the accent. Amber, not green.
--phosphor-dim #b37a00  secondary text, inactive window chrome
--phosphor-lo  #6b4a00  hairlines, dividers, disabled
--danger       #ff5f45  close button hover, error states only
```

Amber over the cliche matrix green. `--danger` is the single documented
exception to the one-accent rule, used only for destructive and error
affordances where color must carry meaning.

**Page theme lock:** dark only. A CRT has one mode. `prefers-color-scheme`
is deliberately ignored, and `color-scheme: dark` is declared so form
controls and scrollbars match. This satisfies the theme-lock requirement by
construction rather than by discipline.

**Shape lock:** `border-radius: 0` everywhere. No exceptions.

### 3.3 CRT treatment

A single `fixed inset-0 z-[60] pointer-events-none` overlay carries
scanlines, vignette and a faint chromatic-aberration edge. It never lives on
a scrolling container: continuous GPU repaint on scroll destroys mobile
frame rate.

Phosphor bloom is a `text-shadow` on the accent color only, applied via one
utility class. It is not a box-shadow glow, and it is not applied to body
copy at small sizes where it hurts legibility.

Under `prefers-reduced-motion: reduce`: flicker and scanline drift stop, the
static scanline texture remains, all window transitions become instant.

### 3.4 Deliberate deviations from the frontend design guidance

Recorded here so they are visible choices, not silent rule breaks.

1. **"No div-based fake terminals."** That ban targets faking a *product
   screenshot*. Here the terminal is the interface the visitor operates. Real
   project screenshots still appear inside the windows.
2. **"No neon glows."** Phosphor bloom is the brief. Executed as one
   text-shadow on one locked hue, not rainbow gradients.
3. **Window controls use text glyphs** (`_`, `[]`, `X`), not icon-library
   glyphs, for authenticity. Phosphor Icons is used everywhere else
   (external link, folder, arrow), `strokeWidth: 1.5` globally.
4. **`VISUAL_DENSITY: 7` bans card containers.** Windows are the only
   containers on the page. Content inside them is separated by hairlines and
   space.

### 3.5 Imagery

Every project window shows at least one real screenshot. Screenshots are
duotoned to the amber ramp with a CSS filter chain so they read as
terminal-native rather than pasted-in.

Until real assets arrive, use `https://picsum.photos/seed/{project-slug}/{w}/{h}`
and leave an explicit `{/* TODO: real screenshot, 1280x800 */}` marker in the
MDX. Every placeholder must be tracked; shipping with placeholders is a
failure.

Hand-rolled decorative SVG is not used. The one exception is the desktop
graticule background, which is a CSS `repeating-linear-gradient`, not SVG.

## 4. Architecture

### 4.1 Stack

- Next.js 15, App Router, TypeScript, React Server Components by default.
- Tailwind v4 via `@tailwindcss/postcss`. Design tokens as CSS custom
  properties in `@theme`.
- `motion/react` for window open/close and reveal transitions.
- `react-rnd` for drag and resize geometry only.
- `next-mdx-remote` (or `@next/mdx`) for project bodies.
- Static export capable. No server runtime, no database, no CMS.

**Why `react-rnd` rather than hand-rolled pointer events:** drag alone is
about forty lines. Drag plus eight resize handles plus minimum sizes plus
bounds plus touch normalization is not. The library owns the box geometry
and nothing else; z-order, focus, minimize and the taskbar are ours.

**Why not `dnd-kit`:** it is a sortable-list library with no resize support.
Wrong tool.

### 4.2 File layout

```
content/projects/*.mdx           project source, one file per project
public/fonts/                    endless.woff2, ibm-plex-mono-*.woff2
app/layout.tsx                   fonts, theme lock, CRT overlay mount
app/page.tsx                     RSC: reads MDX at build, renders <Desktop>
app/projects/[slug]/page.tsx     plain semantic page per project
app/globals.css                  tokens, CRT effects, reduced-motion block
components/desktop.tsx           'use client' window manager root
components/desktop-icons.tsx     icon grid, roving-tabindex keyboard nav
components/window.tsx            Rnd wrapper: titlebar, controls, chrome
components/taskbar.tsx           minimized windows, clock, sound toggle
components/boot.tsx              skippable boot sequence
components/crt-overlay.tsx       scanline / vignette layer
lib/windows.ts                   window reducer + types
lib/projects.ts                  MDX read + frontmatter parse + zod schema
lib/sfx.ts                       WebAudio blips
```

### 4.3 Data flow

MDX files are read and parsed at build time in a Server Component.
Frontmatter is validated against a zod schema; a malformed file fails the
build rather than rendering a broken window. The resulting `Project[]` is
passed as props into `<Desktop>`, the single client boundary. There is no
client-side fetching and no runtime content loading.

Frontmatter schema:

```ts
{
  title: string
  slug: string          // must match filename
  year: number
  role: string
  stack: string[]
  summary: string       // <= 25 words, used on the desktop icon and in <meta>
  links?: { live?: string; repo?: string }
  cover: string         // path or picsum URL
  featured?: boolean    // featured windows auto-open on first visit
}
```

### 4.4 Window state

One reducer in `lib/windows.ts`. No global state library, no persistence
across sessions.

```ts
type WindowState = {
  id: string          // project slug
  x: number; y: number
  w: number; h: number
  z: number
  minimized: boolean
}

type Action =
  | { type: 'open';     id: string }
  | { type: 'close';    id: string }
  | { type: 'focus';    id: string }
  | { type: 'minimize'; id: string }
  | { type: 'restore';  id: string }
  | { type: 'move';     id: string; x: number; y: number }
  | { type: 'resize';   id: string; x: number; y: number; w: number; h: number }
```

Rules the reducer must enforce, and which the tests must cover:

- `focus` assigns `z = ++counter`. The focused window is always the maximum
  z in the set.
- `open` on an already-open window focuses it instead of duplicating it.
- `open` on a minimized window restores and focuses it.
- `close` removes the window; the remaining window with the highest z
  becomes focused.
- `minimize` on the focused window transfers focus to the next-highest z.
- New windows cascade: each opens offset from the last so they do not stack
  exactly on top of one another.
- Windows are clamped into the viewport on open and on resize, so a window
  can never be positioned entirely offscreen.

### 4.5 Boot sequence

Roughly two seconds of fake POST text, typed. Any key or click skips it
immediately. A `sessionStorage` flag suppresses replay for the rest of the
session, so navigating to a project page and back does not replay it.

The boot overlay must not delay LCP. The desktop renders underneath it and
the overlay is removed, not mounted late.

### 4.6 Sound

WebAudio oscillator blips: keystroke tick, window open, window close, error
buzz. No audio files.

**Muted by default, always.** Autoplaying audio is hostile. The taskbar
carries a persistent toggle whose state lives in `localStorage`, wrapped in
try/catch so a browser blocking site data does not break the page. The
AudioContext is created lazily on the first user gesture after unmuting, per
browser autoplay policy.

## 5. Interaction and Accessibility

### 5.1 Keyboard

| Key | Action |
|---|---|
| Arrow keys | Move selection across the desktop icon grid (roving tabindex) |
| Enter / Space | Open the selected project window |
| Escape | Close the focused window |
| Tab | Cycle focus between open windows and the taskbar |

Desktop icons are real `<button>` elements, which makes most of this
behavior free rather than reimplemented.

### 5.2 Window semantics

Each window is `role="dialog"` with `aria-labelledby` pointing at its
titlebar heading. The focused window traps Tab within itself; Escape
releases and closes. Window control glyphs carry `aria-label`
("Minimize", "Close") since `_` and `X` are not accessible names.

Dragging by pointer is inherently mouse-only. Keyboard users are not
expected to reposition windows: position is decoration, and every window's
*content* is fully reachable without it. This is a deliberate scoping
decision, not an oversight.

### 5.3 Mobile and no-JS

Below 768px, `<Rnd>` is not rendered at all. Windows become plain
`<section>` elements in a stacked vertical scroll, keeping the CRT skin and
losing the drag. This is a render-branch on a media query evaluated in the
component, not CSS that hides a mounted `Rnd` (which would still ship the
drag handlers and their cost to phones).

`app/projects/[slug]/page.tsx` renders each project as an ordinary semantic
document. This is what search engines index, what screen readers can read
linearly, and what a visitor with JavaScript disabled receives. Desktop
icons link to these routes with real `<a href>`; the client intercepts the
click to open a window instead. Progressive enhancement, so the portfolio
degrades to a plain readable site rather than to a blank page.

### 5.4 Interactive states

- **Loading:** window bodies render a scanline-skeleton matching final-
  layout shape, not a spinner.
- **Empty:** if `content/projects` is empty, the desktop shows a terminal
  message explaining how to add a project. It is not a blank screen.
- **Error:** an image that fails to load falls back to an ASCII-frame
  placeholder inside the window rather than a broken-image icon.
- **Tactile:** window controls and buttons use `scale-[0.98]` on `:active`.
- **Contrast:** every control is verified at WCAG AA against its own
  background. `--phosphor-lo` on `--bg` is a hairline color only and is
  never used for text.

## 6. Motion

Every animation must justify itself in one sentence. The full inventory:

| Animation | Justification |
|---|---|
| Boot typing | Storytelling: establishes the fiction before the interface appears. |
| Window open scale + fade from icon origin | State transition: connects the icon to the window it became. |
| Window close reverse | State transition, symmetry with open. |
| Title scramble on window open | Feedback: signals which window just took focus. |
| Titlebar dim on blur | Hierarchy: makes the focused window unambiguous. |
| Scanline drift | Ambience, and the only purely decorative motion. First thing cut under reduced motion. |

Explicitly not used: parallax, scroll hijack, sticky-stack, marquee,
infinite-loop card animations, magnetic cursor physics.

Continuous pointer-driven values, if any are added later, use Motion's
`useMotionValue` and `useTransform`, never `useState`. No
`window.addEventListener('scroll')`. Every `useEffect` that starts an
animation returns a cleanup function.

## 7. Testing

- **Vitest, `lib/windows.ts`:** every rule in section 4.4. Focus ordering
  after close and after minimize, no-duplicate-open, restore-on-open,
  cascade offsets, viewport clamping.
- **Vitest, `lib/projects.ts`:** a malformed frontmatter file fails the
  parse; slug/filename mismatch fails the parse.
- **Playwright smoke, one spec:** open a window, drag it, assert the
  transform changed, minimize it, assert it appears in the taskbar, restore
  it, close it.
- **Manual before ship:** Lighthouse run, keyboard-only pass, 375px pass,
  reduced-motion pass.

CSS appearance is not tested.

## 8. Explicitly Out of Scope

Skipped deliberately. Each is cheap to add later if it is actually missed.

- Window snapping and tiling.
- Layout persistence across sessions.
- A real command parser. Boot text is decorative; there is no shell.
- Page transitions between the desktop and project routes.
- A walkable avatar or map.
- A headless CMS. MDX files are the CMS.
- Light mode.
- Internationalization. ENDLESS is ASCII-only, which forecloses it anyway.

## 9. Open Items

1. **ENDLESS license verification.** Blocks public launch, not
   implementation. See section 3.1.
2. **Real project screenshots.** Placeholders are tracked with TODO markers
   in MDX and must all be resolved before launch.
3. **Project content itself.** The build needs at least three real projects
   to be judged honestly; two windows on a desktop looks unfinished.
