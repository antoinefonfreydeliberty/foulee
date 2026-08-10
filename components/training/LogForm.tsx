'use client'

import { useState, useMemo } from 'react'
import { calcPace } from '@/lib/utils/pace'
import type { TrainingLog } from '@/types'

const FEELING_OPTIONS = [
  { value: 1, emoji: '😓', label: 'Épuisé' },
  { value: 2, emoji: '😕', label: 'Difficile' },
  { value: 3, emoji: '😐', label: 'Correct' },
  { value: 4, emoji: '😊', label: 'Bien' },
  { value: 5, emoji: '🔥', label: 'Super' },
]

const FEELING_EMOJI: Record<number, string> = { 1: '😓', 2: '😕', 3: '😐', 4: '😊', 5: '🔥' }

const formatLogDate = (dateStr: string): string => {
  const [year, month, day] = dateStr.split('-').map(Number)
  const d = new Date(year, month - 1, day)
  const result = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  return result.charAt(0).toUpperCase() + result.slice(1)
}

// Durée stockée en minutes entières (jamais de secondes en base). On décompose
// tout de même en min + sec pour un affichage robuste, sans « 0 s » trompeur.
const formatDuration = (minutes: number | null): string => {
  if (!minutes || minutes <= 0) return '--'
  const totalSeconds = Math.round(minutes * 60)
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return s === 0 ? `${m} min` : `${m} min ${s} s`
}

const formatDistance = (km: number): string =>
  km > 0 ? `${km.toFixed(1).replace('.', ',')} km` : '--'

// Ligne label / valeur du détail déplié (lecture seule).
const DetailRow = ({ label, value, accent }: { label: string; value: string; accent?: boolean }) => (
  <div style={{
    display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
    gap: 14, padding: '9px 0', borderBottom: '1px solid #EDE8E1',
  }}>
    <span style={{ fontSize: 12, color: '#6E5E55', fontWeight: 600, flexShrink: 0 }}>{label}</span>
    <span style={{
      fontSize: 13, fontWeight: 700, textAlign: 'right',
      color: accent ? '#C5402C' : '#160E08',
    }}>
      {value}
    </span>
  </div>
)

