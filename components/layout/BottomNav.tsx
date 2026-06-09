'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  { href: '/dashboard', label: 'Bilan', icon: '📊' },
  { href: '/dashboard/conseils', label: 'Conseils', icon: '💡' },
  { href: '/dashboard/groupe', label: 'Groupe', icon: '👥' },
  { href: '/dashboard/rapports', label: 'Rapports', icon: '📋' },
]

export const BottomNav = () => {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#EEE0D0] flex z-10">
      {tabs.map(({ href, label, icon }) => {
        const active = href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={`flex-1 flex flex-col items-center py-2 gap-0.5 text-xs transition-colors ${
              active
                ? 'text-[#C1532B] border-t-2 border-[#C1532B] -mt-[2px]'
                : 'text-[#A07860]'
            }`}
          >
            <span className="text-base">{icon}</span>
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
