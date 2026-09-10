const FIELD_LINES = (alpha: number) =>
  `repeating-linear-gradient(0deg, rgba(0,0,0,${alpha}) 0px, rgba(0,0,0,${alpha}) 1px, transparent 1px, transparent 2px)`

/**
 * Interlaced display treatment. Digital, not analog: hard 1px field lines, no
 * blur anywhere.
 *
 * The flicker is not applied to the whole page. It lives inside a band that
 * travels down the screen, so only the strip currently being scanned shows the
 * fields trading places. Everything outside the band holds still.
 *
 * Three fixed pointer-events-none layers, so none of it ever sits on a
 * scrolling container (that would force continuous GPU repaint).
 *
 * Server Component. No state, no interactivity.
 */
export function CrtOverlay() {
  return (
    <>
      {/* Static field lines across the whole page. Texture, never motion. */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-60"
        style={{ backgroundImage: FIELD_LINES(0.15) }}
      />

      {/* The scanned band. Same lines, offset half a cycle and flickering
          between the two fields, but revealed only where the travelling mask
          is. The mask moves via mask-position rather than transform, leaving
          transform free for the flicker itself. */}
      <div
        aria-hidden="true"
        className="crt-band pointer-events-none fixed inset-0 z-60"
        style={{ backgroundImage: FIELD_LINES(0.26) }}
      />

      {/* Edge falloff, kept tight so the panel reads flat rather than curved. */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-60"
        style={{ boxShadow: 'inset 0 0 120px 24px rgba(0,0,0,0.45)' }}
      />
    </>
  )
}
