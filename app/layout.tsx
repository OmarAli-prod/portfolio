import type { Metadata } from 'next'
import localFont from 'next/font/local'
import './globals.css'
import { CrtOverlay } from '@/components/crt-overlay'
import { Boot } from '@/components/boot'

const endless = localFont({
  src: '../public/fonts/endless.woff2',
  variable: '--font-endless',
  display: 'swap',
  // ENDLESS covers ASCII only, so the fallback carries everything else.
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
  title: 'Selected Work',
  description: 'A developer portfolio.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${endless.variable} ${plexMono.variable}`}>
      <body>
        {children}
        <CrtOverlay />
        <Boot />
      </body>
    </html>
  )
}
