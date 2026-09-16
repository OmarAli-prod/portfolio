export type Mode = 'interface' | 'simple'

const KEY = 'portfolio-mode'

export function loadMode(): Mode | null {
  try {
    const v = sessionStorage.getItem(KEY)
    return v === 'simple' || v === 'interface' ? v : null
  } catch {
    return null
  }
}

export function saveMode(mode: Mode) {
  try {
    sessionStorage.setItem(KEY, mode)
  } catch {
    // Being asked again next load is cosmetic, not a broken page.
  }
}

/** Staggered flight for a piece moving between layouts. The delay is what
    makes the pieces travel separately instead of as one sheet. */
export const fly = (i: number) => ({
  type: 'spring' as const,
  stiffness: 140,
  damping: 20,
  mass: 0.9,
  delay: i * 0.04,
})
