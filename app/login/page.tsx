'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'

export const dynamic = 'force-dynamic'

function mapAuthError(message: string): string {
  if (message.includes('Invalid login credentials')) return 'Email ou mot de passe incorrect.'
  if (message.includes('Email not confirmed')) return 'Confirme ton adresse email avant de te connecter.'
  if (message.includes('Too many requests') || message.includes('rate limit')) return 'Trop de tentatives. Réessaie dans quelques minutes.'
  if (message.includes('Unable to validate') || message.includes('invalid')) return 'Adresse email invalide.'
  return 'Une erreur est survenue. Réessaie.'
}

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'password' | 'magic'>('password')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(mapAuthError(error.message))
      setLoading(false)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('user_id', user.id)
        .single()

      if (!profile?.onboarding_completed) {
        router.push('/onboarding')
      } else {
        router.push('/dashboard')
      }
    }
    setLoading(false)
  }

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
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
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="font-serif text-3xl text-[#C1532B] font-bold text-center mb-2">Foulée</h1>
        <p className="text-center text-[#A07860] text-sm mb-8">
          Ton coach IA pour Vannes-Auray 2026
        </p>

        {sent ? (
          <div className="bg-[#F5EDE4] rounded-xl p-6 text-center">
            <p className="text-2xl mb-2">✉️</p>
            <p className="text-[#3D2314] font-medium">Lien envoyé !</p>
            <p className="text-[#A07860] text-sm mt-1">
              Un lien de connexion a été envoyé à <strong>{email}</strong>.<br />Vérifie ta boîte mail.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-[#EEE0D0] p-6">
            <div className="flex gap-2 mb-5">
              <button
                onClick={() => setMode('password')}
                className={`flex-1 py-2 text-sm rounded-lg border transition-colors ${
                  mode === 'password'
                    ? 'border-[#C1532B] bg-[#FDF2EE] text-[#C1532B]'
                    : 'border-[#EEE0D0] text-[#A07860]'
                }`}
              >
                Mot de passe
              </button>
              <button
                onClick={() => setMode('magic')}
                className={`flex-1 py-2 text-sm rounded-lg border transition-colors ${
                  mode === 'magic'
                    ? 'border-[#C1532B] bg-[#FDF2EE] text-[#C1532B]'
                    : 'border-[#EEE0D0] text-[#A07860]'
                }`}
              >
                Magic link
              </button>
            </div>

            <form onSubmit={mode === 'password' ? handlePasswordLogin : handleMagicLink} className="flex flex-col gap-3">
              <input
                type="email"
                placeholder="ton@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full border border-[#EEE0D0] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#C1532B] bg-[#FDF8F3]"
              />
              {mode === 'password' && (
                <input
                  type="password"
                  placeholder="Mot de passe"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="w-full border border-[#EEE0D0] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#C1532B] bg-[#FDF8F3]"
                />
              )}
              {error && <p className="text-red-500 text-xs">{error}</p>}
              <Button type="submit" disabled={loading} className="w-full mt-1">
                {loading ? 'Chargement...' : mode === 'password' ? 'Se connecter' : 'Recevoir le lien'}
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
