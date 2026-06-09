'use client'

import { ButtonHTMLAttributes, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'active' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
}

const variants = {
  primary: 'bg-[#C1532B] text-[#FDF8F3] border-transparent hover:bg-[#a8472a]',
  secondary: 'border border-[#EEE0D0] bg-white text-[#A07860] hover:bg-[#F5EDE4]',
  active: 'border border-[#C1532B] bg-[#FDF2EE] text-[#C1532B]',
  ghost: 'bg-transparent text-[#A07860] hover:text-[#3D2314]',
}

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-6 py-3 text-sm',
  lg: 'px-8 py-4 text-base',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className = '', children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
