'use client'

import { useState } from 'react'
import { formatWeekRange } from '@/lib/utils/dates'

type Stats = {
  distance?: number
  sessions?: number
  avg_pace?: string
}

type Report = {
  id: string
  week_number: number
  week_start: string
  coach_analysis: string
  stats: Stats | null
  generated_at: string
}

type Props = {
  report: Report
  coachName: string
}

export const RapportItem = ({ report, coachName }: Props) => {
  const [open, setOpen] = useState(false)
  const stats = report.stats ?? {}

  return (
    <div style={{
      background: 'white',
      border: '0.5px solid #EEE0D0',
      borderRadius: 12,
      overflow: 'hidden',
    }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%',
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <div>
          <p style={{ fontWeight: 600, color: '#3D2314', fontSize: 14 }}>
            Semaine {report.week_number}
          </p>
          <p style={{ fontSize: 12, color: '#A07860', marginTop: 2 }}>
            {formatWeekRange(report.week_start)}
          </p>
          {(stats.distance || stats.sessions) && (
            <p style={{ fontSize: 12, color: '#A07860', marginTop: 4 }}>
              {stats.distance ? `${Number(stats.distance).toFixed(1)} km` : '--'}
              {stats.sessions ? ` · ${stats.sessions} sortie${stats.sessions > 1 ? 's' : ''}` : ''}
              {stats.avg_pace ? ` · ${stats.avg_pace}/km` : ''}
            </p>
          )}
        </div>
        <span style={{
          color: '#A07860',
          fontSize: 18,
          display: 'inline-block',
          transform: open ? 'rotate(180deg)' : 'none',
          transition: 'transform 0.2s',
          flexShrink: 0,
        }}>
          ↓
        </span>
      </button>

      {open && (
        <div style={{ padding: '0 16px 16px', borderTop: '0.5px solid #EEE0D0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 0 10px' }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              backgroundColor: '#C1532B',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontWeight: 700, fontSize: 12, flexShrink: 0,
            }}>
              {coachName.charAt(0)}
            </div>
            <span style={{ fontSize: 13, color: '#A07860' }}>{coachName}</span>
          </div>
          <p style={{
            fontSize: 14,
            color: '#3D2314',
            lineHeight: 1.65,
            whiteSpace: 'pre-line',
          }}>
            {report.coach_analysis}
          </p>
        </div>
      )}
    </div>
  )
}
