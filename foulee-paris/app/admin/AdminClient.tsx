'use client'

import { useState } from 'react'
import { LogoutButton } from '@/components/LogoutButton'
import { formatJetons } from '@/lib/money'
import { formatSecondsToGoal, parseGoalTimeToSeconds } from '@/lib/time'
import type { Runner } from '@/lib/types'

export type AdminBettor = {
  id: string
  first_name: string
  last_name: string | null
  email: string
  balance_cents: number
  is_admin: boolean
  created_at: string
}

const card: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 16,
  padding: 16,
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
}
const sectionTitle: React.CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontWeight: 600,
  fontSize: 16,
  color: 'var(--text)',
}
const inputStyle: React.CSSProperties = {
  background: 'var(--bg)',
  border: '1px solid var(--border)',
  borderRadius: 10,
  padding: '11px 13px',
  fontSize: 14,
  color: 'var(--text)',
  fontFamily: 'var(--font-body)',
  outline: 'none',
  width: '100%',
}
const goldBtn: React.CSSProperties = {
  background: 'var(--gold)',
  color: 'var(--bg)',
  fontWeight: 700,
  fontSize: 14,
  padding: '11px 16px',
  borderRadius: 12,
  border: 'none',
  fontFamily: 'var(--font-body)',
  cursor: 'pointer',
}

export function AdminClient({
  initialBettors,
  initialRunners,
}: {
  initialBettors: AdminBettor[]
  initialRunners: Runner[]
}) {
  const [bettors, setBettors] = useState(initialBettors)
  const [runners, setRunners] = useState(initialRunners)

  return (
    <main
      style={{
        minHeight: '100dvh',
        maxWidth: 520,
        margin: '0 auto',
        padding: '48px 18px 40px',
        display: 'flex',
        flexDirection: 'column',
        gap: 22,
      }}
    >
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22 }}>
          Admin · Semi Ca$h
        </div>
        <LogoutButton />
      </header>

      <CreateBettor
        onCreated={(b) => setBettors((prev) => [...prev, b])}
      />

      <BettorsList bettors={bettors} />

      <RunnersGoals runners={runners} onUpdate={(r) => setRunners((prev) => prev.map((x) => (x.id === r.id ? r : x)))} />

      <RecomputeOdds />

      <SettleMarkets runners={runners} />
    </main>
  )
}

type RecomputeSummary = {
  ok: boolean
  generated_at?: string | null
  marketsEnsured?: number
  selectionsEnsured?: number
  oddsWritten?: number
  snapshotsWritten?: number
  modeledRunners?: string[]
  skippedRunners?: string[]
  warnings?: string[]
  error?: string
}

