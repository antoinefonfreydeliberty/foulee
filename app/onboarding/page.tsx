'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { COACH_OPTIONS, type CoachStyle, type RunnerLevel } from '@/types'

const DAYS       = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']
const TOTAL_STEPS = 5

interface FormData {
  first_name:        string
  coach_name:        string
  coach_style:       CoachStyle
  weight_kg:         string
  age:               string
  runner_level:      RunnerLevel | ''
  weekly_sessions:   number | null
  best_recent_time:  string
  availability:      string[]
  goal_time:         string
  injury_history:    string
}

export default function OnboardingPage() {
  const router  = useRouter()
  const [step,    setStep]    = useState(1)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const [form, setForm] = useState<FormData>({
    first_name:       '',
    coach_name:       '',
    coach_style:      'warm',
    weight_kg:        '',
    age:              '',
    runner_level:     '',
    weekly_sessions:  null,
    best_recent_time: '',
    availability:     [],
    goal_time:        '',
    injury_history:   '',
  })

  const toggleDay = (day: string) => {
    setForm(f => ({
      ...f,
      availability: f.availability.includes(day)
        ? f.availability.filter(d => d !== day)
        : [...f.availability, day],
    }))
  }

  const canNext = () => {
    if (step === 1) return form.first_name.trim().length > 0
    if (step === 2) return form.coach_name.length > 0
    if (step === 3) return form.runner_level !== '' && form.age !== '' && form.weekly_sessions !== null
    if (step === 4) return form.availability.length >= 2
    if (step === 5) return form.goal_time.trim().length > 0
    return false
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    try {
      const res = await fetch('/api/onboarding', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(form),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Une erreur est survenue. Réessaie.' }))
        throw new Error(body.error ?? 'Une erreur est survenue. Réessaie.')
      }
      router.push('/dashboard')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Une erreur est survenue')
      setLoading(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    border: '1px solid #DDD7CE', borderRadius: 99, padding: '12px 18px',
    fontSize: 14, outline: 'none', background: '#FFFFFF',
    color: '#160E08', width: '100%', fontFamily: 'inherit',
    boxSizing: 'border-box',
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 20px', gap: 24, background: '#F4F0EA' }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%', background: '#C5402C',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', fontSize: 24, fontWeight: 900, flexShrink: 0,
        }}>
          {form.coach_name.charAt(0)}
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 18, fontWeight: 800, color: '#160E08', margin: '0 0 6px' }}>
            {form.coach_name} prépare ton programme…
          </p>
          <p style={{ fontSize: 13, color: '#6E5E55', margin: 0 }}>
            Ça prend une dizaine de secondes.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[0, 1, 2].map(i => (
            <div
              key={i}
              style={{ width: 8, height: 8, borderRadius: '50%', background: '#C5402C', animation: 'bounce 1.2s ease-in-out infinite', animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', padding: '32px 18px', maxWidth: 480, margin: '0 auto', background: '#F4F0EA' }}>

      {/* Logo */}
      <h1 style={{ color: '#C5402C', fontSize: 28, fontWeight: 900, letterSpacing: -1, textAlign: 'center', margin: '0 0 24px' }}>
        Foulée
      </h1>

      {/* Barre de progression */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 32 }}>
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <div
            key={i}
            style={{
              height: 4, flex: 1, borderRadius: 99, transition: 'background 0.2s',
              background: i < step ? '#C5402C' : '#DDD7CE',
            }}
          />
        ))}
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Étape 1 */}
        {step === 1 && (
          <>
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 900, color: '#160E08', margin: '0 0 6px', letterSpacing: -0.5 }}>
                Bienvenue dans Foulée
              </h2>
              <p style={{ color: '#6E5E55', fontSize: 13, margin: 0 }}>
                Prépare le semi-marathon Vannes-Auray du 13 septembre 2026 avec un coach personnel.
              </p>
            </div>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#160E08' }}>Comment tu t&apos;appelles ?</span>
              <input
                autoFocus
                type="text"
                placeholder="Ton prénom"
                value={form.first_name}
                onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))}
                style={inputStyle}
              />
            </label>
          </>
        )}

        {/* Étape 2 */}
        {step === 2 && (
          <>
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 900, color: '#160E08', margin: '0 0 6px', letterSpacing: -0.5 }}>
                Choisis ton coach
              </h2>
              <p style={{ color: '#6E5E55', fontSize: 13, margin: 0 }}>
                Il t&apos;accompagnera pendant les 14 semaines de préparation.
              </p>
            </div>
            {COACH_OPTIONS.map(coach => (
              <button
                key={coach.name}
                onClick={() => setForm(f => ({ ...f, coach_name: coach.name, coach_style: coach.style }))}
                style={{
                  width: '100%', textAlign: 'left', borderRadius: 16, padding: '14px 16px',
                  border: `1px solid ${form.coach_name === coach.name ? '#C5402C' : '#DDD7CE'}`,
                  background: form.coach_name === coach.name ? 'rgba(197,64,44,0.08)' : '#FFFFFF',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%', background: '#C5402C',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', fontWeight: 900, fontSize: 16, flexShrink: 0,
                  }}>
                    {coach.name.charAt(0)}
                  </div>
                  <div>
                    <p style={{ fontWeight: 700, color: '#160E08', margin: '0 0 2px', fontSize: 14 }}>{coach.name}</p>
                    <p style={{ fontSize: 11, color: '#6E5E55', margin: 0 }}>{coach.description}</p>
                  </div>
                </div>
                <p style={{ fontSize: 12, color: '#6E5E55', fontStyle: 'italic', margin: 0, paddingLeft: 52 }}>
                  &ldquo;{coach.example}&rdquo;
                </p>
              </button>
            ))}
          </>
        )}

        {/* Étape 3 */}
        {step === 3 && (
          <>
            <h2 style={{ fontSize: 22, fontWeight: 900, color: '#160E08', margin: '0 0 4px', letterSpacing: -0.5 }}>
              Ton profil de coureur
            </h2>

            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#160E08' }}>
                Poids (kg) <span style={{ color: '#6E5E55', fontWeight: 400 }}>· optionnel</span>
              </span>
              <input type="number" placeholder="70" value={form.weight_kg}
                onChange={e => setForm(f => ({ ...f, weight_kg: e.target.value }))} style={inputStyle} />
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#160E08' }}>Âge</span>
              <input type="number" placeholder="35" value={form.age}
                onChange={e => setForm(f => ({ ...f, age: e.target.value }))} style={inputStyle} />
            </label>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#160E08' }}>Niveau</span>
              <div style={{ display: 'flex', gap: 6 }}>
                {([['beginner', 'Débutant'], ['intermediate', 'Intermédiaire'], ['experienced', 'Confirmé']] as [RunnerLevel, string][]).map(([val, label]) => (
                  <button key={val} onClick={() => setForm(f => ({ ...f, runner_level: val }))}
                    style={{
                      flex: 1, padding: '10px 4px', fontSize: 12, borderRadius: 99, cursor: 'pointer',
                      border: `1px solid ${form.runner_level === val ? '#C5402C' : '#DDD7CE'}`,
                      background: form.runner_level === val ? 'rgba(197,64,44,0.08)' : '#FFFFFF',
                      color: form.runner_level === val ? '#C5402C' : '#6E5E55', fontWeight: 600, transition: 'all 0.15s',
                    }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#160E08' }}>Sorties habituelles / semaine</span>
              <div style={{ display: 'flex', gap: 6 }}>
                {[1, 2, 3, '4+'].map(n => (
                  <button key={n} onClick={() => setForm(f => ({ ...f, weekly_sessions: typeof n === 'string' ? 4 : n }))}
                    style={{
                      flex: 1, padding: '10px 4px', fontSize: 13, borderRadius: 99, cursor: 'pointer',
                      border: `1px solid ${form.weekly_sessions === (typeof n === 'string' ? 4 : n) ? '#C5402C' : '#DDD7CE'}`,
                      background: form.weekly_sessions === (typeof n === 'string' ? 4 : n) ? 'rgba(197,64,44,0.08)' : '#FFFFFF',
                      color: form.weekly_sessions === (typeof n === 'string' ? 4 : n) ? '#C5402C' : '#6E5E55', fontWeight: 600, transition: 'all 0.15s',
                    }}>
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#160E08' }}>
                Performance récente <span style={{ color: '#6E5E55', fontWeight: 400 }}>· optionnel</span>
              </span>
              <input type="text" placeholder="Ex : 1h52 sur semi il y a 2 ans, ou 45min sur 10km"
                value={form.best_recent_time}
                onChange={e => setForm(f => ({ ...f, best_recent_time: e.target.value }))} style={inputStyle} />
            </label>
          </>
        )}

        {/* Étape 4 */}
        {step === 4 && (
          <>
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 900, color: '#160E08', margin: '0 0 6px', letterSpacing: -0.5 }}>
                Quand es-tu disponible ?
              </h2>
              <p style={{ color: '#6E5E55', fontSize: 13, margin: 0 }}>Sélectionne au moins 2 jours.</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {DAYS.map(day => (
                <button key={day} onClick={() => toggleDay(day)}
                  style={{
                    padding: '10px 4px', fontSize: 12, borderRadius: 99, cursor: 'pointer',
                    border: `1px solid ${form.availability.includes(day) ? '#C5402C' : '#DDD7CE'}`,
                    background: form.availability.includes(day) ? 'rgba(197,64,44,0.08)' : '#FFFFFF',
                    color: form.availability.includes(day) ? '#C5402C' : '#6E5E55',
                    fontWeight: form.availability.includes(day) ? 700 : 500, transition: 'all 0.15s',
                    textTransform: 'capitalize',
                  }}>
                  {day.slice(0, 3)}
                </button>
              ))}
            </div>
          </>
        )}

        {/* Étape 5 */}
        {step === 5 && (
          <>
            <h2 style={{ fontSize: 22, fontWeight: 900, color: '#160E08', margin: '0 0 4px', letterSpacing: -0.5 }}>
              Ton objectif et tes contraintes
            </h2>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#160E08' }}>Ton objectif</span>
              <input type="text" placeholder="Ex : finir sous 2h, terminer, 1h45"
                value={form.goal_time}
                onChange={e => setForm(f => ({ ...f, goal_time: e.target.value }))} style={inputStyle} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#160E08' }}>
                Blessures ou douleurs chroniques <span style={{ color: '#6E5E55', fontWeight: 400 }}>· optionnel</span>
              </span>
              <textarea
                placeholder="Ex : tendinite au genou gauche... ou laisse vide si tout va bien"
                value={form.injury_history}
                onChange={e => setForm(f => ({ ...f, injury_history: e.target.value }))}
                rows={3}
                style={{ ...inputStyle, borderRadius: 16, resize: 'none', paddingTop: 14 }}
              />
            </label>
          </>
        )}

      </div>

      {error && <p style={{ color: '#C5402C', fontSize: 13, marginTop: 8 }}>{error}</p>}

      <div style={{ display: 'flex', gap: 10, marginTop: 24, paddingBottom: 16 }}>
        {step > 1 && (
          <Button variant="secondary" onClick={() => setStep(s => s - 1)} style={{ flex: 1 }}>
            Retour
          </Button>
        )}
        {step < TOTAL_STEPS ? (
          <Button onClick={() => setStep(s => s + 1)} disabled={!canNext()} style={{ flex: 1 }}>
            Suivant
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={!canNext()} style={{ flex: 1 }}>
            Créer mon programme
          </Button>
        )}
      </div>
    </div>
  )
}
