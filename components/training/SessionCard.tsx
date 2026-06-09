import type { TrainingSession } from '@/types'

const ZONE_COLORS: Record<string, string> = {
  endurance:       '#60A5FA',
  'fractionné':    '#FB923C',
  'sortie longue': '#2A6B50',
  récupération:    '#3EFFA3',
  repos:           '#C5BCAF',
}

const ZONE_LABELS: Record<string, string> = {
  endurance:       'Z2',
  'fractionné':    'Z4',
  'sortie longue': 'Z1-Z2',
  récupération:    'Z1',
  repos:           'Repos',
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
  const color     = ZONE_COLORS[session.type] ?? '#C5BCAF'
  const zoneLabel = ZONE_LABELS[session.type]  ?? session.type
  const dayLabel  = session.day.charAt(0).toUpperCase() + session.day.slice(1)

  return (
    <div style={{
      background: '#FFFFFF', borderRadius: 14, padding: '11px 13px',
      border: '1px solid #DDD7CE', display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 11,
        background: color + '22', border: `1px solid ${color}33`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <ZapIcon size={18} color={color} />
      </div>

      <div style={{ flex: 1 }}>
        <p style={{ color: '#6E5E55', fontSize: 10, margin: '0 0 2px', fontWeight: 600 }}>{dayLabel}</p>
        <p style={{ color: '#160E08', fontSize: 13, fontWeight: 700, margin: 0 }}>{session.label}</p>
      </div>

      <span style={{
        background: color + '22', color, fontSize: 10,
        padding: '3px 8px', borderRadius: 99, fontWeight: 700, flexShrink: 0,
      }}>
        {zoneLabel}
      </span>
    </div>
  )
}
