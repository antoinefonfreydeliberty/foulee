import type { TrainingSession } from '@/types'

type ZoneEntry = { label: string; color: string; bg: string }

const SESSION_ZONE_MAP: Record<string, ZoneEntry> = {
  sortie_longue:          { label: 'Z1-Z2', color: '#C5402C', bg: 'rgba(197,64,44,0.10)' },
  endurance_fondamentale: { label: 'Z2',    color: '#60A5FA', bg: 'rgba(96,165,250,0.12)' },
  endurance:              { label: 'Z2',    color: '#60A5FA', bg: 'rgba(96,165,250,0.12)' },
  interval:               { label: 'Z4',    color: '#FB923C', bg: 'rgba(251,146,60,0.12)' },
  fractionne:             { label: 'Z4',    color: '#FB923C', bg: 'rgba(251,146,60,0.12)' },
  tempo:                  { label: 'Z3',    color: '#FBBF24', bg: 'rgba(251,191,36,0.12)' },
  recuperation:           { label: 'Z1',    color: '#3EFFA3', bg: 'rgba(62,255,163,0.12)' },
  seuil:                  { label: 'Z4',    color: '#FB923C', bg: 'rgba(251,146,60,0.12)' },
  vma:                    { label: 'Z5',    color: '#F87171', bg: 'rgba(248,113,113,0.12)' },
  repos:                  { label: 'Repos', color: '#C5BCAF', bg: 'rgba(197,188,175,0.15)' },
}

function formatType(type: string): string {
  return type
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}

function getZone(type: string): ZoneEntry {
  const normalized = type.toLowerCase().replace(/[éèê]/g, 'e').replace(/[àâ]/g, 'a')
  return SESSION_ZONE_MAP[normalized] ?? SESSION_ZONE_MAP[type] ?? {
    label: formatType(type),
    color: '#C5BCAF',
    bg: 'rgba(197,188,175,0.15)',
  }
}

const ZapIcon = ({ size, color }: { size: number; color: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
  </svg>
)

interface SessionCardProps {
  session: TrainingSession
  checked?: boolean
  onToggle?: () => void
}

export const SessionCard = ({ session }: SessionCardProps) => {
  const zone     = getZone(session.type)
  const dayLabel = session.day.charAt(0).toUpperCase() + session.day.slice(1)

  return (
    <div style={{
      background: '#FFFFFF', borderRadius: 14, padding: '11px 13px',
      border: '1px solid #DDD7CE', display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 11,
        background: zone.bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <ZapIcon size={18} color={zone.color} />
      </div>

      <div style={{ flex: 1 }}>
        <p style={{ color: '#6E5E55', fontSize: 10, margin: '0 0 2px', fontWeight: 600 }}>{dayLabel}</p>
        <p style={{ color: '#160E08', fontSize: 13, fontWeight: 700, margin: 0 }}>{session.label}</p>
      </div>

      <span style={{
        background: zone.bg, color: zone.color, fontSize: 10,
        padding: '3px 8px', borderRadius: 99, fontWeight: 700, flexShrink: 0,
      }}>
        {zone.label}
      </span>
    </div>
  )
}
