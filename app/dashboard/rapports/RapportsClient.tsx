'use client'

import { useState } from 'react'
import { RapportItem } from './RapportItem'

// Stats recalculées en direct depuis training_logs (même forme que le cron).
export type LiveStats = { distance: number; sessions: number; avg_pace: string }

export type ReportView = {
  id: string
  week_number: number
  week_start: string
  coach_analysis: string
  stats: LiveStats
}

export type ChartWeek = {
  weekNumber: number
  weekStart: string
  label: string
  value: number
  current: boolean
}

type Props = {
  coachName: string
  reports: ReportView[]        // triés week_start desc (le plus récent en premier)
  hero: { totalDistance: number; totalSessions: number; weekCount: number }
  chartWeeks: ChartWeek[]      // uniquement les semaines ayant un rapport, 6 dernières
}

export function RapportsClient({ coachName, reports, hero, chartWeeks }: Props) {
  // État d'ouverture unique des cartes accordéon, partagé avec le graphique :
  // un clic sur une barre ouvre (et scrolle vers) la carte de la semaine.
  const [openWeeks, setOpenWeeks] = useState<Set<string>>(new Set())

  const toggle = (weekStart: string) => {
    setOpenWeeks(prev => {
      const next = new Set(prev)
      if (next.has(weekStart)) next.delete(weekStart)
      else next.add(weekStart)
      return next
    })
  }

  const openAndScroll = (weekStart: string) => {
    setOpenWeeks(prev => {
      const next = new Set(prev)
      next.add(weekStart)
      return next
    })
    // La carte existe toujours dans le DOM (seul son détail se déplie), on peut
    // scroller immédiatement ; rAF laisse le dépliage se peindre avant de centrer.
    requestAnimationFrame(() => {
      document.getElementById(`rapport-${weekStart}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
  }

  const chartMax = Math.max(...chartWeeks.map(w => w.value), 1)
  const totalSessions = hero.totalSessions

  return (
    <div style={{ background: '#F4F0EA', minHeight: '100%', paddingTop: 2 }}>

      {/* Header (boutons de période supprimés) */}
      <div style={{ padding: '2px 18px 12px' }}>
        <h1 style={{ color: '#160E08', fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: -0.8 }}>
          Rapports
        </h1>
      </div>

      {/* Hero : distance totale live (toutes les séances du programme) */}
      <div style={{ margin: '0 14px 10px', background: '#FFFFFF', borderRadius: 18, padding: 18, border: '1px solid #DDD7CE' }}>
        <p style={{ color: '#6E5E55', fontSize: 10, margin: '0 0 4px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
          Distance totale
        </p>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4 }}>
          <span style={{ color: '#160E08', fontSize: 48, fontWeight: 800, letterSpacing: -2, lineHeight: 1 }}>
            {hero.totalDistance > 0 ? hero.totalDistance.toFixed(1) : '--'}
          </span>
          {hero.totalDistance > 0 && (
            <span style={{ color: '#6E5E55', fontSize: 18, fontWeight: 600, marginBottom: 5 }}>km</span>
          )}
        </div>
        <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{
            background: 'rgba(42,107,80,0.10)', color: '#2A6B50',
            fontSize: 11, padding: '3px 9px', borderRadius: 99, fontWeight: 700,
          }}>
            {reports.length > 0
              ? `${hero.weekCount} semaine${hero.weekCount > 1 ? 's' : ''} de programme`
              : 'Programme en cours'}
          </span>
          {totalSessions > 0 && (
            <span style={{ color: '#6E5E55', fontSize: 11 }}>
              {totalSessions} sortie{totalSessions > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Graphique km/semaine : barres cliquables (ouvrent + scrollent la carte) */}
      {chartWeeks.length > 0 && (
        <div style={{ margin: '0 14px 10px', background: '#FFFFFF', borderRadius: 16, padding: '14px 16px', border: '1px solid #DDD7CE' }}>
          <p style={{ color: '#160E08', fontSize: 12, fontWeight: 700, margin: '0 0 14px' }}>
            Km / semaine · Programme 14 sem.
          </p>
          <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 90 }}>
            {chartWeeks.map(w => {
              const barH = w.value > 0 ? Math.max(Math.round((w.value / chartMax) * 70), 4) : 4
              return (
                <button
                  key={w.weekStart}
                  type="button"
                  onClick={() => openAndScroll(w.weekStart)}
                  aria-label={`Voir le bilan de la semaine ${w.weekNumber}`}
                  style={{
                    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                    background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  <span style={{ color: w.current ? '#C5402C' : '#C5BCAF', fontSize: 9, fontWeight: w.current ? 700 : 400 }}>
                    {w.value > 0 ? w.value.toFixed(0) : '·'}
                  </span>
                  <div style={{
                    width: '100%', height: barH,
                    background: w.current
                      ? 'linear-gradient(180deg, #C5402C, rgba(197,64,44,0.33))'
                      : '#EDE8E1',
                    borderRadius: '4px 4px 2px 2px',
                    border: `1px solid ${w.current ? 'rgba(197,64,44,0.33)' : '#DDD7CE'}`,
                  }} />
                  <span style={{ color: '#C5BCAF', fontSize: 9 }}>{w.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Liste des bilans hebdomadaires */}
      <div style={{ padding: '0 14px 20px' }}>
        <p style={{ color: '#160E08', fontSize: 12, fontWeight: 700, margin: '0 0 9px' }}>
          Bilans hebdomadaires
        </p>

        {reports.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#C5BCAF', fontSize: 14 }}>
            <p>Ton premier bilan arrivera dimanche soir.</p>
            <p style={{ fontSize: 12, marginTop: 6 }}>
              {coachName} t&apos;enverra un email chaque semaine.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {reports.map(report => (
              <RapportItem
                key={report.id}
                report={report}
                coachName={coachName}
                open={openWeeks.has(report.week_start)}
                onToggle={() => toggle(report.week_start)}
              />
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
