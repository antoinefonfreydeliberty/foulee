'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/Button'
import { calcPace } from '@/lib/utils/pace'

const FEELING_OPTIONS = [
  { value: 1, emoji: '😓', label: 'Épuisé' },
  { value: 2, emoji: '😕', label: 'Difficile' },
  { value: 3, emoji: '😐', label: 'Correct' },
  { value: 4, emoji: '😊', label: 'Bien' },
  { value: 5, emoji: '🔥', label: 'Super' },
]

type Props = {
  firstName: string
}

export default function LogForm({ firstName: _ }: Props) {
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
    <div className="px-4 py-6 max-w-lg mx-auto">
      <h1 className="text-xl font-semibold text-[#3D2314] mb-6">Saisir une sortie</h1>

      <div className="flex flex-col gap-5">

        {/* Date */}
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-[#3D2314]">Date de la sortie</span>
          <input
            type="date"
            value={form.date}
            max={today}
            onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
            className="border border-[#EEE0D0] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#C1532B] bg-white"
          />
        </label>

        {/* Distance */}
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-[#3D2314]">Distance (km)</span>
          <input
            type="number"
            min="0"
            step="0.1"
            placeholder="10.5"
            value={form.distanceKm}
            onChange={e => setForm(f => ({ ...f, distanceKm: e.target.value }))}
            className="border border-[#EEE0D0] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#C1532B] bg-white"
          />
        </label>

        {/* Durée */}
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-[#3D2314]">Durée</span>
          <div className="flex gap-2 items-center">
            <div className="flex-1 flex flex-col gap-1">
              <input
                type="number"
                min="0"
                max="999"
                placeholder="52"
                value={form.durationMinutes}
                onChange={e => setForm(f => ({ ...f, durationMinutes: e.target.value }))}
                className="border border-[#EEE0D0] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#C1532B] bg-white"
              />
              <span className="text-xs text-[#A07860] text-center">min</span>
            </div>
            <span className="text-[#A07860] pb-5">:</span>
            <div className="flex-1 flex flex-col gap-1">
              <input
                type="number"
                min="0"
                max="59"
                placeholder="30"
                value={form.durationSeconds}
                onChange={e => setForm(f => ({ ...f, durationSeconds: e.target.value }))}
                className="border border-[#EEE0D0] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#C1532B] bg-white"
              />
              <span className="text-xs text-[#A07860] text-center">sec</span>
            </div>
          </div>
        </div>

        {/* Allure calculée */}
        {pace && (
          <div style={{
            textAlign: 'center',
            padding: '12px',
            backgroundColor: '#F5EDE4',
            borderRadius: 8,
          }}>
            <p style={{ fontSize: 28, fontWeight: 700, color: '#C1532B' }}>{pace}</p>
            <p style={{ fontSize: 12, color: '#A07860' }}>par kilomètre</p>
          </div>
        )}

        {/* Ressenti */}
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-[#3D2314]">Ressenti</span>
          <div className="flex gap-2">
            {FEELING_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setForm(f => ({ ...f, feeling: f.feeling === opt.value ? null : opt.value }))}
                className={`flex-1 flex flex-col items-center py-2.5 gap-1 rounded-lg border transition-colors ${
                  form.feeling === opt.value
                    ? 'border-[#C1532B] bg-[#F5EDE4]'
                    : 'border-[#EEE0D0] bg-white'
                }`}
              >
                <span className="text-xl">{opt.emoji}</span>
                <span className="text-xs text-[#A07860]">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Douleur */}
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-[#3D2314]">
            Douleur ou gêne <span className="text-[#A07860] font-normal">· optionnel</span>
          </span>
          <input
            type="text"
            placeholder="Douleur, gêne, zone concernée... (optionnel)"
            value={form.painNotes}
            onChange={e => setForm(f => ({ ...f, painNotes: e.target.value }))}
            className="border border-[#EEE0D0] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#C1532B] bg-white"
          />
        </label>

        {/* Notes */}
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-[#3D2314]">
            Notes libres <span className="text-[#A07860] font-normal">· optionnel</span>
          </span>
          <textarea
            placeholder="Comment s'est passée cette sortie ? (optionnel)"
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            rows={3}
            className="border border-[#EEE0D0] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#C1532B] bg-white resize-none"
          />
        </label>

        {error && (
          <p className="text-sm" style={{ color: '#D4845A' }}>{error}</p>
        )}

        {success && (
          <div style={{
            backgroundColor: '#F5EDE4',
            border: '0.5px solid #EADDD0',
            borderRadius: 12,
            padding: '16px 18px',
            textAlign: 'center',
          }}>
            <p style={{ fontWeight: 600, color: '#3D2314', marginBottom: 4 }}>Sortie enregistrée !</p>
            <p style={{ fontSize: 13, color: '#A07860' }}>
              {pace ? `Allure : ${pace}/km · ` : ''}{dist.toFixed(1)} km
            </p>
          </div>
        )}

        <Button
          onClick={handleSubmit}
          disabled={!isValid || loading}
          className="w-full mt-2"
        >
          {loading ? 'Enregistrement...' : 'Enregistrer la sortie'}
        </Button>

      </div>
    </div>
  )
}
