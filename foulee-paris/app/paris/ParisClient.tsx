'use client'

import { useMemo, useState } from 'react'
import { OddsTile } from '@/components/OddsTile'
import { BottomNav } from '@/components/BottomNav'
import { Disclaimer } from '@/components/Disclaimer'
import { formatJetons, CENTS_PER_JETON } from '@/lib/money'
import type { BoardMarket, BoardCategory } from '@/lib/markets'

const CATEGORY_LABEL: Record<BoardCategory, string> = {
  winner: 'Vainqueur',
  head_to_head: 'Face-à-face',
  time_bracket: 'Temps',
  prop: 'Forme & objectifs',
  podium: 'Classement',
}
const CATEGORY_ORDER: BoardCategory[] = ['winner', 'head_to_head', 'time_bracket', 'prop', 'podium']

interface ActiveSelection {
  selectionId: string
  marketLabel: string
  selectionLabel: string
  odds: number
}

export function ParisClient({
  firstName,
  initialBalanceCents,
  board,
  betsClosed,
}: {
  firstName: string
  initialBalanceCents: number
  board: BoardMarket[]
  betsClosed: boolean
}) {
  const [balanceCents, setBalanceCents] = useState(initialBalanceCents)
  const [filter, setFilter] = useState<BoardCategory | 'all'>('all')
  const [active, setActive] = useState<ActiveSelection | null>(null)
  const [stakeJetons, setStakeJetons] = useState(10)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [flash, setFlash] = useState<string | null>(null)

  const categoriesPresent = useMemo(() => {
    const set = new Set<BoardCategory>()
    for (const m of board) set.add(m.category)
    return CATEGORY_ORDER.filter((c) => set.has(c))
  }, [board])

  const visibleMarkets = useMemo(
    () => (filter === 'all' ? board : board.filter((m) => m.category === filter)),
    [board, filter]
  )

  const maxStake = Math.floor(balanceCents / CENTS_PER_JETON)
  const stakeCents = stakeJetons * CENTS_PER_JETON
  const potentialCents = active ? Math.round(stakeCents * active.odds) : 0
  const stakeValid = active != null && stakeJetons >= 1 && stakeCents <= balanceCents

  function selectTile(m: BoardMarket, selId: string, selLabel: string, odds: number | null) {
    if (betsClosed || m.status !== 'open' || odds == null) return
    setError(null)
    setFlash(null)
    if (active?.selectionId === selId) {
      setActive(null) // re-tap = désélection
      return
    }
    setActive({ selectionId: selId, marketLabel: m.label, selectionLabel: selLabel, odds })
    if (stakeJetons > maxStake) setStakeJetons(Math.max(1, maxStake))
  }

  async function submit() {
    if (!active || submitting || !stakeValid) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/wagers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectionId: active.selectionId, stakeCents }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error ?? 'Mise impossible.')
        return
      }
      setBalanceCents(data.newBalanceCents)
      setFlash(
        `Pari validé : ${active.selectionLabel} @ ${active.odds.toFixed(2)} — gain potentiel ${formatJetons(
          data.potentialPayoutCents
        )}.`
      )
      setActive(null)
    } catch {
      setError('Erreur réseau.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <header style={headerStyle}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20 }}>Paris</div>
        <div style={balancePill}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--gold)' }} />
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13 }}>
            {formatJetons(balanceCents)}
          </span>
        </div>
      </header>

      {betsClosed && (
        <div style={closedBanner}>Paris fermés — les cotes sont gelées, plus aucune mise possible.</div>
      )}

      {/* Filtres */}
      <div style={chipRow}>
        <Chip label="Tous" active={filter === 'all'} onClick={() => setFilter('all')} />
        {categoriesPresent.map((c) => (
          <Chip key={c} label={CATEGORY_LABEL[c]} active={filter === c} onClick={() => setFilter(c)} />
        ))}
      </div>

      {flash && <div style={flashBox}>{flash}</div>}

      {/* Marchés */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          padding: `0 20px ${active ? 220 : 16}px`,
        }}
      >
        {visibleMarkets.map((m) => (
          <MarketCard
            key={m.id}
            market={m}
            activeSelectionId={active?.selectionId ?? null}
            betsClosed={betsClosed}
            onSelect={selectTile}
          />
        ))}
        <Disclaimer />
      </div>

      {/* Ticket de mise (pari simple : 1 sélection) */}
      {active && (
        <div style={ticket}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 12, color: 'var(--text-body)' }}>{active.marketLabel}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{active.selectionLabel}</span>
            </div>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color: 'var(--gold)' }}>
              {active.odds.toFixed(2)}
            </span>
          </div>

          <div style={{ height: 1, background: 'var(--border)' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--text-sub)' }}>Mise</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <StepBtn label="−" onClick={() => setStakeJetons((s) => Math.max(1, s - 5))} />
              <input
                type="number"
                min={1}
                max={maxStake}
                value={stakeJetons}
                onChange={(e) => {
                  const v = Math.floor(Number(e.target.value))
                  setStakeJetons(Number.isFinite(v) && v > 0 ? v : 1)
                }}
                style={stakeInput}
              />
              <span style={{ fontSize: 12, color: 'var(--text-sub)' }}>J</span>
              <StepBtn label="+" onClick={() => setStakeJetons((s) => Math.min(maxStake, s + 5))} />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--text-sub)' }}>Gain potentiel</span>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--gain)' }}>
              {formatJetons(potentialCents)}
            </span>
          </div>

          {error && <div style={{ color: 'var(--loss)', fontSize: 12 }}>{error}</div>}
          {!stakeValid && stakeCents > balanceCents && (
            <div style={{ color: 'var(--loss)', fontSize: 12 }}>Solde insuffisant pour cette mise.</div>
          )}

          <button style={{ ...validateBtn, opacity: stakeValid && !submitting ? 1 : 0.5 }} onClick={submit} disabled={!stakeValid || submitting}>
            {submitting ? 'Validation…' : 'Valider le pari'}
          </button>
        </div>
      )}

      <BottomNav />
    </div>
  )
}

