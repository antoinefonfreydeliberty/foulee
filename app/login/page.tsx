'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export const dynamic = 'force-dynamic'

function mapAuthError(message: string): string {
  if (message.includes('Invalid login credentials')) return 'Email ou mot de passe incorrect.'
  if (message.includes('Email not confirmed')) return 'Confirme ton adresse email avant de te connecter.'
  if (message.includes('Too many requests') || message.includes('rate limit')) return 'Trop de tentatives. Réessaie dans quelques minutes.'
  if (message.includes('Unable to validate') || message.includes('invalid')) return 'Adresse email invalide.'
  return 'Une erreur est survenue. Réessaie.'
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#EDE8E1',
  border: '1px solid #DDD7CE',
  borderRadius: 99,
  padding: '12px 18px',
  fontSize: 14,
  color: '#160E08',
  outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
  transition: 'border-color 0.15s',
}

export default function LoginPage() {
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_URL}/auth/callback` },
    })
    if (error) {
      setError(mapAuthError(error.message))
      setLoading(false)
      return
    }
    setSent(true)
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px 16px', background: '#F4F0EA',
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>

        {/* Logo */}
        <h1 style={{
          textAlign: 'center', fontSize: 32, fontWeight: 800, color: '#160E08',
          letterSpacing: -1, margin: '0 0 8px', fontFamily: 'inherit',
        }}>
          Foulée
        </h1>
        <p style={{ textAlign: 'center', color: '#6E5E55', fontSize: 14, margin: '0 0 24px' }}>
          Ton coach IA pour Vannes-Auray 2026
        </p>

        {sent ? (
          <div style={{
            background: '#FFFFFF', borderRadius: 16, padding: '28px 24px',
            border: '1px solid #DDD7CE', textAlign: 'center',
          }}>
            <p style={{ fontSize: 28, margin: '0 0 10px' }}>✉️</p>
            <p style={{ fontSize: 16, fontWeight: 800, color: '#160E08', margin: '0 0 8px' }}>Lien envoyé !</p>
            <p style={{ color: '#6E5E55', fontSize: 14, margin: 0, lineHeight: 1.6 }}>
              Un lien de connexion a été envoyé à{' '}
              <strong style={{ color: '#160E08' }}>{email}</strong>.<br />
              Vérifie ta boîte mail.
            </p>
          </div>
        ) : (
          <div style={{ background: '#FFFFFF', borderRadius: 16, padding: '24px', border: '1px solid #DDD7CE' }}>
            <form
              onSubmit={handleMagicLink}
              style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
            >
              <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#6E5E55' }}>Adresse email</span>
                <input
                  type="email"
                  placeholder="ton@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  style={inputStyle}
                />
              </label>

              {error && (
                <p style={{ color: '#C5402C', fontSize: 12, margin: 0 }}>{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  background: loading ? '#E3DDD5' : '#C5402C',
                  color: loading ? '#C5BCAF' : 'white',
                  borderRadius: 13, padding: '14px', fontSize: 14, fontWeight: 800,
                  border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: loading ? 'none' : '0 6px 20px rgba(197,64,44,0.10)',
                  transition: 'all 0.15s', fontFamily: 'inherit', marginTop: 4,
                }}
              >
                {loading ? 'Chargement…' : 'Recevoir le lien'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
