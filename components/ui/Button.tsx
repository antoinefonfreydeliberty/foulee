'use client'

import { ButtonHTMLAttributes, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'active' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
}

const base: React.CSSProperties = {
  borderRadius: 13,
  fontWeight: 700,
  cursor: 'pointer',
  transition: 'all 0.15s',
  border: 'none',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
}

const variantStyles: Record<string, React.CSSProperties> = {
  primary:   { background: '#C5402C', color: '#FFFFFF', boxShadow: '0 6px 20px rgba(197,64,44,0.10)' },
  secondary: { background: '#FFFFFF', color: '#6E5E55', border: '1px solid #DDD7CE' },
  active:    { background: 'rgba(197,64,44,0.10)', color: '#C5402C', border: '1px solid #C5402C' },
  ghost:     { background: 'transparent', color: '#6E5E55' },
}

const sizeStyles: Record<string, React.CSSProperties> = {
  sm: { padding: '6px 12px', fontSize: 11 },
  md: { padding: '14px 24px', fontSize: 14 },
  lg: { padding: '16px 32px', fontSize: 15 },
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className = '', style, children, disabled, ...props }, ref) => {
    const disabledStyle: React.CSSProperties = disabled
      ? { opacity: 0.5, cursor: 'not-allowed' }
      : {}

    return (
      <button
        ref={ref}
        className={className}
        disabled={disabled}
        style={{ ...base, ...variantStyles[variant], ...sizeStyles[size], ...disabledStyle, ...style }}
        {...props}
      >
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