function RecomputeOdds() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<RecomputeSummary | null>(null)

  async function run() {
    if (loading) return
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/admin/recompute-odds', { method: 'POST' })
      const data = (await res.json().catch(() => ({}))) as RecomputeSummary
      setResult(res.ok ? data : { ok: false, error: data?.error ?? 'Échec du recalcul.' })
    } catch {
      setResult({ ok: false, error: 'Erreur réseau.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <section style={card}>
      <div style={sectionTitle}>Cotes</div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
        Récupère les stats Foulée, calcule les cotes (Riegel → forme → Monte Carlo) et crée les
        marchés manquants. L&apos;historique des cotes est conservé (ajout seul).
      </div>
      <button style={goldBtn} onClick={run} disabled={loading}>
        {loading ? 'Recalcul en cours…' : 'Recalculer les cotes'}
      </button>
      {result && !result.ok && (
        <div style={{ color: 'var(--loss)', fontSize: 13 }}>{result.error}</div>
      )}
      {result && result.ok && (
        <div style={{ fontSize: 12, color: 'var(--text-body)', display: 'flex', flexDirection: 'column', gap: 3 }}>
          <div>
            <strong style={{ color: 'var(--gain)' }}>✓ Cotes recalculées.</strong> {result.oddsWritten} cotes ·{' '}
            {result.snapshotsWritten} snapshots
            {result.marketsEnsured ? ` · ${result.marketsEnsured} nouveaux marchés` : ''}.
          </div>
          {result.modeledRunners && (
            <div style={{ color: 'var(--text-muted)' }}>Coureurs modélisés : {result.modeledRunners.join(', ')}</div>
          )}
          {result.skippedRunners && result.skippedRunners.length > 0 && (
            <div style={{ color: 'var(--loss)' }}>Sans données : {result.skippedRunners.join(', ')}</div>
          )}
          {result.warnings && result.warnings.length > 0 && (
            <div style={{ color: 'var(--text-muted)' }}>{result.warnings.join(' · ')}</div>
          )}
        </div>
      )}
    </section>
  )
}

function CreateBettor({ onCreated }: { onCreated: (b: AdminBettor) => void }) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [pin, setPin] = useState<string | null>(null)
  const [createdName, setCreatedName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function submit() {
    if (loading) return
    setError(null)
    setPin(null)
    setLoading(true)
    try {
      const res = await fetch('/api/admin/bettors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, email }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error ?? 'Création impossible.')
        return
      }
      setPin(data.pin)
      setCreatedName(data.bettor.first_name)
      onCreated(data.bettor)
      setFirstName('')
      setLastName('')
      setEmail('')
    } catch {
      setError('Erreur réseau.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section style={card}>
      <div style={sectionTitle}>Créer un parieur</div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input style={inputStyle} placeholder="Prénom" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        <input style={inputStyle} placeholder="Nom (optionnel)" value={lastName} onChange={(e) => setLastName(e.target.value)} />
      </div>
      <input style={inputStyle} placeholder="email@exemple.com" value={email} onChange={(e) => setEmail(e.target.value)} />
      <button style={goldBtn} onClick={submit} disabled={loading}>
        {loading ? 'Création…' : 'Créer + générer le PIN'}
      </button>
      {error && <div style={{ color: 'var(--loss)', fontSize: 13 }}>{error}</div>}
      {pin && (
        <div
          style={{
            background: 'var(--gold)',
            color: 'var(--bg)',
            borderRadius: 12,
            padding: 14,
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 600 }}>
            PIN de {createdName} (à transmettre maintenant — affiché une seule fois) :
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 30, letterSpacing: 4 }}>
            {pin}
          </div>
        </div>
      )}
    </section>
  )
}

function BettorsList({ bettors }: { bettors: AdminBettor[] }) {
  return (
    <section style={card}>
      <div style={sectionTitle}>Parieurs ({bettors.length})</div>
      {bettors.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Aucun parieur.</div>}
      {bettors.map((b) => (
        <div
          key={b.id}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '8px 0',
            borderTop: '1px solid var(--border)',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
              {b.first_name}
              {b.is_admin && (
                <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--gold)', fontWeight: 700 }}>ADMIN</span>
              )}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{b.email}</div>
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--gold)' }}>
            {formatJetons(b.balance_cents)}
          </div>
        </div>
      ))}
    </section>
  )
}

function RunnersGoals({ runners, onUpdate }: { runners: Runner[]; onUpdate: (r: Runner) => void }) {
  return (
    <section style={card}>
      <div style={sectionTitle}>Objectifs des coureurs</div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
        Saisir le temps objectif (ex. « 1h45 », « 1:45:00 » ou en secondes). Sert au marché « battra son objectif ».
      </div>
      {runners.map((r) => (
        <RunnerGoalRow key={r.id} runner={r} onUpdate={onUpdate} />
      ))}
    </section>
  )
}

type SettleMarketResult = {
  key: string
  label: string
  alreadySettled?: boolean
  skipped?: boolean
  won?: number
  lost?: number
  payoutCents?: number
}

