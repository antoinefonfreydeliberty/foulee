import { HTMLAttributes } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'coach'
}

export const Card = ({ variant = 'default', className = '', children, ...props }: CardProps) => {
  const base = 'rounded-xl p-4 sm:p-[18px]'
  const styles = {
    default: 'bg-white border border-[#EEE0D0]',
    coach: 'bg-[#F5EDE4] border border-[#EADDD0]',
  }

  return (
    <div className={`${base} ${styles[variant]} ${className}`} {...props}>
      {children}
    </div>
  )
}
