'use client'

import { useState } from 'react'
import Link from 'next/link'

const ENERGY_OPTIONS = [
  { label: 'Épuisé',  value: 1 },
  { label: 'Fatigué', value: 2 },
  { label: 'OK',      value: 3 },
  { label: 'Bien',    value: 4 },
  { label: 'Top !',   value: 5 },
]

const MOTIVATION_OPTIONS = [
  { em: '😞', value: 1 },
  { em: '😐', value: 2 },
  { em: '🙂', value: 3 },
  { em: '😄', value: 4 },
  { em: '🚀', value: 5 },
]

const PHYSICAL_OPTIONS = [
  { label: 'Jambes lourdes',  pain: 1 },
  { label: 'Douleur genou',   pain: 2 },
  { label: 'Fatigue muscu.',  pain: 1 },
  { label: 'RAS',             pain: 0 },
  { label: 'En pleine forme', pain: 0 },
]

type Props = {
  firstName: string
  coachName: string
  coachStyle: string
}

export default function CheckinStepper({ firstName, coachName }: Props) {
  const [energyScore,      setEnergyScore]      = useState<number | null>(null)
  const [motivationScore,  setMotivationScore]  = useState<number | null>(null)
  const [physicalTags,     setPhysicalTags]     = useState<string[]>([])
  const [note,             setNote]             = useState('')
  const [submitted,        setSubmitted]        = useState(false)
  const [loading,          setLoading]          = useState(false)
  const [error,            setError]            = useState<string | null>(null)

  const initial = coachName.charAt(0).toUpperCase()

  const togglePhysical = (label: string) => {
    setPhysicalTags(prev =>
      prev.includes(label) ? prev.filter(t => t !== label) : [...prev, label]
    )
  }

  const derivedPainLevel = (): 0 | 1 | 2 => {
    const maxPain = physicalTags.reduce((max, tag) => {
      const opt = PHYSICAL_OPTIONS.find(o => o.label === tag)
      return Math.max(max, opt?.pain ?? 0)
    }, 0)
    return maxPain as 0 | 1 | 2
  }

  const canSubmit = energyScore !== null

  const handleSubmit = async () => {
    if (!canSubmit) return
    setLoading(true)
    setError(null)

    const painLevel = derivedPainLevel()
    const painNotes = physicalTags.filter(t => {
      const opt = PHYSICAL_OPTIONS.find(o => o.label === t)
      return (opt?.pain ?? 0) > 0
    }).join(', ')

    const res = await fetch('/api/checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionsCount:    0,
        totalDistanceKm:  0,
        feelingScore:     energyScore,
        painLevel,
        painNotes:        painNotes || note || null,
        freeWord:         note || null,
      }),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setError(body.error ?? 'Une erreur est survenue. Réessaie.')
      setLoading(false)
      return
    }

    setSubmitted(true)
    setLoading(false)
  }

  if (submitted) {
    return (
      <div style={{
        minHeight: '80vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '40px 20px', gap: 20, textAlign: 'center',
        background: '#F4F0EA',
      }}>
        <div style={{ position: 'relative' }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%', background: '#C5402C',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontWeight: 900, fontSize: 24,
          }}>
            {initial}
          </div>
          <div style={{
            position: 'absolute', bottom: 2, right: 2,
            width: 14, height: 14, borderRadius: '50%',
            background: '#22C55E', border: '2px solid #F4F0EA',
          }} />
        </div>
        <p style={{ fontSize: 20, fontWeight: 900, color: '#160E08', margin: 0 }}>
          Merci {firstName} !
        </p>
        <p style={{ fontSize: 14, color: '#6E5E55', lineHeight: 1.6, margin: 0 }}>
          {coachName} analyse ta semaine.<br />
          Tu recevras ton bilan dimanche soir.
        </p>
        <Link
          href="/dashboard"
          style={{
            marginTop: 8, background: '#C5402C', color: 'white',
            borderRadius: 13, padding: '14px 32px', fontWeight: 800,
            fontSize: 14, textDecoration: 'none', display: 'inline-block',
            boxShadow: '0 6px 20px rgba(197,64,44,0.10)',
          }}
        >
          Voir mon bilan
        </Link>
      </div>
    )
  }

  return (
    <div style={{ background: '#F4F0EA', minHeight: '100%', paddingTop: 2 }}>

      {/* Header */}
      <div style={{ padding: '2px 18px 12px' }}>
        <p style={{ color: '#6E5E55', fontSize: 10, margin: '0 0 3px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
          Chaque lundi
        </p>
        <h1 style={{ color: '#160E08', fontSize: 24, fontWeight: 900, margin: 0, letterSpacing: -0.8 }}>
          Check-in hebdo
        </h1>
      </div>

      {/* Coach bubble */}
      <div style={{
        display: 'flex', gap: 10, margin: '0 14px 12px',
        background: '#FFFFFF', borderRadius: 16, padding: '12px 13px',
        border: '1px solid rgba(197,64,44,0.33)',
        boxShadow: '0 2px 12px rgba(197,64,44,0.10)',
      }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%', background: '#C5402C',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontSize: 14, fontWeight: 900,
          }}>
            {initial}
          </div>
          <div style={{
            position: 'absolute', bottom: 1, right: 0, width: 10, height: 10,
            borderRadius: '50%', background: '#22C55E', border: '2px solid #FFFFFF',
          }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ color: '#C5402C', fontSize: 10, margin: '0 0 3px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {coachName} · COACH IA
          </p>
          <p style={{ color: '#160E08', fontSize: 12, margin: 0, lineHeight: 1.5 }}>
            Comment tu te sens avant de démarrer cette semaine ? 🙌
          </p>
        </div>
      </div>

      {/* Énergie */}
      <div style={{ margin: '0 14px 9px', background: '#FFFFFF', borderRadius: 16, padding: '13px 14px', border: '1px solid #DDD7CE' }}>
        <p style={{ color: '#160E08', fontSize: 12, fontWeight: 700, margin: '0 0 10px' }}>⚡ Niveau d&apos;énergie</p>
        <div style={{ display: 'flex', gap: 4 }}>
          {ENERGY_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setEnergyScore(opt.value)}
              style={{
                flex: 1, padding: '8px 3px', borderRadius: 9, textAlign: 'center',
                cursor: 'pointer', fontSize: 10, transition: 'all 0.15s',
                fontWeight: energyScore === opt.value ? 700 : 500,
                background: energyScore === opt.value ? '#C5402C' : '#EDE8E1',
                color:      energyScore === opt.value ? 'white'   : '#6E5E55',
                border:     `1px solid ${energyScore === opt.value ? '#C5402C' : '#DDD7CE'}`,
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Motivation */}
      <div style={{ margin: '0 14px 9px', background: '#FFFFFF', borderRadius: 16, padding: '13px 14px', border: '1px solid #DDD7CE' }}>
        <p style={{ color: '#160E08', fontSize: 12, fontWeight: 700, margin: '0 0 10px' }}>🔥 Motivation</p>
        <div style={{ display: 'flex', gap: 4 }}>
          {MOTIVATION_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setMotivationScore(opt.value)}
              style={{
                flex: 1, padding: '9px 3px', borderRadius: 9, textAlign: 'center',
                fontSize: 17, cursor: 'pointer', transition: 'all 0.15s',
                background: motivationScore === opt.value ? 'rgba(197,64,44,0.10)' : '#EDE8E1',
                border: `1px solid ${motivationScore === opt.value ? '#C5402C' : '#DDD7CE'}`,
              }}
            >
              {opt.em}
            </button>
          ))}
        </div>
      </div>

      {/* Ressenti physique */}
      <div style={{ margin: '0 14px 9px', background: '#FFFFFF', borderRadius: 16, padding: '13px 14px', border: '1px solid #DDD7CE' }}>
        <p style={{ color: '#160E08', fontSize: 12, fontWeight: 700, margin: '0 0 10px' }}>🦵 Ressenti physique</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {PHYSICAL_OPTIONS.map(opt => {
            const active = physicalTags.includes(opt.label)
            return (
              <button
                key={opt.label}
                onClick={() => togglePhysical(opt.label)}
                style={{
                  padding: '6px 11px', borderRadius: 99, fontSize: 10,
                  fontWeight: active ? 700 : 500, cursor: 'pointer', transition: 'all 0.15s',
                  background: active ? 'rgba(197,64,44,0.10)' : '#EDE8E1',
                  color:      active ? '#C5402C'              : '#6E5E55',
                  border:     `1px solid ${active ? '#C5402C' : '#DDD7CE'}`,
                }}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Note libre */}
      <div style={{ margin: '0 14px 10px', background: '#FFFFFF', borderRadius: 12, border: '1px solid #DDD7CE' }}>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Note libre : ressenti, doutes, objectifs…"
          rows={3}
          style={{
            width: '100%', background: 'transparent', border: 'none', outline: 'none',
            padding: '11px 13px', fontSize: 12, color: note ? '#160E08' : '#C5BCAF',
            resize: 'none', fontFamily: 'inherit', lineHeight: 1.5,
          }}
        />
      </div>

      {error && (
        <p style={{ margin: '0 14px 8px', fontSize: 13, color: '#C5402C' }}>{error}</p>
      )}

      {/* CTA */}
      <div style={{ padding: '0 14px 24px' }}>
        <button
          onClick={handleSubmit}
          disabled={!canSubmit || loading}
          style={{
            width: '100%', background: canSubmit && !loading ? '#C5402C' : '#E3DDD5',
            borderRadius: 13, padding: 14, textAlign: 'center',
            color: canSubmit && !loading ? 'white' : '#C5BCAF',
            fontSize: 14, fontWeight: 800, cursor: canSubmit && !loading ? 'pointer' : 'not-allowed',
            border: 'none', boxShadow: canSubmit ? '0 6px 20px rgba(197,64,44,0.10)' : 'none',
            transition: 'all 0.15s',
          }}
        >
          {loading ? 'Envoi…' : `Envoyer à ${coachName} →`}
        </button>
      </div>

    </div>
  )
}
