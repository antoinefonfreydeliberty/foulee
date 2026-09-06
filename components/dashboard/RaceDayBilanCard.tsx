'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { calcPace } from '@/lib/utils/pace'

const FEELING_OPTIONS = [
  { value: 1, emoji: '😓', label: 'Épuisé' },
  { value: 2, emoji: '😕', label: 'Difficile' },
  { value: 3, emoji: '😐', label: 'Correct' },
  { value: 4, emoji: '😊', label: 'Bien' },
  { value: 5, emoji: '🔥', label: 'Super' },
]

// Formate une date ISO 'YYYY-MM-DD' en libellé français, sans décalage de
// fuseau (on reconstruit la date à partir des composants locaux).
const formatRaceDate = (dateStr: string): string => {
  const [year, month, day] = dateStr.split('-').map(Number)
  const d = new Date(year, month - 1, day)
  const result = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  return result.charAt(0).toUpperCase() + result.slice(1)
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

type Props = {
  // Date de la course au format ISO 'YYYY-MM-DD' (resolue cote serveur depuis RACE_DATE).
  raceDate: string
  // Le jour de la course : la carte est presentee en modale bloquante (fermable).
  // Les jours suivants : carte inline non bloquante en haut du Dashboard.
  blocking?: boolean
}

// Bilan course. Reutilise l'endpoint existant POST /api/training-log : la sortie
// rejoint training_logs comme n'importe quelle autre seance et apparait dans le
// Journal. Deux presentations, meme formulaire :
//  - blocking (jour J, non fermee) : modale plein ecran bloquante, avec "Plus tard"
//    pour la fermer sans culpabiliser si la course s'est mal passee.
//  - inline (jour J apres fermeture, ou jours suivants) : carte prioritaire en haut.
export default function RaceDayBilanCard({ raceDate, blocking = false }: Props) {
  const router = useRouter()

  const [distanceKm, setDistanceKm] = useState('21.1')
  const [durationMinutes, setDurationMinutes] = useState('')
  const [durationSeconds, setDurationSeconds] = useState('')
  const [feeling, setFeeling] = useState<number | null>(null)
  const [painNotes, setPainNotes] = useState('')
  const [notes, setNotes] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  const asModal = blocking && !dismissed

  // Verrouille le scroll de la page derriere la modale bloquante.
  useEffect(() => {
    if (!asModal) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previous }
  }, [asModal])

  const dist = parseFloat(distanceKm) || 0
  const mins = parseInt(durationMinutes) || 0
  const secs = parseInt(durationSeconds) || 0
  const isValid = dist > 0 && (mins > 0 || secs > 0)

  const pace = useMemo(() => {
    const totalMinutes = mins + secs / 60
    if (!dist || dist <= 0 || totalMinutes <= 0) return null
    return calcPace(dist, totalMinutes)
  }, [dist, mins, secs])

  const handleSubmit = async () => {
    const totalMinutes = mins + secs / 60
    setLoading(true)
    setError(null)

    const res = await fetch('/api/training-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: raceDate,
        distanceKm: dist,
        durationMinutes: Math.round(totalMinutes),
        pacePerKm: pace,
        feeling,
        painNotes: painNotes || null,
        notes: notes || null,
      }),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setError(body.error ?? "Impossible d'enregistrer ta course. Réessaie.")
      setLoading(false)
      return
    }

    // Succes : le bilan disparait (etat local). On rafraichit le Dashboard pour
    // que la sortie soit prise en compte et que la detection serveur confirme.
    setDone(true)
    router.refresh()
  }

  if (done) return null

  // Contenu commun (identique en modale et en carte inline).
  const header = (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20, lineHeight: 1 }}>🏁</span>
          <span style={{ color: '#C5402C', fontSize: 15, fontWeight: 800, letterSpacing: -0.3 }}>
            Ta course est faite, bravo !
          </span>
        </div>
        <p style={{ color: '#6E5E55', fontSize: 12, margin: '6px 0 0', lineHeight: 1.5 }}>
          Enregistre ton bilan de course pour le retrouver dans ton journal.
        </p>
      </div>
      {asModal && (
        <button
          type="button"
          aria-label="Fermer"
          onClick={() => setDismissed(true)}
          style={{
            flexShrink: 0, width: 30, height: 30, borderRadius: '50%',
            background: '#EDE8E1', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit',
          }}
        >
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#6E5E55"
            strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18" /><path d="m6 6 12 12" />
          </svg>
        </button>
      )}
    </div>
  )

  const fields = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Date (non modifiable) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={fieldLabel}>Date de la course</span>
        <div style={{ ...fieldInput, display: 'flex', alignItems: 'center', color: '#6E5E55', fontWeight: 600 }}>
          {formatRaceDate(raceDate)}
        </div>
      </div>

      {/* Distance */}
      <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={fieldLabel}>Distance (km)</span>
        <input
          type="number" min="0" step="0.1" placeholder="21.1"
          value={distanceKm}
          onChange={e => setDistanceKm(e.target.value)}
          style={fieldInput}
        />
      </label>

      {/* Duree */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={fieldLabel}>Durée</span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <input
              type="number" min="0" max="999" placeholder="105"
              value={durationMinutes}
              onChange={e => setDurationMinutes(e.target.value)}
              style={fieldInput}
            />
            <span style={{ fontSize: 11, color: '#6E5E55', textAlign: 'center' }}>min</span>
          </div>
          <span style={{ color: '#6E5E55', paddingBottom: 20, fontSize: 16, fontWeight: 600 }}>:</span>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <input
              type="number" min="0" max="59" placeholder="30"
              value={durationSeconds}
              onChange={e => setDurationSeconds(e.target.value)}
              style={fieldInput}
            />
            <span style={{ fontSize: 11, color: '#6E5E55', textAlign: 'center' }}>sec</span>
          </div>
        </div>
      </div>

      {/* Allure calculee */}
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
              onClick={() => setFeeling(f => f === opt.value ? null : opt.value)}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                padding: '10px 4px', gap: 4, borderRadius: 10, cursor: 'pointer',
                border: `1px solid ${feeling === opt.value ? '#C5402C' : '#DDD7CE'}`,
                background: feeling === opt.value ? 'rgba(197,64,44,0.10)' : '#EDE8E1',
                transition: 'all 0.15s', fontFamily: 'inherit',
              }}
            >
              <span style={{ fontSize: 18 }}>{opt.emoji}</span>
              <span style={{
                fontSize: 10, fontWeight: 600,
                color: feeling === opt.value ? '#C5402C' : '#6E5E55',
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
          type="text" placeholder="Douleur, gêne, zone concernée…"
          value={painNotes}
          onChange={e => setPainNotes(e.target.value)}
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
          placeholder="Comment s'est passée la course ?"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={3}
          style={{ ...fieldInput, borderRadius: 12, resize: 'none', paddingTop: 12 }}
        />
      </label>

      {error && (
        <p style={{ color: '#C5402C', fontSize: 13, margin: 0 }}>{error}</p>
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
        {loading ? 'Enregistrement…' : 'Enregistrer mon bilan de course'}
      </button>

      {asModal && (
        <button
          type="button"
          onClick={() => setDismissed(true)}
          style={{
            width: '100%', background: 'none', border: 'none',
            color: '#6E5E55', fontSize: 13, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit', padding: '4px 0 0',
          }}
        >
          Plus tard
        </button>
      )}
    </div>
  )

  // Presentation modale bloquante (jour J).
  if (asModal) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(22,14,8,0.55)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 16, overflowY: 'auto',
        }}
      >
        <div style={{
          width: '100%', maxWidth: 440, maxHeight: '92vh', overflowY: 'auto',
          background: '#FFFFFF', borderRadius: 16, border: '1px solid rgba(197,64,44,0.30)',
          boxShadow: '0 18px 50px rgba(22,14,8,0.30)',
          padding: '18px 18px 20px',
        }}>
          {header}
          <div style={{ marginTop: 14 }}>{fields}</div>
        </div>
      </div>
    )
  }

  // Presentation carte inline (jour J apres fermeture, ou jours suivants).
  return (
    <div style={{
      margin: '0 14px 12px',
      background: '#FFFFFF', borderRadius: 16,
      border: '1px solid rgba(197,64,44,0.30)',
      boxShadow: '0 6px 20px rgba(197,64,44,0.08)',
      padding: '14px 16px 16px',
    }}>
      {header}
      <div style={{ marginTop: 14 }}>{fields}</div>
    </div>
  )
}