function MarketCard({
  market,
  activeSelectionId,
  betsClosed,
  onSelect,
}: {
  market: BoardMarket
  activeSelectionId: string | null
  betsClosed: boolean
  onSelect: (m: BoardMarket, selId: string, selLabel: string, odds: number | null) => void
}) {
  const closed = betsClosed || market.status !== 'open'
  // Classement complet (24 issues) : rendu en liste pour rester lisible.
  const asList = market.type === 'podium_full'

  return (
    <section style={marketCard}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{market.label}</div>
        {closed && <span style={closedTag}>{market.status === 'settled' ? 'Réglé' : 'Fermé'}</span>}
      </div>

      {asList ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 260, overflowY: 'auto' }}>
          {market.selections.map((s) => {
            const on = activeSelectionId === s.id
            const disabled = closed || s.odds == null
            return (
              <button
                key={s.id}
                type="button"
                onClick={disabled ? undefined : () => onSelect(market, s.id, s.label, s.odds)}
                disabled={disabled}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 8,
                  padding: '9px 12px',
                  borderRadius: 10,
                  border: `1px solid ${on ? 'var(--gold)' : 'var(--border)'}`,
                  background: on ? 'var(--gold)' : 'var(--surface-2)',
                  opacity: disabled ? 0.45 : 1,
                  cursor: disabled ? 'default' : 'pointer',
                  fontFamily: 'var(--font-body)',
                  textAlign: 'left',
                }}
              >
                <span style={{ fontSize: 12, color: on ? 'var(--bg)' : 'var(--text-body)' }}>{s.label}</span>
                <span
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 700,
                    fontSize: 14,
                    color: on ? 'var(--bg)' : 'var(--gold)',
                  }}
                >
                  {s.odds == null ? '—' : s.odds.toFixed(2)}
                </span>
              </button>
            )
          })}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
          {market.selections.map((s) => (
            <OddsTile
              key={s.id}
              label={s.label}
              odds={s.odds}
              selected={activeSelectionId === s.id}
              disabled={closed}
              onClick={() => onSelect(market, s.id, s.label, s.odds)}
            />
          ))}
        </div>
      )}
    </section>
  )
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        whiteSpace: 'nowrap',
        padding: '8px 14px',
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        fontFamily: 'var(--font-body)',
        cursor: 'pointer',
        border: active ? '1px solid var(--gold)' : '1px solid var(--border)',
        background: active ? 'var(--gold)' : 'var(--surface)',
        color: active ? 'var(--bg)' : 'var(--text-body)',
      }}
    >
      {label}
    </button>
  )
}

function StepBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: 28,
        height: 28,
        borderRadius: 8,
        border: '1px solid var(--border)',
        background: 'var(--bg)',
        color: 'var(--text)',
        fontSize: 16,
        cursor: 'pointer',
        lineHeight: 1,
      }}
    >
      {label}
    </button>
  )
}

const headerStyle: React.CSSProperties = {
  padding: '48px 20px 14px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
}
const balancePill: React.CSSProperties = {
  background: 'var(--surface-2)',
  border: '1px solid var(--border)',
  borderRadius: 999,
  padding: '6px 12px',
  display: 'flex',
  alignItems: 'center',
  gap: 6,
}
const chipRow: React.CSSProperties = {
  display: 'flex',
  gap: 8,
  padding: '0 20px 14px',
  overflowX: 'auto',
}
const marketCard: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 16,
  padding: 14,
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
}
const closedTag: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  color: 'var(--text-sub)',
  background: 'var(--surface-2)',
  border: '1px solid var(--border)',
  borderRadius: 999,
  padding: '3px 8px',
}
const closedBanner: React.CSSProperties = {
  margin: '0 20px 12px',
  padding: '10px 12px',
  borderRadius: 12,
  background: 'var(--surface-2)',
  border: '1px solid var(--border)',
  color: 'var(--text-body)',
  fontSize: 12,
  textAlign: 'center',
}
const flashBox: React.CSSProperties = {
  margin: '0 20px 12px',
  padding: '10px 12px',
  borderRadius: 12,
  background: 'oklch(0.72 0.17 145 / 0.14)',
  border: '1px solid oklch(0.72 0.17 145 / 0.4)',
  color: 'var(--gain)',
  fontSize: 12.5,
}
const ticket: React.CSSProperties = {
  position: 'sticky',
  bottom: 62,
  background: 'var(--surface-2)',
  borderTop: '1px solid var(--border)',
  padding: '14px 20px',
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
}
const stakeInput: React.CSSProperties = {
  width: 64,
  textAlign: 'center',
  background: 'var(--bg)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  padding: '6px 8px',
  fontFamily: 'var(--font-display)',
  fontWeight: 700,
  fontSize: 14,
  color: 'var(--text)',
  outline: 'none',
}
const validateBtn: React.CSSProperties = {
  background: 'var(--gold)',
  color: 'var(--bg)',
  fontFamily: 'var(--font-body)',
  fontWeight: 700,
  fontSize: 14,
  textAlign: 'center',
  padding: 13,
  borderRadius: 12,
  border: 'none',
  cursor: 'pointer',
}
