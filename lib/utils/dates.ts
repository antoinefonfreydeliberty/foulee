const RACE_DATE = new Date('2026-09-13')
const PROGRAM_START_DATE = new Date(process.env.PROGRAM_START_DATE ?? '2026-06-09')

export const getDaysLeft = (): number => {
  const now = new Date()
  return Math.max(0, Math.ceil((RACE_DATE.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
}

export const getProgramWeek = (startDate?: string): number => {
  const start = startDate ? new Date(startDate) : PROGRAM_START_DATE
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  return Math.min(Math.max(Math.floor(diffDays / 7) + 1, 1), 14)
}

// Semaine de programme NON clampée (peut dépasser 14). getProgramWeek borne à 14
// pour l'affichage produit ; ici on garde la vraie valeur pour détecter la
// semaine finale (=== 14) et l'après-programme (> 14, garde-fou anti-envoi).
export const getRawProgramWeek = (startDate?: string): number => {
  const start = startDate ? new Date(startDate) : PROGRAM_START_DATE
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  return Math.max(Math.floor(diffDays / 7) + 1, 1)
}

export const getProgressPercent = (weekNumber: number): number => {
  return Math.round((weekNumber - 1) / 13 * 100)
}

export const getWeekStart = (date?: Date): string => {
  const d = date ? new Date(date) : new Date()
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return d.toISOString().split('T')[0]
}

export const getProgramWeekStart = (startDate: string, weekNumber: number): string => {
  const start = new Date(startDate)
  start.setDate(start.getDate() + (weekNumber - 1) * 7)
  return start.toISOString().split('T')[0]
}

export const getWeekEnd = (weekStart: string): string => {
  const d = new Date(weekStart)
  d.setDate(d.getDate() + 6)
  return d.toISOString().split('T')[0]
}

export const formatWeekRange = (weekStart: string): string => {
  const start = new Date(weekStart)
  const end = new Date(weekStart)
  end.setDate(end.getDate() + 6)
  const fmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' })
  return `${fmt.format(start)} - ${fmt.format(end)}`
}
