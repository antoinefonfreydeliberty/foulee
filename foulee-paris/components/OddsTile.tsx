'use client'

// Tuile de cote — reprend fidèlement design/OddsTile.dc.html.
// Sélectionnée : fond or, texte sombre. Non sélectionnée : fond surface-2,
// bordure, cote en or. Désactivée (marché fermé / pas de cote) : atténuée.

export function OddsTile({
  label,
  odds,
  selected,
  disabled,
  onClick,
}: {
  label: string
  odds: number | null
  selected?: boolean
  disabled?: boolean
  onClick?: () => void
}) {
  const unavailable = disabled || odds == null
  return (
    <button
      type="button"
      onClick={unavailable ? undefined : onClick}
      disabled={unavailable}
      aria-pressed={selected}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        minWidth: 88,
        width: '100%',
        minHeight: 74,
        padding: '10px 8px',
        borderRadius: 14,
        boxSizing: 'border-box',
        cursor: unavailable ? 'default' : 'pointer',
        opacity: unavailable ? 0.45 : 1,
        background: selected ? 'var(--gold)' : 'var(--surface-2)',
        border: `1.5px solid ${selected ? 'var(--gold)' : 'var(--border)'}`,
        fontFamily: 'var(--font-body)',
        transition: 'background 120ms, border-color 120ms',
      }}
    >
      <span
        style={{
          fontSize: 12,
          fontWeight: 600,
          textAlign: 'center',
          lineHeight: 1.2,
          color: selected ? 'var(--bg)' : 'var(--text-body)',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 19,
          fontWeight: 700,
          color: selected ? 'var(--bg)' : 'var(--gold)',
        }}
      >
        {odds == null ? '—' : odds.toFixed(2)}
      </span>
    </button>
  )
}
