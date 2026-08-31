// Conversion du temps objectif d'un coureur (saisi par l'admin) en secondes.
// Accepte : secondes brutes ("7200"), "h:mm:ss", "mm:ss", "1h45", "1h45min", "1h".

export function parseGoalTimeToSeconds(input: string): number | null {
  const t = input.trim().toLowerCase()
  if (!t) return null

  if (/^\d+$/.test(t)) return parseInt(t, 10) // secondes brutes

  const colon = t.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/)
  if (colon) {
    const h = +colon[1]
    const m = +colon[2]
    const s = colon[3] ? +colon[3] : 0
    if (m > 59 || s > 59) return null
    return h * 3600 + m * 60 + s
  }

  const hm = t.match(/^(\d{1,2})\s*h\s*(\d{1,2})?/) // "1h45", "1h45min", "1h"
  if (hm) {
    const h = +hm[1]
    const m = hm[2] ? +hm[2] : 0
    if (m > 59) return null
    return h * 3600 + m * 60
  }

  return null
}

export function formatSecondsToGoal(sec: number | null | undefined): string {
  if (sec == null) return '—'
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  if (h > 0) {
    return s > 0
      ? `${h}h${String(m).padStart(2, '0')}min${String(s).padStart(2, '0')}`
      : `${h}h${String(m).padStart(2, '0')}`
  }
  return s > 0 ? `${m}min${String(s).padStart(2, '0')}` : `${m}min`
}
