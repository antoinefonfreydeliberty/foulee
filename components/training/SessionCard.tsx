import type { TrainingSession } from '@/types'
import { Card } from '@/components/ui/Card'

const TYPE_COLORS: Record<string, string> = {
  endurance: 'bg-blue-100 text-blue-700',
  'fractionné': 'bg-orange-100 text-orange-700',
  'sortie longue': 'bg-green-100 text-green-700',
  récupération: 'bg-purple-100 text-purple-700',
  repos: 'bg-gray-100 text-gray-500',
}

interface SessionCardProps {
  session: TrainingSession
  checked?: boolean
  onToggle?: () => void
}

export const SessionCard = ({ session, checked, onToggle }: SessionCardProps) => {
  const colorClass = TYPE_COLORS[session.type] ?? 'bg-[#F5EDE4] text-[#A07860]'

  return (
    <Card className="flex items-start gap-3">
      {onToggle !== undefined && (
        <button
          onClick={onToggle}
          className={`mt-0.5 w-5 h-5 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
            checked ? 'bg-[#C1532B] border-[#C1532B] text-white' : 'border-[#EEE0D0]'
          }`}
        >
          {checked && <span className="text-xs">✓</span>}
        </button>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium capitalize text-[#A07860]">{session.day}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colorClass}`}>
            {session.type}
          </span>
        </div>
        <p className="font-medium text-[#3D2314] mt-0.5">{session.label}</p>
        <p className="text-sm text-[#A07860] mt-0.5">{session.description}</p>
        <p className="text-xs text-[#A07860] mt-1">
          {session.distance_km} km · {session.duration_minutes} min
        </p>
      </div>
    </Card>
  )
}
