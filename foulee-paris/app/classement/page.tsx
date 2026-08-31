import { requireBettor } from '@/lib/auth/current'
import { loadLeaderboard, avatarColor, initials } from '@/lib/account'
import { formatJetonsSigned } from '@/lib/money'
import { BottomNav } from '@/components/BottomNav'
import { Disclaimer } from '@/components/Disclaimer'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export default async function ClassementPage() {
  const bettor = await requireBettor()
  const rows = await loadLeaderboard()

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ padding: '48px 20px 16px' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20 }}>Classement</div>
        <div style={{ fontSize: 12, color: 'var(--text-sub)', marginTop: 2 }}>
          Gains cumulés en jetons (paris réglés)
        </div>
      </header>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14, padding: '0 20px 24px' }}>
        {rows.map((r, i) => {
          const isMe = r.bettorId === bettor.id
          const rank = i + 1
          const gainColor = r.gainsCents > 0 ? 'var(--gain)' : r.gainsCents < 0 ? 'var(--loss)' : 'var(--text-sub)'
          return (
            <div
              key={r.bettorId}
              style={{
                background: rank === 1 ? 'var(--surface-2)' : 'var(--surface)',
                border: `${rank === 1 ? '1.5px' : '1px'} solid ${rank === 1 ? 'var(--gold)' : 'var(--border)'}`,
                borderRadius: 16,
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  flexShrink: 0,
                  background: rank === 1 ? 'var(--gold)' : 'var(--border)',
                  color: rank === 1 ? 'var(--bg)' : 'var(--text-body)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                  fontSize: 13,
                }}
              >
                {rank}
              </div>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  flexShrink: 0,
                  background: avatarColor(r.firstName),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                  fontSize: 14,
                  color: 'var(--bg)',
                }}
              >
                {initials(r.firstName)}
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>{r.firstName}</div>
                {isMe && <div style={{ fontSize: 10, color: 'var(--gold)' }}>Toi</div>}
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, color: gainColor }}>
                {formatJetonsSigned(r.gainsCents)}
              </div>
            </div>
          )
        })}

        <div style={{ marginTop: 'auto', paddingTop: 12 }}>
          <Disclaimer />
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
