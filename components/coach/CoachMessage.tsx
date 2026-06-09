import Link from 'next/link'

interface CoachMessageProps {
  coachName: string
  content: string
}

export const CoachMessage = ({ coachName, content }: CoachMessageProps) => {
  const initial = coachName.charAt(0).toUpperCase()

  return (
    <Link
      href="/dashboard/conversation"
      style={{
        display: 'flex',
        gap: 10,
        margin: '0 14px 12px',
        background: '#FFFFFF',
        borderRadius: 16,
        padding: '12px 13px',
        border: '1px solid rgba(197,64,44,0.33)',
        boxShadow: '0 2px 12px rgba(197,64,44,0.10)',
        cursor: 'pointer',
        textDecoration: 'none',
        transition: 'transform 0.12s, box-shadow 0.12s',
      }}
    >
      {/* Avatar + pastille verte */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: '#C5402C',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', fontSize: 14, fontWeight: 900,
          boxShadow: '0 4px 12px rgba(197,64,44,0.10)',
        }}>
          {initial}
        </div>
        <div style={{
          position: 'absolute', bottom: 1, right: 0,
          width: 10, height: 10, borderRadius: '50%',
          background: '#22C55E', border: '2px solid #FFFFFF',
        }} />
      </div>

      {/* Texte */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
          <p style={{ color: '#C5402C', fontSize: 10, margin: 0, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>
            {coachName} · COACH IA
          </p>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 4,
            background: 'rgba(197,64,44,0.10)', borderRadius: 99, padding: '2px 8px',
          }}>
            <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="#C5402C" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
            </svg>
            <span style={{ color: '#C5402C', fontSize: 10, fontWeight: 700 }}>Répondre</span>
          </div>
        </div>
        <p style={{
          color: '#160E08', fontSize: 12, margin: 0, lineHeight: 1.5,
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical' as const,
        }}>
          {content}
        </p>
      </div>
    </Link>
  )
}
