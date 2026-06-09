export const calcPace = (distanceKm: number, durationMinutes: number): string => {
  if (distanceKm <= 0) return '--\'--"'
  const paceDecimal = durationMinutes / distanceKm
  const minutes = Math.floor(paceDecimal)
  const seconds = Math.round((paceDecimal - minutes) * 60)
  return `${minutes}'${seconds.toString().padStart(2, '0')}"`
}
