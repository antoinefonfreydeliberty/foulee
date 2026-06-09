import { HTMLAttributes } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'coach'
}

export const Card = ({ variant = 'default', className = '', style, children, ...props }: CardProps) => {
  const base: React.CSSProperties = {
    background: '#FFFFFF',
    border: '1px solid #DDD7CE',
    borderRadius: 16,
    padding: '13px 15px',
  }
  const coach: React.CSSProperties = {
    background: '#FFFFFF',
    border: '1px solid rgba(197,64,44,0.33)',
    borderRadius: 16,
    padding: '12px 13px',
    boxShadow: '0 2px 12px rgba(197,64,44,0.10)',
  }

  return (
    <div
      className={className}
      style={{ ...(variant === 'coach' ? coach : base), ...style }}
      {...props}
    >
      {children}
    </div>
  )
}
