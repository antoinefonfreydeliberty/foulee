'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const HomeSvg = () => (
  <svg width={21} height={21} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
    <path d="M9 22V12h6v10"/>
  </svg>
)

const PenLineSvg = () => (
  <svg width={21} height={21} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9"/>
    <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4z"/>
  </svg>
)

const MessageCircleSvg = () => (
  <svg width={21} height={21} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"/>
  </svg>
)

const UsersSvg = () => (
  <svg width={21} height={21} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 00-3-3.87"/>
    <path d="M16 3.13a4 4 0 010 7.75"/>
  </svg>
)

const BarChartSvg = () => (
  <svg width={21} height={21} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 20V10"/>
    <path d="M12 20V4"/>
    <path d="M6 20v-6"/>
  </svg>
)

const tabs = [
  { href: '/dashboard', label: 'Bilan', Icon: HomeSvg },
  { href: '/dashboard/log', label: 'Journal', Icon: PenLineSvg },
  { href: '/dashboard/conversation', label: 'Coach', Icon: MessageCircleSvg },
  { href: '/dashboard/groupe', label: 'Groupe', Icon: UsersSvg },
  { href: '/dashboard/rapports', label: 'Rapports', Icon: BarChartSvg },
]

export const BottomNav = () => {
  const pathname = usePathname()

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      height: 80,
      background: '#FFFFFF',
      borderTop: '1px solid #DDD7CE',
      display: 'flex',
      alignItems: 'flex-start',
      paddingTop: 10,
      zIndex: 50,
    }}>
      {tabs.map(({ href, label, Icon }) => {
        const active = href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              color: active ? '#C5402C' : '#C5BCAF',
              textDecoration: 'none',
            }}
          >
            <Icon />
            <span style={{
              fontSize: 10,
              fontWeight: active ? 700 : 400,
              color: active ? '#C5402C' : '#C5BCAF',
            }}>
              {label}
            </span>
            {active && (
              <div style={{
                width: 4,
                height: 4,
                borderRadius: '50%',
                background: '#C5402C',
                marginTop: 1,
              }} />
            )}
          </Link>
        )
      })}
    </nav>
  )
}
