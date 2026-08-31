'use client'

import { useRef, useState } from 'react'
import { Disclaimer } from '@/components/Disclaimer'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', ''])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const inputs = useRef<Array<HTMLInputElement | null>>([])

  const pin = digits.join('')

  function setDigit(i: number, v: string) {
    const clean = v.replace(/\D/g, '').slice(-1)
    setDigits((prev) => {
      const next = [...prev]
      next[i] = clean
      return next
    })
    if (clean && i < 5) inputs.current[i + 1]?.focus()
  }

  function onKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[i] && i > 0) inputs.current[i - 1]?.focus()
  }

  function onPaste(e: React.ClipboardEvent) {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!text) return
    e.preventDefault()
    const next = ['', '', '', '', '', '']
    for (let i = 0; i < text.length; i++) next[i] = text[i]
    setDigits(next)
    inputs.current[Math.min(text.length, 5)]?.focus()
  }

  async function submit() {
    if (loading) return
    setError(null)
    if (!email.trim() || pin.length !== 6) {
      setError('Renseigne ton email et les 6 chiffres du PIN.')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, pin }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error ?? 'Connexion impossible.')
        setDigits(['', '', '', '', '', ''])
        inputs.current[0]?.focus()
        return
      }
      window.location.href = data.isAdmin ? '/admin' : '/paris'
    } catch {
      setError('Erreur réseau.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main
      style={{
        minHeight: '100dvh',
        maxWidth: 460,
        margin: '0 auto',
        padding: '58px 20px 40px',
        display: 'flex',
        flexDirection: 'column',
        gap: 26,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 24 }}>Semi Ca$h</div>
        <div style={{ fontSize: 13, color: 'var(--text-sub)' }}>Connexion</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-sub)' }}>Adresse email</label>
        <input
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="prenom@email.com"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: '14px 16px',
            fontSize: 15,
            color: 'var(--text)',
            fontFamily: 'var(--font-body)',
            outline: 'none',
          }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-sub)', textAlign: 'center' }}>
          Code PIN à 6 chiffres
        </div>
        <div style={{ display: 'flex', gap: 8 }} onPaste={onPaste}>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => {
                inputs.current[i] = el
              }}
              value={d}
              inputMode="numeric"
              autoComplete={i === 0 ? 'one-time-code' : 'off'}
              onChange={(e) => setDigit(i, e.target.value)}
              onKeyDown={(e) => onKeyDown(i, e)}
              style={{
                width: 42,
                height: 52,
                borderRadius: 10,
                background: 'var(--surface)',
                border: `1.5px solid ${d ? 'var(--gold)' : 'var(--border)'}`,
                textAlign: 'center',
                fontFamily: 'var(--font-display)',
                fontSize: 20,
                fontWeight: 700,
                color: 'var(--text)',
                outline: 'none',
              }}
            />
          ))}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
          PIN transmis par l&apos;organisateur.
        </div>
      </div>

      {error && (
        <div style={{ color: 'var(--loss)', fontSize: 13, textAlign: 'center' }}>{error}</div>
      )}

      <div style={{ flex: 1 }} />

      <button
        onClick={submit}
        disabled={loading}
        style={{
          background: 'var(--gold)',
          color: 'var(--bg)',
          fontWeight: 700,
          fontSize: 15,
          textAlign: 'center',
          padding: 15,
          borderRadius: 14,
          border: 'none',
          fontFamily: 'var(--font-body)',
          cursor: loading ? 'default' : 'pointer',
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? 'Connexion…' : 'Valider'}
      </button>

      <Disclaimer />
    </main>
  )
}
