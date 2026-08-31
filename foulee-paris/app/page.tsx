'use client'

import { useEffect, useState } from 'react'
import { Disclaimer } from '@/components/Disclaimer'

// Départ de la course (Europe/Paris). Sert au compte à rebours de l'accueil.
const RACE_START = new Date('2026-09-13T09:30:00+02:00').getTime()

const RUNNERS = [
  { initials: 'AN', name: 'Antoine', color: 'var(--av-antoine)' },
  { initials: 'HU', name: 'Hugo', color: 'var(--av-hugo)' },
  { initials: 'RE', name: 'Rémi', color: 'var(--av-remi)' },
  { initials: 'AL', name: 'Alix', color: 'var(--av-alix)' },
]

function useCountdown(target: number) {
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    setNow(Date.now())
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  if (now == null) return null
  const diff = Math.max(0, target - now)
  const days = Math.floor(diff / 86_400_000)
  const hours = Math.floor((diff % 86_400_000) / 3_600_000)
  const mins = Math.floor((diff % 3_600_000) / 60_000)
  return { days, hours, mins }
}

export default function AccueilPage() {
  const cd = useCountdown(RACE_START)

  return (
    <main
      style={{
        minHeight: '100dvh',
        maxWidth: 460,
        margin: '0 auto',
        padding: '58px 20px 40px',
        display: 'flex',
        flexDirection: 'column',
        gap: 26,
      }}
    >
      {/* Logo */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: 30,
            letterSpacing: '-0.5px',
          }}
        >
          Semi Ca$h
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-sub)' }}>Paris fictifs entre potes</div>
      </div>

      {/* Compte à rebours */}
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 20,
          padding: '22px 16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 14,
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--text-sub)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            textAlign: 'center',
          }}
        >
          Semi-marathon le 13 septembre 2026
        </div>
        <div style={{ display: 'flex', gap: 14 }}>
          <CountUnit value={cd?.days} label="jours" gold />
          <CountUnit value={cd?.hours} label="heures" />
          <CountUnit value={cd?.mins} label="min" />
        </div>
      </div>

      {/* Pitch */}
      <p style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--text-body)', textAlign: 'center', margin: 0 }}>
        100 % fictif, 0 % enjeu réel. Chacun démarre avec 100 jetons pour parier sur les perfs
        des 4 potes le jour de la course. Juste pour le fun et la gloire.
      </p>

      {/* 4 parieurs */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            textAlign: 'center',
          }}
        >
          Les 4 parieurs
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
          {RUNNERS.map((r) => (
            <div key={r.name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: r.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                  fontSize: 14,
                  color: 'var(--bg)',
                }}
              >
                {r.initials}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-body)' }}>{r.name}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ flex: 1 }} />

      {/* CTA */}
      <a
        href="/login"
        style={{
          background: 'var(--gold)',
          color: 'var(--bg)',
          fontWeight: 700,
          fontSize: 15,
          textAlign: 'center',
          padding: 15,
          borderRadius: 14,
        }}
      >
        Se connecter
      </a>

      <Disclaimer />
    </main>
  )
}

function CountUnit({ value, label, gold }: { value?: number; label: string; gold?: boolean }) {
  const display = value == null ? '--' : value.toString().padStart(2, '0')
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: 34,
          color: gold ? 'var(--gold)' : 'var(--text)',
        }}
      >
        {display}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{label}</div>
    </div>
  )
}
