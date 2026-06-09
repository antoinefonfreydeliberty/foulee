import { Avatar } from '@/components/ui/Avatar'
import { Card } from '@/components/ui/Card'

interface CoachMessageProps {
  coachName: string
  content: string
  date?: string
}

export const CoachMessage = ({ coachName, content, date }: CoachMessageProps) => {
  return (
    <Card variant="coach" className="flex gap-3">
      <Avatar initiale={coachName[0]} variant="coach" size="md" />
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-[#3D2314] text-sm">{coachName}</span>
          {date && <span className="text-xs text-[#A07860]">{date}</span>}
        </div>
        <p className="text-[#3D2314] text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
      </div>
    </Card>
  )
}
