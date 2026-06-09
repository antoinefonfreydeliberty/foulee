interface AvatarProps {
  initiale: string
  variant?: 'user' | 'coach'
  size?: 'sm' | 'md' | 'lg'
}

const sizes = {
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-12 h-12 text-lg',
}

export const Avatar = ({ initiale, variant = 'user', size = 'md' }: AvatarProps) => {
  const bg = variant === 'user' ? 'bg-[#E8A44A] text-[#3D2314]' : 'bg-[#C1532B] text-white'

  return (
    <div className={`${sizes[size]} ${bg} rounded-full flex items-center justify-center font-semibold flex-shrink-0`}>
      {initiale.toUpperCase()}
    </div>
  )
}
