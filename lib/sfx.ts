export type Blip = 'tick' | 'open' | 'close'

type Voice = { freq: number; ms: number; type: OscillatorType; gain: number }

const VOICES: Record<Blip, Voice> = {
  tick: { freq: 1800, ms: 18, type: 'square', gain: 0.025 },
  open: { freq: 880, ms: 70, type: 'square', gain: 0.04 },
  close: { freq: 420, ms: 70, type: 'square', gain: 0.04 },
}

const STORAGE_KEY = 'crt-portfolio-muted'

/** Storage throws outright in some private modes and locked-down browsers. */
export function loadMuted(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw === 'true'
  } catch {
    return false
  }
}

export function saveMuted(muted: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(muted))
  } catch {
    // A lost sound preference is not worth breaking the page over.
  }
}

export function createSfx() {
  let ctx: AudioContext | null = null
  let muted = true

  const ensureContext = (): AudioContext | null => {
    if (ctx) return ctx
    if (typeof window === 'undefined') return null
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    ctx = new Ctor()
    return ctx
  }

  return {
    setMuted(next: boolean) {
      muted = next
    },

    play(blip: Blip) {
      // Muted is checked before touching AudioContext, so a visitor who never
      // unmutes never gets an audio graph at all.
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
