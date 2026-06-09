import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'

const geist = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Foulée – Coach semi-marathon',
  description: 'Ton coach IA personnel pour le semi-marathon Vannes-Auray',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${geist.variable} h-full`}>
      <body className="min-h-full bg-[#FDF8F3] text-[#3D2314] antialiased">
        {children}
      </body>
    </html>
  )
}
