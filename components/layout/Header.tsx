import { Avatar } from '@/components/ui/Avatar'

interface HeaderProps {
  firstName: string
}

export const Header = ({ firstName }: HeaderProps) => {
  return (
    <header className="flex items-center justify-between px-4 py-3 bg-[#FDF8F3] border-b border-[#EEE0D0]">
      <span className="font-serif text-xl text-[#C1532B] font-bold tracking-tight">Foulée</span>
      <div className="flex items-center gap-2">
        <span className="text-sm text-[#A07860]">{firstName}</span>
        <Avatar initiale={firstName[0]} variant="user" size="sm" />
      </div>
    </header>
  )
}
