'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'

type CheckinData = {
  sessionsCount: number | null
  totalDistanceKm: number
  feelingScore: number | null
  painLevel: number | null
  painNotes: string
  freeWord: string
}

const SESSIONS_OPTIONS = [
  { label: '0', value: 0 },
  { label: '1', value: 1 },
  { label: '2', value: 2 },
  { label: '3', value: 3 },
  { label: '4+', value: 4 },
]

const FEELING_OPTIONS = [
  { label: 'Épuisé', value: 1, desc: 'Je suis à bout' },
  { label: 'Difficile', value: 2, desc: "C'était dur" },
  { label: 'Correct', value: 3, desc: 'Ça s\'est passé' },
  { label: 'Bien', value: 4, desc: 'Je me sens bien' },
  { label: 'Super', value: 5, desc: 'En grande forme' },
]

const PAIN_OPTIONS = [
  { label: 'Non, rien', value: 0 },
  { label: 'Légère gêne', value: 1 },
  { label: 'Douleur franche', value: 2 },
]

const TOTAL = 5

type Props = {
  firstName: string
  coachName: string
  coachStyle: string
}

export default function CheckinStepper({ firstName, coachName }: Props) {
  const [step, setStep] = useState(1)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [data, setData] = useState<CheckinData>({
    sessionsCount: null,
    totalDistanceKm: 0,
    feelingScore: null,
    painLevel: null,
    painNotes: '',
    freeWord: '',
  })

  const canNext = () => {
    if (step === 1) return data.sessionsCount !== null
    if (step === 2) return true
    if (step === 3) return data.feelingScore !== null
    if (step === 4) return data.painLevel !== null
    return true
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError(null)

    const res = await fetch('/api/checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
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
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
        gap: 20,
        textAlign: 'center',
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          backgroundColor: '#C1532B',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', fontWeight: 700, fontSize: 24,
        }}>
          {coachName.charAt(0)}
        </div>
        <p style={{ fontSize: 20, fontWeight: 700, color: '#3D2314' }}>
          Merci {firstName} !
        </p>
        <p style={{ fontSize: 14, color: '#A07860', lineHeight: 1.6 }}>
          {coachName} analyse ta semaine.<br />
          Tu recevras ton bilan dimanche soir.
        </p>
        <a
          href="/dashboard"
          style={{
            marginTop: 8,
            backgroundColor: '#C1532B',
            color: '#FDF8F3',
            borderRadius: 8,
            padding: '12px 24px',
            fontWeight: 600,
            fontSize: 15,
            textDecoration: 'none',
            display: 'inline-block',
          }}
        >
          Voir mon dashboard
        </a>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col px-4 py-8 max-w-lg mx-auto">
      {/* Progress dots */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 32 }}>
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} style={{
            width: 8, height: 8, borderRadius: '50%',
            backgroundColor: i < step ? '#F5BDAF' : i === step ? '#C1532B' : '#EEE0D0',
            transition: 'background-color 0.2s',
          }} />
        ))}
      </div>

      <div className="flex-1 flex flex-col gap-6">

        {/* Étape 1 - Sorties */}
        {step === 1 && (
          <>
            <h2 className="text-xl font-semibold text-[#3D2314]">
              Combien de sorties cette semaine, {firstName} ?
            </h2>
            <div className="flex gap-3 flex-wrap">
              {SESSIONS_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setData(d => ({ ...d, sessionsCount: opt.value }))}
                  className={`px-6 py-3 rounded-lg border text-sm font-medium transition-colors ${
                    data.sessionsCount === opt.value
                      ? 'border-[#C1532B] bg-[#FDF2EE] text-[#C1532B]'
                      : 'border-[#EEE0D0] text-[#3D2314]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </>
        )}

        {/* Étape 2 - Distance */}
        {step === 2 && (
          <>
            <h2 className="text-xl font-semibold text-[#3D2314]">Quelle distance totale environ ?</h2>
            <div className="text-center py-2">
              <span className="text-5xl font-bold text-[#C1532B]">{data.totalDistanceKm}</span>
              <p className="text-base text-[#A07860] mt-1">km</p>
            </div>
            <input
              type="range"
              min={0}
              max={60}
              step={1}
              value={data.totalDistanceKm}
              onChange={e => setData(d => ({ ...d, totalDistanceKm: Number(e.target.value) }))}
              className="w-full accent-[#C1532B]"
            />
            <div className="flex justify-between text-xs text-[#A07860]">
              <span>0 km</span>
              <span className="text-center">Glisse pour ajuster</span>
              <span>60 km</span>
            </div>
          </>
        )}

        {/* Étape 3 - Ressenti */}
        {step === 3 && (
          <>
            <h2 className="text-xl font-semibold text-[#3D2314]">Comment tu t'es senti globalement ?</h2>
            <div className="flex flex-col gap-2">
              {FEELING_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setData(d => ({ ...d, feelingScore: opt.value }))}
                  className={`py-3 px-4 rounded-lg border text-sm font-medium transition-colors text-left flex items-center justify-between ${
                    data.feelingScore === opt.value
                      ? 'border-[#C1532B] bg-[#FDF2EE] text-[#C1532B]'
                      : 'border-[#EEE0D0] text-[#3D2314]'
                  }`}
                >
                  <span>{opt.label}</span>
                  <span className={`text-xs ${data.feelingScore === opt.value ? 'text-[#C1532B]' : 'text-[#A07860]'}`}>
                    {opt.desc}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}

        {/* Étape 4 - Douleur */}
        {step === 4 && (
          <>
            <h2 className="text-xl font-semibold text-[#3D2314]">Une douleur ou gêne à signaler ?</h2>
            <div className="flex flex-col gap-2">
              {PAIN_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setData(d => ({ ...d, painLevel: opt.value }))}
                  className={`py-3 rounded-lg border text-sm font-medium transition-colors ${
                    data.painLevel === opt.value
                      ? 'border-[#C1532B] bg-[#FDF2EE] text-[#C1532B]'
                      : 'border-[#EEE0D0] text-[#3D2314]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {data.painLevel !== null && data.painLevel >= 1 && (
              <input
                type="text"
                placeholder="Où et comment ? (optionnel)"
                value={data.painNotes}
                onChange={e => setData(d => ({ ...d, painNotes: e.target.value }))}
                className="border border-[#EEE0D0] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#C1532B] bg-[#FDF8F3]"
              />
            )}
          </>
        )}

        {/* Étape 5 - Mot libre */}
        {step === 5 && (
          <>
            <h2 className="text-xl font-semibold text-[#3D2314]">Un mot pour décrire ta semaine ?</h2>
            <textarea
              placeholder="Intensité, régularité, fatigue... un mot suffit"
              value={data.freeWord}
              onChange={e => setData(d => ({ ...d, freeWord: e.target.value }))}
              rows={4}
              className="border border-[#EEE0D0] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#C1532B] bg-[#FDF8F3] resize-none"
            />
            <p className="text-xs text-[#A07860] -mt-3">Optionnel · tu peux passer directement.</p>
          </>
        )}

      </div>

      {error && (
        <p className="mt-4 text-sm" style={{ color: '#D4845A' }}>{error}</p>
      )}

      <div className="flex gap-3 mt-8">
        {step > 1 && (
          <Button variant="secondary" onClick={() => setStep(s => s - 1)} className="flex-1">
            Retour
          </Button>
        )}
        {step < TOTAL ? (
          <Button onClick={() => setStep(s => s + 1)} disabled={!canNext()} className="flex-1">
            Suivant
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={!canNext() || loading} className="flex-1">
            {loading ? 'Envoi...' : 'Valider mon check-in'}
          </Button>
        )}
      </div>
    </div>
  )
}
