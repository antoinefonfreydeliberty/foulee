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
  icons: {
    apple: '/apple-icon-v2.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Foulée',
  },
}

export function generateViewport() {
  return { themeColor: '#C5402C' }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${jakarta.variable} h-full`}>
      <body className="min-h-full antialiased" style={{ background: '#F4F0EA', color: '#160E08', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
        {children}
      </body>
    </html>
  )
}
