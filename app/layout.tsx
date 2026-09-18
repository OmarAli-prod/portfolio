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

const SITE = 'https://omarali-prod.github.io/portfolio'
// Kept here, not imported from about-panel: that module is 'use client', so its
// exports reach the server as proxies, not strings.
const TAGLINE = 'Full-stack engineer. Cairo, Egypt.'
const BIO =
  'An Engineer'
const AVATAR = 'https://avatars.githubusercontent.com/Indentationless?size=200'

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: 'Omar Ali',
  description: TAGLINE,
  openGraph: { title: 'Omar Ali', description: TAGLINE, url: SITE, images: [AVATAR] },
}

/**
 * Discord component embed: replaces the default link preview with a
 * Components V2 layout when the site is pasted into Discord.
 * https://discord.com/developers/docs/developers/link-previews/component-embeds
 * ponytail: hand-written literal, serialized once at build. 3,000-byte cap.
 */
const discordEmbed = {
  component: {
    type: 17, // Container
    accent_color: 0xffb000, // phosphor amber, same as the CRT theme
    components: [
      {
        type: 9, // Section: text with the avatar as accessory
        components: [
          {
            type: 10,
            content: `# [Omar Ali](${SITE})\n${TAGLINE}\n${BIO}`,
          },
        ],
        accessory: { type: 11, media: { url: AVATAR } },
      },
      { type: 14 }, // Separator
      {
        type: 1,
        components: [
          { type: 2, style: 5, url: `${SITE}/resume.pdf`, label: 'Hire Me' },
          { type: 2, style: 5, url: SITE, label: 'Site' },
          { type: 2, style: 5, url: 'https://github.com/Indentationless', label: 'GitHub' },
          { type: 2, style: 5, url: 'https://linkedin.com/in/omar-ali-ismail', label: 'LinkedIn' },
        ],
      },
    ],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${endless.variable} ${plexMono.variable}`}>
      <head>
        <script
          id="discord:component-embed"
          type="application/json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(discordEmbed) }}
        />
      </head>
      <body>
        {children}
        <CrtOverlay />
        <Boot />
      </body>
    </html>
  )
}
