/**
 * Self-check for the window reducer, the one piece of non-trivial logic here.
 * Run with: node --experimental-strip-types lib/windows.test.ts
 *
 * ponytail: assert-based, no test framework. Add vitest when there is a second
 * thing worth testing.
 */
import assert from 'node:assert/strict'
import {
  windowsReducer as reduce,
  initialWindowsState,
  focusedId,
  clampToViewport,
  type WindowsState,
} from './windows.ts'

const VIEWPORT = { vw: 1440, vh: 900 }
const open = (s: WindowsState, id: string) => reduce(s, { type: 'open', id, ...VIEWPORT })

// Opening focuses.
{
  const s = open(initialWindowsState, 'a')
  assert.equal(s.windows.length, 1)
  assert.equal(focusedId(s), 'a')
}

// Newest window sits on top.
{
  let s = open(initialWindowsState, 'a')
  s = open(s, 'b')
  assert.equal(focusedId(s), 'b')
  const a = s.windows.find((w) => w.id === 'a')!
  const b = s.windows.find((w) => w.id === 'b')!
  assert.ok(b.z > a.z)
  // Cascade: windows must not stack exactly on top of one another.
  assert.notEqual(a.x, b.x)
  assert.notEqual(a.y, b.y)
}

// Opening an open window focuses instead of duplicating.
{
  let s = open(initialWindowsState, 'a')
  s = open(s, 'b')
  s = open(s, 'a')
  assert.equal(s.windows.length, 2)
  assert.equal(focusedId(s), 'a')
}

// Opening a minimized window restores and focuses it.
{
  let s = open(initialWindowsState, 'a')
  s = open(s, 'b')
  s = reduce(s, { type: 'minimize', id: 'a' })
  s = open(s, 'a')
  assert.equal(s.windows.find((w) => w.id === 'a')!.minimized, false)
  assert.equal(focusedId(s), 'a')
}

// Closing the focused window promotes the next highest.
{
  let s = open(initialWindowsState, 'a')
  s = open(s, 'b')
  s = open(s, 'c')
  s = reduce(s, { type: 'close', id: 'c' })
  assert.equal(focusedId(s), 'b')
  assert.equal(s.windows.length, 2)
}

// Minimizing the focused window promotes the next highest.
{
  let s = open(initialWindowsState, 'a')
  s = open(s, 'b')
  s = reduce(s, { type: 'minimize', id: 'b' })
  assert.equal(focusedId(s), 'a')
}

// A minimized window is never focused.
{
  let s = open(initialWindowsState, 'a')
  s = reduce(s, { type: 'minimize', id: 'a' })
  assert.equal(focusedId(s), null)
  assert.equal(focusedId(initialWindowsState), null)
}

// Unknown ids are ignored rather than throwing.
{
  const s = reduce(initialWindowsState, { type: 'close', id: 'ghost' })
  assert.deepEqual(s, initialWindowsState)
}

// Move and resize are recorded; resize respects minimums.
{
  let s = open(initialWindowsState, 'a')
  s = reduce(s, { type: 'move', id: 'a', x: 300, y: 120 })
  assert.equal(s.windows[0].x, 300)
  assert.equal(s.windows[0].y, 120)
  s = reduce(s, { type: 'resize', id: 'a', x: 10, y: 20, w: 100, h: 50 })
  assert.equal(s.windows[0].w, 320)
  assert.equal(s.windows[0].h, 240)
}

// Clamping keeps windows on screen.
{
  const right = clampToViewport({ x: 1400, y: 100, w: 600, h: 400 }, 1440, 900)
  assert.ok(right.x + right.w <= 1440)
  const bottom = clampToViewport({ x: 100, y: 880, w: 600, h: 400 }, 1440, 900)
  assert.ok(bottom.y + bottom.h <= 900)
  const negative = clampToViewport({ x: -200, y: -80, w: 600, h: 400 }, 1440, 900)
  assert.ok(negative.x >= 0 && negative.y >= 0)
  const huge = clampToViewport({ x: 0, y: 0, w: 2000, h: 1600 }, 1440, 900)
  assert.ok(huge.w <= 1440 && huge.h <= 900)
}

console.log('windows reducer: all checks passed')
