'use client'

import { useState } from 'react'

const CATEGORY_ICONS: Record<string, string> = {
  Nutrition:    '🥗',
  Récupération: '😴',
  Mental:       '🧠',
  Technique:    '👟',
}

const CATEGORY_COLORS: Record<string, string> = {
  Nutrition:    '#F59E0B',
  Récupération: '#2A6B50',
  Mental:       '#6366F1',
  Technique:    '#C5402C',
}

const FILTERS = ['Tous', 'Récup', 'Nutrition', 'Mental', 'Technique']

const FILTER_MAP: Record<string, string> = {
  Récup: 'Récupération',
}

type Tip = { category: string; tip: string }

export default function ConseilsClient({
  tips,
  coachName,
  weekLabel,
}: {
  tips: Tip[]
  coachName: string
  weekLabel: string | null
}) {
  const [activeFilter, setActiveFilter] = useState('Tous')
  const initial = coachName.charAt(0).toUpperCase()

  const filteredTips = activeFilter === 'Tous'
    ? tips
    : tips.filter(t => t.category === (FILTER_MAP[activeFilter] ?? activeFilter))

  return (
    <>
      {/* Filtres */}
      <div style={{
        padding: '0 14px 12px',
        display: 'flex', gap: 5,
        overflowX: 'auto', scrollbarWidth: 'none',
      }}>
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            style={{
              padding: '5px 12px', borderRadius: 99, fontSize: 11, fontWeight: 600,
              flexShrink: 0, cursor: 'pointer',
              background: activeFilter === f ? '#C5402C' : '#EDE8E1',
              color:      activeFilter === f ? 'white'   : '#6E5E55',
              border:     `1px solid ${activeFilter === f ? '#C5402C' : '#DDD7CE'}`,
              transition: 'all 0.15s',
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Tip cards */}
      <div style={{ padding: '0 14px 20px', display: 'flex', flexDirection: 'column', gap: 9 }}>
        {filteredTips.map((tip, i) => {
          const cat   = tip.category
          const em    = CATEGORY_ICONS[cat]  ?? '💡'
          const color = CATEGORY_COLORS[cat] ?? '#C5402C'

          return (
            <div key={i} style={{
              background: '#FFFFFF', borderRadius: 16,
              padding: '14px 15px', border: '1px solid #DDD7CE',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 9 }}>
                <span style={{ fontSize: 16 }}>{em}</span>
                <span style={{
                  background: color + '22', color, fontSize: 10,
                  padding: '3px 8px', borderRadius: 99, fontWeight: 700,
                }}>
                  {cat}
                </span>
                <div style={{ marginLeft: 'auto', position: 'relative' }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: '50%', background: '#C5402C',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', fontSize: 9, fontWeight: 900,
                  }}>
                    {initial}
                  </div>
                </div>
              </div>
              <p style={{ color: '#160E08', fontSize: 13, fontWeight: 800, margin: '0 0 5px', lineHeight: 1.35 }}>
                {/* We use the tip text as both title and description since we have one text field */}
                {tip.tip.split('.')[0]}.
              </p>
              <p style={{ color: '#6E5E55', fontSize: 11, margin: 0, lineHeight: 1.5 }}>
                {tip.tip}
              </p>
            </div>
          )
        })}
        {filteredTips.length === 0 && (
          <p style={{ color: '#C5BCAF', fontSize: 13, textAlign: 'center', padding: '32px 0' }}>
            Aucun conseil dans cette catégorie.
          </p>
        )}
      </div>
    </>
  )
}
