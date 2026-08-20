'use client'

import { useEffect, useRef } from 'react'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
  confirmLabel?: string
  cancelLabel?: string
  loading?: boolean
}

// Modal de confirmation réutilisable (design system Studio · Jour, variables CSS).
// Accessible : Echap = annuler, clic à l'extérieur = annuler, focus initial sur
// le bouton de confirmation, scroll du body verrouillé tant que la modal est ouverte.
export function ConfirmDialog({
  open,
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel = 'Supprimer',
  cancelLabel = 'Annuler',
  loading = false,
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onCancel()
    }
    document.addEventListener('keydown', onKeyDown)

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    confirmRef.current?.focus()

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = prevOverflow
    }
  }, [open, loading, onCancel])

  if (!open) return null

  return (
    <div
      role="presentation"
      onClick={() => { if (!loading) onCancel() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(22,14,8,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--surface-1)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          padding: '22px 20px 18px',
          width: '100%', maxWidth: 360,
          boxShadow: '0 20px 50px rgba(22,14,8,0.20)',
          fontFamily: 'inherit',
        }}
      >
        <h2
          id="confirm-dialog-title"
          style={{
            fontSize: 17, fontWeight: 800, color: 'var(--text)',
            margin: '0 0 8px', letterSpacing: -0.3,
          }}
        >
          {title}
        </h2>

        <p style={{ fontSize: 14, color: 'var(--text-sub)', lineHeight: 1.5, margin: '0 0 20px' }}>
          {message}
        </p>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            style={{
              flex: 1, padding: '12px', borderRadius: 12,
              background: 'var(--surface-2)', color: 'var(--text-sub)',
              border: '1px solid var(--border)',
              fontSize: 14, fontWeight: 700, fontFamily: 'inherit',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {cancelLabel}
          </button>

          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            disabled={loading}
            style={{
              flex: 1, padding: '12px', borderRadius: 12,
              background: 'var(--accent)', color: '#FFFFFF',
              border: '1px solid var(--accent)',
              fontSize: 14, fontWeight: 800, fontFamily: 'inherit',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              transition: 'all 0.15s',
            }}
          >
            {loading ? 'Suppression…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
