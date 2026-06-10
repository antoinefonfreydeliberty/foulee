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
  const stats    = report.stats ?? {}
  const initial  = coachName.charAt(0).toUpperCase()
  const distance = stats.distance && stats.distance > 0 ? `${Number(stats.distance).toFixed(1)} km` : '--'
  const sessions = stats.sessions && stats.sessions > 0 ? `${stats.sessions} sortie${stats.sessions > 1 ? 's' : ''}` : '--'
  const pace     = stats.avg_pace ?? '--'

  return (
    <div style={{ background: '#FFFFFF', border: '1px solid #DDD7CE', borderRadius: 14, overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', padding: '14px 15px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontWeight: 700, color: '#160E08', fontSize: 13, margin: 0 }}>
            Semaine {report.week_number}
          </p>
          <p style={{ fontSize: 11, color: '#6E5E55', marginTop: 2, marginBottom: 0 }}>
            {formatWeekRange(report.week_start)}
          </p>
          <div style={{ display: 'flex', gap: 8, marginTop: 5 }}>
            <span style={{ fontSize: 11, color: '#C5402C', fontWeight: 700 }}>{distance}</span>
            <span style={{ fontSize: 11, color: '#6E5E55' }}>·</span>
            <span style={{ fontSize: 11, color: '#6E5E55' }}>{sessions}</span>
            {stats.avg_pace && (
              <>
                <span style={{ fontSize: 11, color: '#6E5E55' }}>·</span>
                <span style={{ fontSize: 11, color: '#6E5E55' }}>{pace}/km</span>
              </>
            )}
          </div>
        </div>
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          background: open ? '#C5402C' : '#EDE8E1',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, transition: 'all 0.2s',
        }}>
          <svg width={12} height={12} viewBox="0 0 24 24" fill="none"
            stroke={open ? 'white' : '#6E5E55'} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
            style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
          >
            <path d="M6 9l6 6 6-6"/>
          </svg>
        </div>
      </button>

      {open && (
        <div style={{ padding: '0 15px 15px', borderTop: '1px solid #DDD7CE' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 0 10px' }}>
            <div style={{
              position: 'relative', flexShrink: 0,
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', background: '#C5402C',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontWeight: 800, fontSize: 11,
              }}>
                {initial}
              </div>
              <div style={{
                position: 'absolute', bottom: 0, right: 0,
                width: 8, height: 8, borderRadius: '50%',
                background: '#22C55E', border: '1.5px solid #FFFFFF',
              }} />
            </div>
            <span style={{ fontSize: 12, color: '#6E5E55', fontWeight: 600 }}>{coachName}</span>
          </div>
          <p style={{ fontSize: 13, color: '#160E08', lineHeight: 1.65, whiteSpace: 'pre-line', margin: 0 }}>
            {report.coach_analysis}
          </p>
        </div>
      )}
    </div>
  )
}
