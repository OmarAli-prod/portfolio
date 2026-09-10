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
  | { type: 'move'; id: string; x: number; y: number }
  | { type: 'resize'; id: string; x: number; y: number; w: number; h: number }

export const initialWindowsState: WindowsState = { windows: [], counter: 0 }

export const DEFAULT_W = 660
export const DEFAULT_H = 520
export const MIN_W = 320
export const MIN_H = 240
export const TASKBAR_H = 36
const CASCADE = 30

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

/**
 * Focus is derived from z-order over visible windows, never stored. Closing or
 * minimizing the top window therefore promotes the next one with no explicit
 * transfer logic, which removes a whole class of desync bug.
 */
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
      const z = state.counter + 1
      const existing = state.windows.find((w) => w.id === action.id)

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
        { x: 72 + n * CASCADE, y: 56 + n * CASCADE, w: DEFAULT_W, h: DEFAULT_H },
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
