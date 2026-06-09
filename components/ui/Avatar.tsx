interface AvatarProps {
  initiale: string
  variant?: 'user' | 'coach'
  size?: 'sm' | 'md' | 'lg'
}

const sizes: Record<string, { wh: number; fs: number; fw: number }> = {
  sm:  { wh: 28, fs: 11, fw: 900 },
  md:  { wh: 36, fs: 14, fw: 900 },
  lg:  { wh: 40, fs: 15, fw: 900 },
}

export const Avatar = ({ initiale, variant = 'user', size = 'md' }: AvatarProps) => {
  const { wh, fs, fw } = sizes[size]
  const bg    = variant === 'user'  ? '#C5402C' : '#C5402C'
  const color = 'white'

  return (
    <div style={{
      width: wh, height: wh, borderRadius: '50%',
      background: bg, color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: fs, fontWeight: fw, flexShrink: 0,
    }}>
      {initiale.toUpperCase()}
    </div>
  )
}
