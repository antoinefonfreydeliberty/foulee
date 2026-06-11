import type { Metadata } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'

const jakarta = Plus_Jakarta_Sans({
  variable: '--font-jakarta',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
})

export const metadata: Metadata = {
  title: 'Foulée',
  description: 'Ton coach IA personnel pour le semi-marathon Vannes-Auray',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Foulée',
  },
}

export function generateViewport() {
  return { themeColor: '#C5402C' }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${jakarta.variable} h-full`}>
      <head>
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon-v2.png" />
      </head>
      <body className="min-h-full antialiased" style={{ background: '#F4F0EA', color: '#160E08', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
        {children}
      </body>
    </html>
  )
}
