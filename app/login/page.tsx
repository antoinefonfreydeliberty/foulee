'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export const dynamic = 'force-dynamic'

const COOLDOWN_SECONDS = 30

function mapSendError(message: string): string {
  if (message.toLowerCase().includes('invalid')) return 'Adresse email invalide.'
  return 'Impossible d\'envoyer le code. Réessayez.'
}

function mapVerifyError(message: string): string {
  if (message.toLowerCase().includes('expired')) return 'Ce code a expiré. Demandez-en un nouveau.'
  if (message.toLowerCase().includes('invalid') || message.toLowerCase().includes('incorrect')) return 'Code invalide. Vérifiez et réessayez.'
  return 'Une erreur est survenue. Réessayez.'
}

const cardStyle: React.CSSProperties = {
  background: 'var(--surface-1)',
  borderRadius: 16,
  padding: '28px 24px',
  border: '1px solid var(--border)',
}

const labelTextStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--text-sub)',
}

const primaryBtnStyle = (disabled: boolean): React.CSSProperties => ({
  width: '100%',
  background: disabled ? 'var(--surface-2)' : 'var(--accent)',
  color: disabled ? 'var(--text-muted)' : 'white',
  borderRadius: 13,
  padding: '14px',
  fontSize: 14,
  fontWeight: 800,
  border: 'none',
  cursor: disabled ? 'not-allowed' : 'pointer',
  transition: 'all 0.15s',
  fontFamily: 'inherit',
})

const ghostBtnStyle = (muted: boolean): React.CSSProperties => ({
  background: 'none',
  border: 'none',
  color: muted ? 'var(--text-muted)' : 'var(--text-sub)',
  fontSize: 13,
  cursor: muted ? 'default' : 'pointer',
  padding: 0,
  fontFamily: 'inherit',
})

const emailInputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--surface-2)',
  border: '1px solid var(--border)',
  borderRadius: 99,
  padding: '12px 18px',
  fontSize: 14,
  color: 'var(--text)',
  outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
  transition: 'border-color 0.15s',
}

const codeInputBase: React.CSSProperties = {
  width: '100%',
  background: 'var(--surface-2)',
  border: '1px solid var(--border)',
  borderRadius: 12,
  padding: '16px 18px',
  fontSize: 32,
  fontWeight: 700,
  letterSpacing: '0.3em',
  color: 'var(--text)',
  outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
  textAlign: 'center',
  transition: 'border-color 0.15s, box-shadow 0.15s',
}

export default function LoginPage() {
  const supabase = createClient()
  const router = useRouter()

  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [cooldown, setCooldown] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  const startCooldown = () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setCooldown(COOLDOWN_SECONDS)
    intervalRef.current = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const sendOtp = async (): Promise<boolean> => {
    setLoading(true)
    setError('')
    const { error: sendError } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    })
    setLoading(false)
    if (sendError) {
      setError(mapSendError(sendError.message))
      return false
    }
    startCooldown()
    return true
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    const ok = await sendOtp()
    if (ok) setStep('otp')
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: 'email',
    })
    if (verifyError) {
      setError(mapVerifyError(verifyError.message))
      setLoading(false)
      return
    }
    router.push('/dashboard')
  }

  const handleResend = async () => {
    if (cooldown > 0) return
    setCode('')
    setError('')
    await sendOtp()
  }

  const handleChangeEmail = () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setStep('email')
    setEmail('')
    setCode('')
    setError('')
    setCooldown(0)
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px 16px',
      background: 'var(--bg)',
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>

        <h1 style={{
          textAlign: 'center',
          fontSize: 32,
          fontWeight: 800,
          color: 'var(--text)',
          letterSpacing: -1,
          margin: '0 0 8px',
          fontFamily: 'inherit',
        }}>
          Foulée
        </h1>
        <p style={{ textAlign: 'center', color: 'var(--text-sub)', fontSize: 14, margin: '0 0 24px' }}>
          Ton coach IA pour Vannes-Auray 2026
        </p>

        <div style={cardStyle}>
          {step === 'email' ? (
            <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <span style={labelTextStyle}>Adresse email</span>
                <input
                  type="email"
                  placeholder="ton@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  style={emailInputStyle}
                />
              </label>

              {error && (
                <p style={{ color: 'var(--accent)', fontSize: 12, margin: 0 }}>{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{ ...primaryBtnStyle(loading), marginTop: 4 }}
              >
                {loading ? 'Envoi en cours...' : 'Recevoir mon code'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerify} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <p style={{ color: 'var(--text-sub)', fontSize: 14, margin: 0, textAlign: 'center' }}>
                Un code a été envoyé à{' '}
                <strong style={{ color: 'var(--text)' }}>{email}</strong>
              </p>

              <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <span style={labelTextStyle}>Code de connexion</span>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={8}
                  placeholder="00000000"
                  value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                  autoFocus
                  style={codeInputBase}
                  onFocus={e => {
                    e.target.style.borderColor = 'var(--accent)'
                    e.target.style.boxShadow = '0 0 0 3px color-mix(in srgb, var(--accent) 20%, transparent)'
                  }}
                  onBlur={e => {
                    e.target.style.borderColor = 'var(--border)'
                    e.target.style.boxShadow = 'none'
                  }}
                />
              </label>

              {error && (
                <p style={{ color: 'var(--accent)', fontSize: 12, margin: 0 }}>{error}</p>
              )}

              <button
                type="submit"
                disabled={loading || code.length < 8}
                style={primaryBtnStyle(loading || code.length < 8)}
              >
                {loading ? 'Vérification...' : 'Se connecter'}
              </button>

              <p style={{ textAlign: 'center', margin: 0 }}>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={cooldown > 0}
                  style={ghostBtnStyle(cooldown > 0)}
                >
                  {cooldown > 0 ? `Renvoyer dans ${cooldown}s...` : 'Renvoyer le code'}
                </button>
              </p>

              <p style={{ textAlign: 'center', margin: 0 }}>
                <button
                  type="button"
                  onClick={handleChangeEmail}
                  style={ghostBtnStyle(false)}
                >
                  ← Changer d&apos;adresse email
                </button>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
