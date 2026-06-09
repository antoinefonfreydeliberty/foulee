'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { COACH_OPTIONS, type CoachStyle, type RunnerLevel } from '@/types'

const DAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']
const TOTAL_STEPS = 5

interface FormData {
  first_name: string
  coach_name: string
  coach_style: CoachStyle
  weight_kg: string
  age: string
  runner_level: RunnerLevel | ''
  weekly_sessions: number | null
  best_recent_time: string
  availability: string[]
  goal_time: string
  injury_history: string
}

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState<FormData>({
    first_name: '',
    coach_name: '',
    coach_style: 'warm',
    weight_kg: '',
    age: '',
    runner_level: '',
    weekly_sessions: null,
    best_recent_time: '',
    availability: [],
    goal_time: '',
    injury_history: '',
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
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
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

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 gap-6">
        <div className="w-16 h-16 rounded-full bg-[#C1532B] flex items-center justify-center text-white text-2xl font-bold shrink-0">
          {form.coach_name.charAt(0)}
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold text-[#3D2314]">
            {form.coach_name} prépare ton programme...
          </p>
          <p className="text-sm text-[#A07860] mt-1">
            Ça prend une dizaine de secondes. Ne quitte pas la page.
          </p>
        </div>
        <div className="flex gap-2 mt-2">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-[#C1532B] animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col px-4 py-8 max-w-lg mx-auto">
      <h1 className="font-serif text-2xl text-[#C1532B] font-bold text-center mb-6">Foulée</h1>

      {/* Barre de progression */}
      <div className="flex gap-1.5 mb-8">
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i < step ? 'bg-[#C1532B]' : 'bg-[#EEE0D0]'
            }`}
          />
        ))}
      </div>

      {/* Étape 1 */}
      {step === 1 && (
        <div className="flex flex-col gap-6 flex-1">
          <div>
            <h2 className="text-xl font-semibold text-[#3D2314] mb-1">Bienvenue dans Foulée</h2>
            <p className="text-[#A07860] text-sm">
              Prépare le semi-marathon Vannes-Auray du 13 septembre 2026 avec un coach personnel.
            </p>
          </div>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-[#3D2314]">Comment tu t'appelles ?</span>
            <input
              autoFocus
              type="text"
              placeholder="Ton prénom"
              value={form.first_name}
              onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))}
              className="border border-[#EEE0D0] rounded-lg px-4 py-3 text-base focus:outline-none focus:border-[#C1532B] bg-white"
            />
          </label>
        </div>
      )}

      {/* Étape 2 */}
      {step === 2 && (
        <div className="flex flex-col gap-4 flex-1">
          <div>
            <h2 className="text-xl font-semibold text-[#3D2314] mb-1">Choisis ton coach</h2>
            <p className="text-[#A07860] text-sm">Il t'accompagnera pendant les 14 semaines de préparation.</p>
          </div>
          {COACH_OPTIONS.map(coach => (
            <button
              key={coach.name}
              onClick={() => setForm(f => ({ ...f, coach_name: coach.name, coach_style: coach.style }))}
              className={`w-full text-left rounded-xl p-4 border transition-all ${
                form.coach_name === coach.name
                  ? 'border-[#C1532B] bg-[#FDF2EE]'
                  : 'border-[#EEE0D0] bg-white'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-[#C1532B] flex items-center justify-center text-white font-bold text-base shrink-0">
                  {coach.name.charAt(0)}
                </div>
                <div>
                  <p className="font-medium text-[#3D2314]">{coach.name}</p>
                  <p className="text-xs text-[#A07860]">{coach.description}</p>
                </div>
              </div>
              <p className="text-sm text-[#A07860] italic pl-[52px]">"{coach.example}"</p>
            </button>
          ))}
        </div>
      )}

      {/* Étape 3 */}
      {step === 3 && (
        <div className="flex flex-col gap-5 flex-1">
          <div>
            <h2 className="text-xl font-semibold text-[#3D2314] mb-1">Ton profil de coureur</h2>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-[#3D2314]">
              Poids (kg) <span className="text-[#A07860] font-normal">· optionnel</span>
            </span>
            <input
              type="number"
              placeholder="70"
              value={form.weight_kg}
              onChange={e => setForm(f => ({ ...f, weight_kg: e.target.value }))}
              className="border border-[#EEE0D0] rounded-lg px-4 py-3 focus:outline-none focus:border-[#C1532B] bg-white"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-[#3D2314]">Âge</span>
            <input
              type="number"
              placeholder="35"
              value={form.age}
              onChange={e => setForm(f => ({ ...f, age: e.target.value }))}
              className="border border-[#EEE0D0] rounded-lg px-4 py-3 focus:outline-none focus:border-[#C1532B] bg-white"
            />
          </label>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-[#3D2314]">Niveau</span>
            <div className="flex gap-2">
              {([
                ['beginner', 'Débutant'],
                ['intermediate', 'Intermédiaire'],
                ['experienced', 'Confirmé'],
              ] as [RunnerLevel, string][]).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setForm(f => ({ ...f, runner_level: val }))}
                  className={`flex-1 py-2.5 text-sm rounded-lg border transition-colors ${
                    form.runner_level === val
                      ? 'border-[#C1532B] bg-[#FDF2EE] text-[#C1532B]'
                      : 'border-[#EEE0D0] text-[#A07860]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-[#3D2314]">Sorties habituelles / semaine</span>
            <div className="flex gap-2">
              {[1, 2, 3, '4+'].map(n => (
                <button
                  key={n}
                  onClick={() => setForm(f => ({ ...f, weekly_sessions: typeof n === 'string' ? 4 : n }))}
                  className={`flex-1 py-2.5 text-sm rounded-lg border transition-colors ${
                    form.weekly_sessions === (typeof n === 'string' ? 4 : n)
                      ? 'border-[#C1532B] bg-[#FDF2EE] text-[#C1532B]'
                      : 'border-[#EEE0D0] text-[#A07860]'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-[#3D2314]">
              Performance récente <span className="text-[#A07860] font-normal">· optionnel</span>
            </span>
            <input
              type="text"
              placeholder="Ex : 1h52 sur semi il y a 2 ans, ou 45min sur 10km"
              value={form.best_recent_time}
              onChange={e => setForm(f => ({ ...f, best_recent_time: e.target.value }))}
              className="border border-[#EEE0D0] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#C1532B] bg-white"
            />
          </label>
        </div>
      )}

      {/* Étape 4 */}
      {step === 4 && (
        <div className="flex flex-col gap-5 flex-1">
          <div>
            <h2 className="text-xl font-semibold text-[#3D2314] mb-1">Quand es-tu disponible pour courir ?</h2>
            <p className="text-[#A07860] text-sm">Sélectionne au moins 2 jours.</p>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {DAYS.map(day => (
              <button
                key={day}
                onClick={() => toggleDay(day)}
                className={`py-3 text-sm rounded-lg border capitalize transition-colors ${
                  form.availability.includes(day)
                    ? 'border-[#C1532B] bg-[#FDF2EE] text-[#C1532B]'
                    : 'border-[#EEE0D0] text-[#A07860]'
                }`}
              >
                {day.slice(0, 3)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Étape 5 */}
      {step === 5 && (
        <div className="flex flex-col gap-5 flex-1">
          <div>
            <h2 className="text-xl font-semibold text-[#3D2314] mb-1">Ton objectif et tes contraintes</h2>
          </div>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-[#3D2314]">Ton objectif</span>
            <input
              type="text"
              placeholder="Ex : finir sous 2h, terminer, 1h45"
              value={form.goal_time}
              onChange={e => setForm(f => ({ ...f, goal_time: e.target.value }))}
              className="border border-[#EEE0D0] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#C1532B] bg-white"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-[#3D2314]">
              Blessures ou douleurs chroniques <span className="text-[#A07860] font-normal">· optionnel</span>
            </span>
            <textarea
              placeholder="Ex : tendinite au genou gauche, douleur au mollet... ou laisse vide si tout va bien"
              value={form.injury_history}
              onChange={e => setForm(f => ({ ...f, injury_history: e.target.value }))}
              rows={3}
              className="border border-[#EEE0D0] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#C1532B] bg-white resize-none"
            />
          </label>
        </div>
      )}

      {error && <p className="text-[#D4845A] text-sm mt-4">{error}</p>}

      <div className="flex gap-3 mt-8 pb-4">
        {step > 1 && (
          <Button variant="secondary" onClick={() => setStep(s => s - 1)} className="flex-1">
            Retour
          </Button>
        )}
        {step < TOTAL_STEPS ? (
          <Button
            onClick={() => setStep(s => s + 1)}
            disabled={!canNext()}
            className="flex-1"
          >
            Suivant
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={!canNext()}
            className="flex-1"
          >
            Créer mon programme
          </Button>
        )}
      </div>
    </div>
  )
}
