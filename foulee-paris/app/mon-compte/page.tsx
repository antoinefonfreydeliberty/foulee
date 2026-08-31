import { requireBettor } from '@/lib/auth/current'
import { loadAccount, avatarColor, initials } from '@/lib/account'
import { formatJetons, formatJetonsSigned } from '@/lib/money'
import { BottomNav } from '@/components/BottomNav'
import { Disclaimer } from '@/components/Disclaimer'
import { LogoutButton } from '@/components/LogoutButton'
import type { WagerStatus } from '@/lib/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const dateFmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' })

export default async function MonComptePage() {
  const bettor = await requireBettor()
  const account = await loadAccount(bettor.id, bettor.balance_cents)

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ padding: '48px 20px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20 }}>Mon compte</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <LogoutButton />
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: avatarColor(bettor.first_name),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: 13,
              color: 'var(--bg)',
            }}
          >
            {initials(bettor.first_name)}
          </div>
        </div>
      </header>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 20, padding: '0 20px 24px' }}>
        {/* Solde */}
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 18,
            padding: 24,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-sub)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Solde disponible
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 40, color: 'var(--gold)' }}>
            {formatJetons(account.balanceCents)}
          </div>
        </div>

        {/* Compteurs */}
        <div style={{ display: 'flex', gap: 10 }}>
          <StatTile value={account.wonCount} label="Gagnés" color="var(--gain)" />
          <StatTile value={account.lostCount} label="Perdus" color="var(--loss)" />
          <StatTile value={account.pendingCount} label="En cours" color="var(--text)" />
        </div>

        {/* Historique */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Historique des mises
          </div>
          {account.history.length === 0 && (
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Aucune mise pour l&apos;instant.</div>
          )}
          {account.history.map((w) => (
            <div
              key={w.id}
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 14,
                padding: 14,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: 8,
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                  {w.marketLabel} — {w.selectionLabel}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {dateFmt.format(new Date(w.placedAt))} · Mise {formatJetons(w.stakeCents)} · Cote {w.odds.toFixed(2)}
                </div>
              </div>
              <StatusBadge status={w.status} netCents={w.netCents} />
            </div>
          ))}
        </div>

        <Disclaimer />
      </div>

      <BottomNav />
    </div>
  )
}

function StatTile({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div style={{ flex: 1, background: 'var(--surface)', borderRadius: 14, padding: 12, textAlign: 'center' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color }}>{value}</div>
      <div style={{ fontSize: 10, color: 'var(--text-sub)', marginTop: 2 }}>{label}</div>
    </div>
  )
}

function StatusBadge({ status, netCents }: { status: WagerStatus; netCents: number | null }) {
  if (status === 'pending') {
    return <Badge text="En attente" color="var(--text-sub)" bg="var(--surface-2)" />
  }
  if (status === 'void') {
    return <Badge text="Annulé" color="var(--text-sub)" bg="var(--surface-2)" />
  }
  const won = status === 'won'
  return (
    <Badge
      text={netCents == null ? (won ? 'Gagné' : 'Perdu') : formatJetonsSigned(netCents)}
      color={won ? 'var(--gain)' : 'var(--loss)'}
      bg={won ? 'oklch(0.72 0.17 145 / 0.15)' : 'oklch(0.66 0.19 25 / 0.15)'}
    />
  )
}

function Badge({ text, color, bg }: { text: string; color: string; bg: string }) {
  return (
    <span
      style={{
        background: bg,
        color,
        fontWeight: 700,
        fontSize: 11,
        padding: '4px 10px',
        borderRadius: 999,
        whiteSpace: 'nowrap',
      }}
    >
      {text}
    </span>
  )
}