function SettleMarkets({ runners }: { runners: Runner[] }) {
  const [times, setTimes] = useState<Record<string, string>>({})
  const [dnf, setDnf] = useState<Record<string, boolean>>({})
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<{ totalPayoutCents: number; markets: SettleMarketResult[]; warnings: string[] } | null>(null)

  async function submit() {
    if (loading) return
    setError(null)
    // Construit les résultats par prénom.
    const results: Record<string, { seconds: number | null; dnf: boolean }> = {}
    for (const r of runners) {
      const isDnf = !!dnf[r.first_name]
      const secs = isDnf ? null : parseGoalTimeToSeconds(times[r.first_name] ?? '')
      if (!isDnf && secs == null) {
        setError(`Temps manquant ou invalide pour ${r.first_name} (ex. « 1:52:30 » ou coche DNF).`)
        return
      }
      results[r.first_name] = { seconds: secs, dnf: isDnf }
    }
    setLoading(true)
    try {
      const res = await fetch('/api/admin/settle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ results }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error ?? 'Règlement impossible.')
        return
      }
      setSummary({ totalPayoutCents: data.totalPayoutCents, markets: data.markets, warnings: data.warnings ?? [] })
      setConfirming(false)
    } catch {
      setError('Erreur réseau.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section style={card}>
      <div style={sectionTitle}>Règlement (résultats officiels)</div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
        Saisir le temps d&apos;arrivée réel de chaque coureur (ex. « 1:52:30 »). Le calcul des gagnants
        et les paiements sont <strong>idempotents</strong> (rejouable sans double crédit).
      </div>
      {runners.map((r) => (
        <div key={r.id} style={{ display: 'flex', gap: 8, alignItems: 'center', paddingTop: 8, borderTop: '1px solid var(--border)' }}>
          <div style={{ width: 70, fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{r.first_name}</div>
          <input
            style={{ ...inputStyle, flex: 1, opacity: dnf[r.first_name] ? 0.4 : 1 }}
            placeholder="1:52:30"
            value={times[r.first_name] ?? ''}
            disabled={!!dnf[r.first_name]}
            onChange={(e) => setTimes((t) => ({ ...t, [r.first_name]: e.target.value }))}
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-sub)', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={!!dnf[r.first_name]}
              onChange={(e) => setDnf((d) => ({ ...d, [r.first_name]: e.target.checked }))}
            />
            DNF
          </label>
        </div>
      ))}

      {error && <div style={{ color: 'var(--loss)', fontSize: 13 }}>{error}</div>}

      {!confirming ? (
        <button style={goldBtn} onClick={() => { setError(null); setSummary(null); setConfirming(true) }} disabled={loading}>
          Régler les paris…
        </button>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 12, color: 'var(--text-body)' }}>
            Confirmer le règlement ? Les gains seront crédités. (Rejouable sans double crédit.)
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={goldBtn} onClick={submit} disabled={loading}>
              {loading ? 'Règlement…' : 'Confirmer le règlement'}
            </button>
            <button
              style={{ ...goldBtn, background: 'var(--surface-2)', color: 'var(--text)' }}
              onClick={() => setConfirming(false)}
              disabled={loading}
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {summary && (
        <div style={{ fontSize: 12, color: 'var(--text-body)', display: 'flex', flexDirection: 'column', gap: 3 }}>
          <div>
            <strong style={{ color: 'var(--gain)' }}>✓ Règlement appliqué.</strong> Total payé :{' '}
            {formatJetons(summary.totalPayoutCents)}.
          </div>
          {summary.markets.map((m) => (
            <div key={m.key} style={{ color: 'var(--text-muted)' }}>
              {m.label} —{' '}
              {m.alreadySettled
                ? 'déjà réglé'
                : m.skipped
                  ? 'ignoré (données finales manquantes)'
                  : `${m.won ?? 0} gagnés / ${m.lost ?? 0} perdus`}
            </div>
          ))}
          {summary.warnings.map((w, i) => (
            <div key={i} style={{ color: 'var(--loss)' }}>{w}</div>
          ))}
        </div>
      )}
    </section>
  )
}

function RunnerGoalRow({ runner, onUpdate }: { runner: Runner; onUpdate: (r: Runner) => void }) {
  const [value, setValue] = useState('')
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  async function save() {
    const seconds = parseGoalTimeToSeconds(value)
    if (seconds == null) {
      setStatus('error')
      return
    }
    setStatus('saving')
    try {
      const res = await fetch('/api/admin/runners', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runnerId: runner.id, goalTimeSeconds: seconds }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setStatus('error')
        return
      }
      onUpdate(data.runner as Runner)
      setValue('')
      setStatus('saved')
    } catch {
      setStatus('error')
    }
  }

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', paddingTop: 8, borderTop: '1px solid var(--border)' }}>
      <div style={{ width: 90 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{runner.first_name}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          {formatSecondsToGoal(runner.goal_time_seconds)}
        </div>
      </div>
      <input
        style={{ ...inputStyle, flex: 1 }}
        placeholder="1h45"
        value={value}
        onChange={(e) => {
          setValue(e.target.value)
          setStatus('idle')
        }}
      />
      <button
        style={{ ...goldBtn, padding: '10px 14px' }}
        onClick={save}
        disabled={status === 'saving'}
      >
        {status === 'saving' ? '…' : status === 'saved' ? '✓' : 'OK'}
      </button>
    </div>
  )
}
