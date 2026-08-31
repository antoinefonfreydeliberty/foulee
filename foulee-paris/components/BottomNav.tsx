'use client'

import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/paris', label: 'Paris' },
  { href: '/classement', label: 'Classement' },
  { href: '/mon-compte', label: 'Compte' },
]

export function BottomNav() {
  const pathname = usePathname()
  return (
    <nav
      style={{
        position: 'sticky',
        bottom: 0,
        display: 'flex',
        justifyContent: 'space-around',
        padding: '10px 12px 26px',
        borderTop: '1px solid var(--border)',
        background: 'var(--bg)',
      }}
    >
      {TABS.map((t) => {
        const active = pathname === t.href || pathname.startsWith(t.href + '/')
        return (
          <a
            key={t.href}
            href={t.href}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              fontFamily: 'var(--font-body)',
              fontSize: 10,
              fontWeight: 600,
              color: active ? 'var(--gold)' : 'var(--text-muted)',
            }}
          >
            <span
              style={{
                width: 18,
                height: 18,
                borderRadius: 5,
                background: active ? 'var(--gold)' : 'var(--text-muted)',
                opacity: active ? 1 : 0.6,
              }}
            />
            {t.label}
          </a>
        )
      })}
    </nav>
  )
}