// Carte d'une séance passée : accordéon dépliable en place (lecture seule),
// même pattern visuel que « Bilans hebdomadaires » (RapportItem).
const LogHistoryCard = ({ log }: { log: TrainingLog }) => {
  const [open, setOpen] = useState(false)
  const feelingInfo = log.feeling != null ? FEELING_OPTIONS.find(o => o.value === log.feeling) : undefined

  return (
    <div style={{ background: '#FFFFFF', border: '1px solid #DDD7CE', borderRadius: 12, overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', padding: '12px 14px',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10,
          background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#6E5E55', margin: '0 0 4px' }}>
            {formatLogDate(log.date)}
          </p>
          <div style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
            <span style={{ fontSize: 16, fontWeight: 800, color: '#160E08' }}>
              {formatDistance(log.distance_km)}
            </span>
            {log.pace_per_km && (
              <span style={{ fontSize: 12, color: '#6E5E55', fontWeight: 600 }}>
                {log.pace_per_km}/km
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {log.feeling != null && (
            <span style={{ fontSize: 22, lineHeight: 1 }}>
              {FEELING_EMOJI[log.feeling] ?? ''}
            </span>
          )}
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: open ? '#C5402C' : '#EDE8E1',
            display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s',
          }}>
            <svg width={12} height={12} viewBox="0 0 24 24" fill="none"
              stroke={open ? 'white' : '#6E5E55'} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
              style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
            >
              <path d="M6 9l6 6 6-6"/>
            </svg>
          </div>
        </div>
      </button>

      {open && (
        <div style={{ padding: '2px 14px 14px', borderTop: '1px solid #DDD7CE' }}>
          <DetailRow label="Date" value={formatLogDate(log.date)} />
          <DetailRow label="Distance" value={formatDistance(log.distance_km)} accent />
          <DetailRow label="Durée" value={formatDuration(log.duration_minutes)} />
          <DetailRow label="Allure" value={log.pace_per_km ? `${log.pace_per_km}/km` : '--'} />
          <DetailRow
            label="Ressenti"
            value={feelingInfo ? `${feelingInfo.emoji} ${feelingInfo.label} · niveau ${log.feeling}` : '--'}
          />
          <DetailRow label="Douleur ou gêne" value={log.pain_notes || '--'} accent={!!log.pain_notes} />

          {log.notes && (
            <div style={{ paddingTop: 12 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#6E5E55', margin: '0 0 5px' }}>
                Notes libres
              </p>
              <p style={{ fontSize: 13, color: '#160E08', lineHeight: 1.6, whiteSpace: 'pre-line', margin: 0 }}>
                {log.notes}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

type Props = {
  firstName: string
  logs?: TrainingLog[]
}

const fieldInput: React.CSSProperties = {
  width: '100%',
  background: '#EDE8E1',
  border: '1px solid #DDD7CE',
  borderRadius: 12,
  padding: '12px 16px',
  fontSize: 14,
  color: '#160E08',
  outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
}

const fieldLabel: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: '#6E5E55',
}

export default function LogForm({ firstName: _, logs = [] }: Props) {
  const today = new Date().toISOString().split('T')[0]

  const [form, setForm] = useState({
    date: today,
    distanceKm: '',
    durationMinutes: '',
    durationSeconds: '',
    feeling: null as number | null,
    painNotes: '',
    notes: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const pace = useMemo(() => {
    const dist = parseFloat(form.distanceKm)
    const mins = parseInt(form.durationMinutes) || 0
    const secs = parseInt(form.durationSeconds) || 0
    const totalMinutes = mins + secs / 60
    if (!dist || dist <= 0 || totalMinutes <= 0) return null
    return calcPace(dist, totalMinutes)
  }, [form.distanceKm, form.durationMinutes, form.durationSeconds])

  const dist = parseFloat(form.distanceKm) || 0
  const mins = parseInt(form.durationMinutes) || 0
  const secs = parseInt(form.durationSeconds) || 0
  const isValid = dist > 0 && (mins > 0 || secs > 0)

  const reset = () => {
    setForm({
      date: new Date().toISOString().split('T')[0],
      distanceKm: '',
      durationMinutes: '',
      durationSeconds: '',
      feeling: null,
      painNotes: '',
      notes: '',
    })
  }

  const handleSubmit = async () => {
    const totalMinutes = mins + secs / 60
    setLoading(true)
    setError(null)

    const res = await fetch('/api/training-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: form.date,
        distanceKm: dist,
        durationMinutes: Math.round(totalMinutes),
        pacePerKm: pace,
        feeling: form.feeling,
        painNotes: form.painNotes || null,
        notes: form.notes || null,
      }),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setError(body.error ?? "Impossible d'enregistrer la sortie. Réessaie.")
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
    setTimeout(() => {
      setSuccess(false)
      reset()
    }, 1500)
  }

  return (
    <div style={{ padding: '16px 16px 24px', maxWidth: 480, margin: '0 auto' }}>

      <h1 style={{
        fontSize: 24, fontWeight: 800, color: '#160E08',
        letterSpacing: -0.8, margin: '0 0 20px',
      }}>
        Saisir une sortie
      </h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Date */}
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={fieldLabel}>Date de la sortie</span>
          <input
            type="date"
            value={form.date}
            max={today}
            onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
            style={fieldInput}
          />
        </label>

        {/* Distance */}
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={fieldLabel}>Distance (km)</span>
          <input
            type="number"
            min="0"
            step="0.1"
            placeholder="10.5"
            value={form.distanceKm}
            onChange={e => setForm(f => ({ ...f, distanceKm: e.target.value }))}
            style={fieldInput}
          />
        </label>

        {/* Durée */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={fieldLabel}>Durée</span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <input
                type="number"
                min="0"
                max="999"
                placeholder="52"
                value={form.durationMinutes}
                onChange={e => setForm(f => ({ ...f, durationMinutes: e.target.value }))}
                style={fieldInput}
              />
              <span style={{ fontSize: 11, color: '#6E5E55', textAlign: 'center' }}>min</span>
            </div>
            <span style={{ color: '#6E5E55', paddingBottom: 20, fontSize: 16, fontWeight: 600 }}>:</span>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <input
                type="number"
                min="0"
                max="59"
                placeholder="30"
                value={form.durationSeconds}
                onChange={e => setForm(f => ({ ...f, durationSeconds: e.target.value }))}
                style={fieldInput}
              />
              <span style={{ fontSize: 11, color: '#6E5E55', textAlign: 'center' }}>sec</span>
            </div>
          </div>
        </div>

        {/* Allure calculée */}
        {pace && (
          <div style={{
            textAlign: 'center', padding: '14px 16px',
            background: 'rgba(42,107,80,0.10)', borderRadius: 12,
            border: '1px solid rgba(42,107,80,0.20)',
          }}>
            <p style={{ fontSize: 28, fontWeight: 800, color: '#2A6B50', margin: '0 0 2px' }}>{pace}</p>
            <p style={{ fontSize: 12, color: '#2A6B50', margin: 0, fontWeight: 600 }}>par kilomètre</p>
          </div>
        )}

        {/* Ressenti */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={fieldLabel}>Ressenti</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {FEELING_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setForm(f => ({ ...f, feeling: f.feeling === opt.value ? null : opt.value }))}
                style={{
                  flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                  padding: '10px 4px', gap: 4, borderRadius: 10, cursor: 'pointer',
                  border: `1px solid ${form.feeling === opt.value ? '#C5402C' : '#DDD7CE'}`,
                  background: form.feeling === opt.value ? 'rgba(197,64,44,0.10)' : '#EDE8E1',
                  transition: 'all 0.15s', fontFamily: 'inherit',
                }}
              >
                <span style={{ fontSize: 18 }}>{opt.emoji}</span>
                <span style={{
                  fontSize: 10, fontWeight: 600,
                  color: form.feeling === opt.value ? '#C5402C' : '#6E5E55',
                }}>
                  {opt.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Douleur */}
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={fieldLabel}>
            Douleur ou gêne{' '}
            <span style={{ fontWeight: 400, color: '#C5BCAF' }}>· optionnel</span>
          </span>
          <input
            type="text"
            placeholder="Douleur, gêne, zone concernée…"
            value={form.painNotes}
            onChange={e => setForm(f => ({ ...f, painNotes: e.target.value }))}
            style={fieldInput}
          />
        </label>

        {/* Notes */}
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={fieldLabel}>
            Notes libres{' '}
            <span style={{ fontWeight: 400, color: '#C5BCAF' }}>· optionnel</span>
          </span>
          <textarea
            placeholder="Comment s'est passée cette sortie ?"
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            rows={3}
            style={{ ...fieldInput, borderRadius: 12, resize: 'none', paddingTop: 12 }}
          />
        </label>

        {error && (
          <p style={{ color: '#C5402C', fontSize: 13, margin: 0 }}>{error}</p>
        )}

        {success && (
          <div style={{
            background: 'rgba(42,107,80,0.10)', border: '1px solid rgba(42,107,80,0.20)',
            borderRadius: 12, padding: '16px 18px', textAlign: 'center',
          }}>
            <p style={{ fontWeight: 700, color: '#2A6B50', margin: '0 0 4px', fontSize: 14 }}>
              Sortie enregistrée !
            </p>
            <p style={{ fontSize: 13, color: '#2A6B50', margin: 0 }}>
              {pace ? `Allure : ${pace}/km · ` : ''}{dist.toFixed(1)} km
            </p>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={!isValid || loading}
          style={{
            width: '100%',
            background: isValid && !loading ? '#C5402C' : '#E3DDD5',
            color: isValid && !loading ? 'white' : '#C5BCAF',
            borderRadius: 13, padding: '14px', fontSize: 14, fontWeight: 800,
            border: 'none', cursor: isValid && !loading ? 'pointer' : 'not-allowed',
            boxShadow: isValid ? '0 6px 20px rgba(197,64,44,0.10)' : 'none',
            transition: 'all 0.15s', fontFamily: 'inherit', marginTop: 4,
          }}
        >
          {loading ? 'Enregistrement…' : 'Enregistrer la sortie'}
        </button>

      </div>

      {/* Historique des sorties */}
      <div style={{ marginTop: 32 }}>
        <h2 style={{
          fontSize: 18, fontWeight: 800, color: '#160E08',
          letterSpacing: -0.5, margin: '0 0 12px',
        }}>
          Mes sorties ({logs.length})
        </h2>

        {logs.length === 0 ? (
          <p style={{ fontSize: 13, color: '#6E5E55', margin: 0 }}>
            Aucune sortie enregistrée pour l&apos;instant.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {logs.map(log => (
              <LogHistoryCard key={log.id} log={log} />
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
